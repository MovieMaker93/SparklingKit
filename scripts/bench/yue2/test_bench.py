import json
import tempfile
import unittest
from pathlib import Path

import bench

KIB_PER_GIB = 2**20


def sample(epoch, available_gib):
    return (float(epoch), available_gib * KIB_PER_GIB)


def results(**overrides):
    value = {
        "construct_seconds": 8.0,
        "load_timing": {"mot_load_seconds": 12.0},
        "cases": [
            {"id": "en-short", "started_at": 20, "finished_at": 30, "wall_seconds": 10.0,
             "audio_seconds": 60.0, "realtime_ratio": 10 / 60},
            {"id": "en-full-1", "started_at": 30, "finished_at": 40, "wall_seconds": 400.0,
             "audio_seconds": 200.0, "realtime_ratio": 2.0},
            {"id": "en-full-2", "started_at": 40, "finished_at": 50, "wall_seconds": 300.0,
             "audio_seconds": 200.0, "realtime_ratio": 1.5},
        ],
        "unloaded_at": 60,
        "finished_at": 70,
    }
    value.update(overrides)
    return value


# 90 GiB free before the run, 85 during en-short, 75 at the worst moment of en-full-1, 89.5 after unloading.
SAMPLES = ([sample(t, 90) for t in range(0, 11)] + [sample(t, 85) for t in range(11, 31)]
           + [sample(t, 75 if t == 35 else 80) for t in range(31, 51)] + [sample(t, 88) for t in range(51, 60)]
           + [sample(t, 89.5) for t in range(60, 71)])


class BuildRequestTest(unittest.TestCase):
    def test_passes_only_song_request_fields(self):
        request = bench.build_request(bench.CASES[0])
        self.assertEqual(set(request), {"id", "style", "lyrics", "cot", "seed"})
        self.assertEqual(request["seed"], 42)

    def test_case_ids_are_unique_and_filename_safe(self):
        ids = [case["id"] for case in bench.CASES]
        self.assertEqual(len(ids), len(set(ids)))
        for case_id in ids:
            self.assertRegex(case_id, r"^[A-Za-z0-9][A-Za-z0-9_.-]*$")

    def test_every_case_has_lyrics_and_a_supported_plan_mode(self):
        for case in bench.CASES:
            self.assertIn(case["cot"], {"full", "melody", "off"})
            self.assertTrue(case["lyrics"].startswith("[Verse]"))

    def test_warm_full_song_ids_exist(self):
        ids = {case["id"] for case in bench.CASES}
        self.assertTrue(set(bench.WARM_FULL_SONG_IDS) <= ids)


class SummarizeTest(unittest.TestCase):
    def test_measures_peak_and_residual_against_the_pre_run_baseline(self):
        summary = bench.summarize(results(), SAMPLES, baseline_until=10)
        self.assertAlmostEqual(summary["baseline_available_gib"], 90)
        self.assertAlmostEqual(summary["gates"]["peak_above_baseline_gib"]["value"], 15)
        self.assertAlmostEqual(summary["gates"]["unload_residual_gib"]["value"], 0.5)

    def test_reports_each_case_peak_within_its_own_window(self):
        cases = {case["id"]: case for case in bench.summarize(results(), SAMPLES, baseline_until=10)["cases"]}
        self.assertAlmostEqual(cases["en-short"]["host_peak_above_baseline_gib"], 5)
        self.assertAlmostEqual(cases["en-full-1"]["host_peak_above_baseline_gib"], 15)

    def test_cold_start_adds_construction_and_model_load(self):
        summary = bench.summarize(results(), SAMPLES, baseline_until=10)
        self.assertEqual(summary["gates"]["cold_start_seconds"]["value"], 20)

    def test_warm_ratio_takes_the_faster_full_song(self):
        summary = bench.summarize(results(), SAMPLES, baseline_until=10)
        self.assertEqual(summary["gates"]["warm_full_song_realtime_ratio"]["value"], 1.5)
        self.assertTrue(summary["all_measured_gates_pass"])

    def test_failed_cases_do_not_count_as_warm_and_gates_can_fail(self):
        failed = results()
        for case in failed["cases"][1:]:
            case["error"] = "OutOfMemoryError: CUDA out of memory"
        summary = bench.summarize(failed, [sample(t, 90 if t <= 10 else 60) for t in range(0, 71)],
                                  baseline_until=10)
        self.assertIsNone(summary["gates"]["warm_full_song_realtime_ratio"]["value"])
        self.assertIn("warm_full_song_realtime_ratio", summary["unmeasured_gates"])
        self.assertFalse(summary["gates"]["peak_above_baseline_gib"]["pass"])
        self.assertFalse(summary["all_measured_gates_pass"])

    def test_without_samples_nothing_memory_related_is_claimed(self):
        summary = bench.summarize(results(), [], baseline_until=10)
        self.assertIsNone(summary["baseline_available_gib"])
        self.assertIsNone(summary["gates"]["peak_above_baseline_gib"]["pass"])
        self.assertIsNone(summary["gates"]["unload_residual_gib"]["pass"])


class CommandLineTest(unittest.TestCase):
    def test_summarize_reads_the_run_directory_and_writes_summary_json(self):
        with tempfile.TemporaryDirectory() as directory:
            out = Path(directory)
            (out / "results.json").write_text(json.dumps(results()), encoding="utf-8")
            rows = ["epoch,mem_available_kib"] + [f"{epoch},{kib}" for epoch, kib in SAMPLES]
            (out / "host-memory.csv").write_text("\n".join(rows) + "\n", encoding="utf-8")
            self.assertEqual(bench.main(["summarize", "--out", directory, "--baseline-until", "10"]), 0)
            summary = json.loads((out / "summary.json").read_text(encoding="utf-8"))
            self.assertAlmostEqual(summary["gates"]["peak_above_baseline_gib"]["value"], 15)

    def test_summarize_without_results_fails_clearly(self):
        with tempfile.TemporaryDirectory() as directory:
            self.assertEqual(bench.main(["summarize", "--out", directory, "--baseline-until", "0"]), 1)


if __name__ == "__main__":
    unittest.main()
