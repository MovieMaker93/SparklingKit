# YuE2 Music Generation Bake-off Plan

**Goal:** Decide, with measurements from one DGX Spark, whether YuE2 is worth adding as SparklingKit's music
generation model: whether it fits next to the stack, how fast it is on GB10, and whether the songs are usable.
Nothing is integrated yet; a `text-to-music` module gets its own plan only if the gates below pass.

**Kit:** `scripts/bench/yue2/` (`run.sh`, `bench.py`, a pinned Dockerfile). Results go to
`data/bench/yue2/<timestamp>/` and, once reviewed, to `docs/validation.md`.

## Global Constraints

- YuE2 `yue2-infer` 0.1.6, tag `yue2-v0.1.6`, commit `9c6c4b349be978b06a9d0d958471a07a6cdeff4d`, installed with
  `--no-deps` on the image-generation service's base,
  `nvcr.io/nvidia/pytorch:25.11-py3@sha256:4a85d8cf6fb3a943280960b8948cf4e9b6eca77b4414c68c9b2c7bb863f79b70`,
  whose torch 2.10 (CUDA 13, sm_121) is the version YuE2 pins. Its other pins are kept exactly:
  `transformers==4.57.6`, `huggingface-hub==0.36.2`, `safetensors==0.7.0`, `tiktoken==0.12.0`,
  `numpy==2.2.6`, `soundfile==0.13.1`, `accelerate==1.13.0`.
- Weights `m-a-p/YuE2-3B` and `m-a-p/YuE2-Vae` (the listening decoder), each pinned to the commit the run
  resolves or to `YUE2_REVISION` / `YUE2_VAE_REVISION`; the revisions are recorded in `results.json` and
  become the pins of any later integration.
- PyTorch backend with CUDA graphs (YuE2's default), BF16, no FP8, no vLLM `fast` extra, YuE2's own
  `memory_budget_gib` at its default of 24.
- License: code Apache 2.0; weights CC BY-NC 4.0 with an additional creator permission (individuals may use
  and monetize their outputs; companies need a commercial license). The kit downloads only after
  `--accept-model-license`.
- AGENTS.md shared-GPU rules: the kit stops nothing, refuses to start while a container is still loading or
  with less than 30 GiB available, and caps its container at 26 GiB like the image service.

## The model

YuE2 (M-A-P, released 2026-09-10) writes full songs, vocals and accompaniment, from lyrics with section tags
and a style prompt. A 3B AR–NAR Mixture-of-Transformers first plans a chord-annotated ABC score (`cot=full`),
or only the melody (`melody`), or nothing (`off`); it then generates semantic codec tokens, turns them into
acoustic latents by flow matching (32 midpoint steps), and a VAE decodes 48 kHz stereo. A supplied ABC score
replaces the planning step, which is how its covers and edits work. Outputs are `audio.flac`, `score.abc`,
the plan, tokens, latents and a `result.json` with timings, which map naturally onto SparklingKit artifacts
with lineage.

Its own WildSongBench comparison (192 prompts, automatic metrics, published by the authors) puts YuE2 at a
SongBench average of 6.73 and best-of-8 at 6.96, against 6.94 for Mureka 9 and 6.87 for Suno v5; the authors
call the gaps descriptive, not significant. Its lyric phoneme error rate is 8.4%; the same comparison gives
ACE-Step 1.5 7.5%. Officially supported languages are Chinese and English.

## Memory: what to expect

| Source | Peak |
| --- | --- |
| Model card, RTX 4090, `cot=full`, mean of 32 warm requests | 11.18 GiB GPU |
| Model card, H800, one song | 10.34 GiB GPU |
| Model card, maximum-context test | 14.08 GiB GPU |
| Model card header, unexplained and contradicted by the rows above | 78.66 GiB |
| README | "NVIDIA GPU with BF16 support and 24 GB VRAM" |

What the code says about the Spark:

- `YuE2Pipeline` caps its own CUDA allocations with `torch.cuda.set_per_process_memory_fraction` at
  `memory_budget_gib − 2` (22 GiB by default). On GB10 the device reports all unified memory as its total,
  so the cap still means 22 GiB, not a share of a GPU.
- Before VAE decoding it moves the transformer to CPU memory. On unified memory that frees nothing; the total
  footprint is CUDA allocations plus process RAM, which is why the kit measures host `MemAvailable`.
- FP8 (`quantization="fp8"`) keeps the original BF16 weights in CPU memory for exact restore, so on the
  Spark it would cost more memory, not less — the same lesson as the Qwen-Image int8 encoder in
  `docs/validation.md`.
- The optional vLLM path sizes `gpu_memory_utilization` from the same budget; the bench leaves it off.

Expected cost, from the figures above plus 2–4 GiB of process RAM: **about 13–18 GiB while generating**,
less than the image service's 19 GiB, and close to nothing when unloaded. Against the four-service stack of
PR #6 (about 29 GiB idle, 38 GiB busy), with Saluki (13–21.5 GiB) and the app's two concurrent jobs:

| Situation | Estimate |
| --- | --- |
| Stack, Saluki and YuE2 loaded | about 60–68 GiB of 121 |
| Worst pair of jobs: a song and a FastH3 video (+32–35 GiB) | about 104 GiB of 121 |

It fits, but not with YuE2 and a video model both resident at all times: a service would load YuE2 on demand
and unload it after an idle period, as the FastH3 plan already requires of ComfyUI.

## Speed: what to expect

The model card measured 71 s for a 215 s song on an RTX 4090. The autoregressive stage is bound by memory
bandwidth, 273 GB/s on GB10 against 1008 GB/s on the 4090, so a 3–4-minute song should take **about 3–5
minutes** on the Spark: slower than real time is acceptable for a queued job.

## Decision gates

1. **Builds:** the image builds on the Spark from the pinned base, and YuE2's pipeline, transformer and VAE
   modules import. (`pip check` output is recorded, not enforced: it flags YuE2's exact torch pin against
   the NGC build by design.)
2. **Memory:** the whole-job host peak stays **≤ 20 GiB above the resident stack**.
3. **Speed:** a warm full song generates in **≤ 2× its own length**, and a cold start (construction with
   hash checks plus model load) takes **≤ 60 s**.
4. **Unload:** after `close()`, the process holds **≤ 1 GiB** above the pre-run baseline.
5. **Listening:** the English songs are usable. Italian is recorded for information only.

`bench.py summarize` prints gates 2–4; gates 1 and 5 are the run itself and your ears.

## The bench cases

All seed 42, original lyrics written for this bench:

| Case | Lyrics | Plan | Why |
| --- | --- | --- | --- |
| `en-short` | verse and chorus, synth pop | full | First and smallest: includes the cold load |
| `en-full-1`, `en-full-2` | full ballad: verses, three choruses, bridge, outro | full | Warm speed and its variance; the speed gate takes the faster |
| `en-full-off` | the same ballad | off | What planning costs in time and memory |
| `it-pop` | Italian pop, two verses and choruses | full | Language check outside the official two |

## How to run it

On the Spark, from the repository root, with the stack in its normal state:

```bash
git fetch origin claude/sparklingkit-repo-eku0ri && git checkout claude/sparklingkit-repo-eku0ri
./scripts/bench/yue2/run.sh --accept-model-license            # all cases, roughly 30–60 min the first time
./scripts/bench/yue2/run.sh --accept-model-license en-short   # a quick first check
```

The script prints what is running, builds `sparklingkit/yue2-bench:0.1.6`, resolves and downloads the two
weight repositories into `data/dgx-models/m-a-p/`, records 10 s of host memory as the baseline, runs the
cases in `sparklingkit-yue2-bench` (no network, 26 GiB cap), then prints the summary and gates. Each case's
song, score and YuE2 result files stay in the run directory.

## Results

To fill in from `results.json` and `summary.json`, then move to `docs/validation.md`:

| Measurement | Result |
| --- | --- |
| Image build and imports on GB10 | |
| Cold start (construction + model load) | |
| `en-short`: song length, time, host peak above stack | |
| `en-full-1` / `en-full-2`: song length, time, ×RT, host peak | |
| `en-full-off`: time and peak against `en-full-*` | |
| `it-pop`: time, peak, does it sing Italian | |
| Residual after unload | |
| Listening notes | |

## Next steps

- **Gates pass:** a design and plan for a `text-to-music` module: a `generated-audio` artifact kind and a
  `music-generation` endpoint kind in `src/shared/contracts.ts` and `module-router.ts`, an adapter in
  `services/dgx-models/music-generation/` that loads YuE2 on the first request and unloads after an idle
  timeout, an opt-in `--music-backend yue2` in `scripts/start-dgx-spark.sh` (off by default), a player on the
  job page, and LLM-written lyrics and Parakeet lyric checks as workflow steps.
- **Memory or aarch64 fails:** the same bake-off for ACE-Step 1.5, which its authors say runs in under 4 GB
  under a permissive license, at lower quality in YuE2's comparison.

## Sources

- YuE2 code, docs and release `yue2-v0.1.6`: https://github.com/multimodal-art-projection/YuE
  (`README.md`, `docs/generation.md`, `docs/benchmarks.md`, `src/yue2/pipeline.py`,
  `src/yue2/quantization.py`, `src/yue2/fast.py`)
- Model card with the VRAM and timing table: https://huggingface.co/m-a-p/YuE2-3B
- Listening decoder: https://huggingface.co/m-a-p/YuE2-Vae
- Release coverage: https://gigazine.net/gsc_news/en/20260911-yue2-music-generation-ai/ and
  https://thakicloud.com/tech-blog/en/owm/yue2-open-source-music-generation/
- ACE-Step 1.5: https://ace-step.github.io/ace-step-v1.5.github.io/
