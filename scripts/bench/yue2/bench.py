"""Measure YuE2 on a DGX Spark for the music-generation bake-off.

`run` executes inside the bench image and generates the fixed songs below. `summarize` runs on the host and
joins the run's results with the host memory samples that run.sh records, because on unified memory only the
host's MemAvailable shows the whole cost: CUDA allocations, process RAM and the CUDA context together.
Only `run` imports torch and yue2, so the tests and `summarize` need the standard library alone.

Plan and decision gates: docs/superpowers/plans/2026-10-10-yue2-music-bakeoff.md
"""
from __future__ import annotations

import argparse
import csv
import gc
import json
import os
import resource
import statistics
import sys
import time
from pathlib import Path

GIB = 2**30
KIB_PER_GIB = 2**20
SEED = 42

# Limits from the plan. Peak and residual are host memory above the resident stack; the realtime ratio is
# generation time over song length for a warm full song.
GATES = {
    "peak_above_baseline_gib": 20.0,
    "warm_full_song_realtime_ratio": 2.0,
    "cold_start_seconds": 60.0,
    "unload_residual_gib": 1.0,
}

EN_SHORT = """[Verse]
Paper boats along the curb
Carry every word unheard
Streetlights hum a quiet tune
Waiting on the afternoon

[Chorus]
Turn it up and let it ring
Every echo learns to sing
Hold the moment, hold it near
Summer's only passing here"""

EN_FULL_CHORUS = """[Chorus]
Come home, the window's open wide
There's room for you on this side
Whatever storm you carry through
The door was always meant for you"""

EN_FULL = f"""[Verse]
I left the porch light burning low
For every road you didn't know
The kettle sings an empty song
The house remembers you were gone

{EN_FULL_CHORUS}

[Verse]
The garden grew the way you said
With tangled roses in the bed
I read your letters in the rain
And fold them up and start again

{EN_FULL_CHORUS}

[Bridge]
If the night gets long and the map runs out
Follow the hum of the old guitar
Every mile is a reason now
To find out where you are

{EN_FULL_CHORUS}

[Outro]
The door was always meant for you"""

IT_CHORUS = """[Chorus]
E canta, canta questa notte
Come un treno che non torna
Tieni stretta la mia mano
Finché arriva un'altra aurora"""

IT_POP = f"""[Verse]
Sotto il cielo di settembre
Cammino piano verso il mare
Le finestre accese a sera
Hanno storie da raccontare

{IT_CHORUS}

[Verse]
Le parole che non dico
Le nasconde il vento caldo
Ma domani, amico mio
Le ritroviamo in un abbraccio

{IT_CHORUS}"""

EN_FULL_STYLE = ("English, heartfelt pop rock ballad, warm female voice, acoustic and electric guitars, piano, "
                 "steady drums, soaring chorus, 76 BPM")

# The full English song runs twice so the warm figure is not the first long generation after start-up.
# Italian is outside YuE2's stated languages (Chinese and English); it is measured for information only.
CASES = [
    {"id": "en-short", "language": "en", "cot": "full", "lyrics": EN_SHORT,
     "style": "English, bright synth pop, clear male voice, punchy drums, warm bass, catchy hook, 112 BPM"},
    {"id": "en-full-1", "language": "en", "cot": "full", "lyrics": EN_FULL, "style": EN_FULL_STYLE},
    {"id": "en-full-2", "language": "en", "cot": "full", "lyrics": EN_FULL, "style": EN_FULL_STYLE},
    {"id": "en-full-off", "language": "en", "cot": "off", "lyrics": EN_FULL, "style": EN_FULL_STYLE},
    {"id": "it-pop", "language": "it", "cot": "full", "lyrics": IT_POP,
     "style": ("Italian, Mediterranean pop, warm male voice, acoustic guitar, mandolin, light percussion, "
               "sunny melody, 100 BPM")},
]
WARM_FULL_SONG_IDS = ("en-full-1", "en-full-2")


def build_request(case: dict, seed: int = SEED) -> dict:
    """The YuE2Pipeline call arguments for one case: its SongRequest fields, nothing else."""
    return {"id": case["id"], "style": case["style"], "lyrics": case["lyrics"], "cot": case["cot"], "seed": seed}


def write_json(path: Path, value: dict) -> None:
    # Written after every case, so a run that is killed part-way still leaves its finished cases.
    temporary = path.with_name(path.name + ".tmp")
    temporary.write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    os.replace(temporary, path)


def rss_peak_gib() -> float:
    # ru_maxrss is in KiB on Linux and covers the whole process lifetime.
    return resource.getrusage(resource.RUSAGE_SELF).ru_maxrss / KIB_PER_GIB


def run(args: argparse.Namespace) -> int:
    import torch
    import yue2
    from yue2 import YuE2Pipeline

    out = Path(args.out)
    results_path = out / "results.json"
    pip_check = Path("/bench/pip-check.txt")
    device = torch.cuda.get_device_properties(0)
    results = {
        "bench_version": 1,
        "started_at": time.time(),
        "environment": {
            "torch": torch.__version__,
            "cuda": torch.version.cuda,
            "yue2": getattr(yue2, "__version__", None),
            "device": device.name,
            "compute_capability": [device.major, device.minor],
            "device_total_gib": device.total_memory / GIB,
            "pip_check": pip_check.read_text(encoding="utf-8").strip() if pip_check.exists() else None,
        },
        "model": {"path": args.model, "revision": args.model_revision,
                  "vae": args.vae, "vae_revision": args.vae_revision},
        "memory_budget_gib": args.budget_gib,
        "cases": [],
    }
    write_json(results_path, results)

    start = time.perf_counter()
    pipe = YuE2Pipeline.from_pretrained(args.model, vae=args.vae, local_files_only=True, device="cuda",
                                        memory_budget_gib=args.budget_gib)
    results["construct_seconds"] = time.perf_counter() - start
    write_json(results_path, results)

    failures = 0
    for case in CASES:
        if args.only and case["id"] not in args.only:
            continue
        torch.cuda.reset_peak_memory_stats()
        record = {"id": case["id"], "language": case["language"], "cot": case["cot"], "started_at": time.time()}
        began = time.perf_counter()
        try:
            song = pipe(**build_request(case))
            song.save_artifacts(out / case["id"])
            record["wall_seconds"] = time.perf_counter() - began
            record["audio_seconds"] = len(song.audio) / song.sample_rate
            record["realtime_ratio"] = record["wall_seconds"] / record["audio_seconds"]
            record["truncated"] = song.truncated
            record["timing"] = song.timing
        except Exception as error:  # noqa: BLE001 - one failed song (often an OOM) must not lose the rest
            failures += 1
            record["wall_seconds"] = time.perf_counter() - began
            record["error"] = f"{type(error).__name__}: {error}"
            torch.cuda.empty_cache()
        record["finished_at"] = time.time()
        record["cuda_peak_allocated_gib"] = torch.cuda.max_memory_allocated() / GIB
        record["cuda_peak_reserved_gib"] = torch.cuda.max_memory_reserved() / GIB
        record["rss_peak_gib"] = rss_peak_gib()
        results["cases"].append(record)
        write_json(results_path, results)
        print(json.dumps({key: record.get(key) for key in ("id", "wall_seconds", "audio_seconds", "error")}),
              flush=True)

    results["load_timing"] = dict(pipe.load_timing)
    pipe.close()
    del pipe
    gc.collect()
    torch.cuda.empty_cache()
    # Keep the process, and with it the CUDA context, alive while the host sampler records what an
    # unloaded service would still hold.
    time.sleep(5)
    results["unloaded_at"] = time.time()
    results["cuda_reserved_after_unload_gib"] = torch.cuda.memory_reserved() / GIB
    write_json(results_path, results)
    time.sleep(args.settle_seconds)
    results["finished_at"] = time.time()
    write_json(results_path, results)
    return 1 if failures else 0


def read_samples(path: Path) -> list[tuple[float, float]]:
    """run.sh's host samples as (epoch seconds, MemAvailable in KiB)."""
    with path.open(newline="", encoding="utf-8") as stream:
        return [(float(row["epoch"]), float(row["mem_available_kib"])) for row in csv.DictReader(stream)
                if row.get("epoch") and row.get("mem_available_kib")]


def _available(samples, start=None, end=None):
    return [kib for epoch, kib in samples
            if (start is None or epoch >= start) and (end is None or epoch <= end)]


def summarize(results: dict, samples: list[tuple[float, float]], baseline_until: float,
              settle_seconds: float = 10.0) -> dict:
    """Join one run with host memory samples and check it against the plan's gates."""
    before = _available(samples, end=baseline_until)
    baseline = statistics.median(before) if before else None

    def above_baseline(start, end):
        window = _available(samples, start, end)
        if baseline is None or not window:
            return None
        return (baseline - min(window)) / KIB_PER_GIB

    finished = results.get("finished_at") or (samples[-1][0] if samples else None)
    cases = []
    for case in results.get("cases", []):
        cases.append({key: case.get(key) for key in
                      ("id", "cot", "language", "wall_seconds", "audio_seconds", "realtime_ratio",
                       "cuda_peak_reserved_gib", "rss_peak_gib", "error")}
                     | {"host_peak_above_baseline_gib": above_baseline(case.get("started_at"),
                                                                       case.get("finished_at"))})

    residual = None
    unloaded_at = results.get("unloaded_at")
    if unloaded_at is not None and baseline is not None:
        settled = _available(samples, unloaded_at, unloaded_at + settle_seconds)
        if settled:
            residual = (baseline - statistics.median(settled)) / KIB_PER_GIB

    load = results.get("load_timing", {})
    cold_start = None
    if results.get("construct_seconds") is not None and load.get("mot_load_seconds") is not None:
        cold_start = results["construct_seconds"] + load["mot_load_seconds"]

    warm = [case["realtime_ratio"] for case in results.get("cases", [])
            if case.get("id") in WARM_FULL_SONG_IDS and not case.get("error") and case.get("realtime_ratio")]

    values = {
        "peak_above_baseline_gib": above_baseline(baseline_until, finished),
        "warm_full_song_realtime_ratio": min(warm) if warm else None,
        "cold_start_seconds": cold_start,
        "unload_residual_gib": residual,
    }
    gates = {name: {"value": value, "limit": GATES[name], "pass": None if value is None else value <= GATES[name]}
             for name, value in values.items()}
    return {"baseline_available_gib": None if baseline is None else baseline / KIB_PER_GIB,
            "cases": cases, "gates": gates,
            "all_measured_gates_pass": all(gate["pass"] for gate in gates.values() if gate["pass"] is not None),
            "unmeasured_gates": [name for name, gate in gates.items() if gate["pass"] is None]}


def _number(value, digits=1):
    return "—" if value is None else f"{value:.{digits}f}"


def print_summary(summary: dict) -> None:
    print(f"\nHost memory available before the run: {_number(summary['baseline_available_gib'])} GiB")
    print(f"\n{'Case':<12} {'Song s':>7} {'Took s':>7} {'×RT':>5} {'Peak GiB':>9}  Note")
    for case in summary["cases"]:
        print(f"{case['id']:<12} {_number(case['audio_seconds'], 0):>7} {_number(case['wall_seconds'], 0):>7} "
              f"{_number(case['realtime_ratio'], 2):>5} {_number(case['host_peak_above_baseline_gib']):>9}  "
              f"{case['error'] or ''}")
    print("\nGates (peak is host memory above the resident stack):")
    for name, gate in summary["gates"].items():
        verdict = {True: "pass", False: "FAIL", None: "not measured"}[gate["pass"]]
        print(f"  {name:<32} {_number(gate['value'], 2):>8} ≤ {gate['limit']:<6} {verdict}")


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    commands = parser.add_subparsers(dest="command", required=True)
    run_parser = commands.add_parser("run", help="generate the bench songs (inside the bench image)")
    run_parser.add_argument("--model", required=True)
    run_parser.add_argument("--vae", required=True)
    run_parser.add_argument("--out", required=True)
    run_parser.add_argument("--model-revision")
    run_parser.add_argument("--vae-revision")
    run_parser.add_argument("--budget-gib", type=float, default=24.0)
    run_parser.add_argument("--settle-seconds", type=float, default=10.0)
    run_parser.add_argument("--only", nargs="*", choices=[case["id"] for case in CASES],
                            help="case ids to run (default: all)")
    summary_parser = commands.add_parser("summarize", help="join results with host samples (on the host)")
    summary_parser.add_argument("--out", required=True)
    summary_parser.add_argument("--baseline-until", type=float, required=True)
    summary_parser.add_argument("--settle-seconds", type=float, default=10.0)
    args = parser.parse_args(argv)

    if args.command == "run":
        return run(args)
    out = Path(args.out)
    results_path = out / "results.json"
    if not results_path.exists():
        print(f"No results in {out}; the run did not start.", file=sys.stderr)
        return 1
    summary = summarize(json.loads(results_path.read_text(encoding="utf-8")),
                        read_samples(out / "host-memory.csv"), args.baseline_until, args.settle_seconds)
    write_json(out / "summary.json", summary)
    print_summary(summary)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
