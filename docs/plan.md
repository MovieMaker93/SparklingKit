# Fork plan and status

Plan for this fork of SparklingKit (personal use on one DGX Spark). It covers what is done, what is left,
and how to pick up. Feature details are in [`fork.md`](fork.md).

## Decisions

- **UI:** polish the existing dark graphite look; do not redesign it. Add Light and System themes.
- **LLM:** unchanged (Qwen3.6-35B-A3B NVFP4). The Qwen3.8-35B-A3B distill was rejected: it has no vision.
- **OCR:** PaddleOCR-VL-1.6 as an alternative backend. Unlimited-OCR stays the default until it is validated.
- **Image:** a switchable backend: Z-Image-Turbo (default) or Qwen-Image 2.1. Qwen-Image uses the Qwen
  Research License, which is fine for personal use.
- **Unchanged:** ASR (Qwen3-ASR-1.7B), translation (Hy-MT2-1.8B-FP8), grounding (LocateAnything-3B).

## Where things are

| What | Where |
|---|---|
| Branch | `polish-ui` on the fork, https://github.com/MovieMaker93/SparklingKit, PRs into the fork's `main` (#1 merged) |
| Windows checkout | `Desktop\sparkiljng\SparklingKit` (remotes: `origin` = stevibe upstream, `fork` = MovieMaker93) |
| Spark checkout | `~/code/SparklingKit` on `ssh spark` (gx10-4246), branch `main`. It holds uncommitted copies of the 2026-10-05 fixes: run `git checkout -- . && git pull` once they are merged |
| Benchmarks | `~/sk-bench` on the Spark: OCR, ASR, image and load scripts plus their results (see "Spark validation") |
| `gh` (logged in as MovieMaker93) | on the Spark: `~/.local/share/codex-tools/gh-2.96.0/gh_2.96.0_linux_arm64/bin/gh` |
| Always-on LLM on the Spark | container `qwen38-flash-next-tf` (TensorFold, `:8888`, `restart=no`), about 85 GB in use |

Rules:
- Commit as `-c user.name=MovieMaker93 -c user.email=fortunato.alfonso93@gmail.com`, with no Claude trailer.
- Push or touch PRs only with an explicit OK.
- Never stop the LLM container without asking.

## Done

The UI was checked in both themes at 1440 and 375 px; all code paths have unit tests. The model paths
were validated on the Spark on 2026-10-05 (see "Spark validation").

| Commit | Change |
|---|---|
| `a7b2f39` | Theme tokens (`--sk-*`), Light/Dark/System switch, Vite proxy fix (`/api/`), dev seed script |
| `ac9d796` | Mint accent for primary actions, focus, active nav, progress |
| `f790f76` | Sidebar: services chip with popover, collapsible Spark monitor |
| `456b401` | Workbench: Running now strip, readable titles, filter pills |
| `11ed224` | Thumbnails endpoint, Gallery page with filters, lightbox and compare |
| `08cfd27` | Job viewers: transcript timeline, image zoom/compare, document outline, run history |
| `db9bf9f` | OCR profiles + PaddleOCR-VL adapter; image backend switch (Qwen-Image 2.1), capabilities, seed/steps |
| `067cca8` | `scripts/spark-switch.sh`, `docs/fork.md` |
| `81ce148`, `a976eaa` | This plan and `CLAUDE.md` |
| `5609057` | Qwen-Image float8 loading: torchao 0.16 and per-component quant configs |
| `beb30d8` | Per-model attention backend: SDPA for Qwen-Image (flash-attn 2 rejects its attention mask) |
| `cd1bfce` | Global undici dispatcher, so model calls are not cut off at 300 s |

## Spark validation (2026-10-05)

GPU window with Flash Next stopped. The stack ran with `--ocr-backend paddleocr-vl --image-backend
qwen-image-2.1`. Scripts and raw results are in `~/sk-bench` on the Spark.

- **PaddleOCR-VL-1.6 works on aarch64.**
  - `paddlepaddle==3.2.2` installs, and PP-DocLayoutV3 runs on CPU.
  - The adapter's `blocks` and `layout.json` carry labels and boxes.
  - Benchmark: a generated 20-page PDF with known content (headings, prose, lists, tables; pages 15–20
    in two columns), scored by `score.py`:
    - word recall 99.9%, in reading order, including the two-column pages
    - headings 20/20
    - all 480 numeric table cells correct
  - Failure mode: in 2 of 20 tables, two adjacent row labels that read like one name ("Coastal" /
    "Islands") merged into one cell, which shifted the labels below them.
  - Speed: about 6 s per page through the app.
- **Qwen-Image 2.1 works after two fixes** (`5609057`, `beb30d8`).
  - float8 weight-only loads in 17.8 GB.
  - Time at 40 steps: about 80 s at 1024², 286 s at 2048² on an idle GPU, and 661 s while other jobs ran.
  - Quality at 2048² is excellent, with clean lettering. At 1024² a prompt with little text (a 3-item
    menu) got padded with made-up lines.
  - The official sizes are all about 4 MP (2048², 2528×1696, 2752×1536, …).
- **Memory:**
  - startup peak 95.8 GiB
  - all seven services idle: 84–86 GiB
  - one job per module (the app runs 2 at a time): 93.5 GiB peak
- **ASR: Parakeet (parakeet.cpp, `tdt-0.6b-v3` f16, CUDA build for sm_121) against Qwen3-ASR-1.7B.**

  Same clips: LibriSpeech dummy validation (73 clips, 8 min, English) and FLEURS `it_it` dev (60 clips,
  16 min, Italian).

  | | WER en | WER it | Speed | Memory |
  |---|---|---|---|---|
  | Qwen3-ASR-1.7B (vLLM) | 3.7% | 4.4% | 7–14× realtime | ~12.6 GiB |
  | Parakeet v3 (parakeet.cpp) | 3.6% | 3.9% | 134–248× realtime | 1.5 GiB |

  With `timestamp_granularities[]=word`, `parakeet-server` returns per-word times and confidence.
  Limits: it covers 25 European languages (Qwen3-ASR covers 52), and it serves one request at a time,
  WAV only.
- **Bug: model calls cut off at 300 s.** Node's fetch (undici) gives up after 300 s without response
  headers, before the app's own 10–30 min timeouts. A 2048² image and a long translation chunk both
  failed at exactly 300 s. Fixed in `cd1bfce`; the same 2048² job then finished in 661 s.
- **Bug: the LLM crashes on long generations.**
  - vLLM 0.24 with Qwen3.6-35B-A3B NVFP4 failed with `CUDA error: an illegal memory access` 6,143 tokens
    into a mind map. The crash was in FlashInfer metadata, with MTP draft slots set to `[-1, -1, -1]` and
    `--async-scheduling` on.
  - Docker then restarted it with the rest of the stack resident. Loading peaks at about 60 GB: 42 GB on
    the GPU plus a 16 GB fastsafetensors staging buffer. That did not fit, so it was OOM-killed in a loop
    (25 restarts), and the OOM killer also hit host processes (litellm, hermes, dbus, pipewire), which
    their supervisors restarted.
  - The LLM container was then removed. The Qwen3.6, Z-Image and Unlimited-OCR weights were deleted to
    free disk; `start-dgx-spark.sh` downloads them again.
- **State at the end:** SparklingKit runs without its LLM (chat and mind maps are offline), and Flash
  Next is stopped.

## Model evaluation (2026-10-09)

Both ran on the idle Spark, next to the app (scripts in `~/sk-bench`: `llmbench.py`, `longprefill.py`,
`imagebench.sh`).

- **LLM: Underdog Saluki 27B** (`ConwayResearch/Underdog-Saluki-27B-1.0` @ `1336c0b5`, Apache-2.0).
  - What it is: a 2-bit GGUF of Qwen3.8-27B (7.9 GB) plus a vision add-on (`mmproj` F16, 0.9 GB).
  - Setup: run in your `~/llama.cpp` `llama-server` (CUDA 13) with `--jinja -ngl 99 -fa on -c 65536
    --parallel 1`, on :8331.
  - Memory: 13.0 GiB on the GPU, about half of Qwen3.6. It loads in 5 s by mapping the file, so there is
    no loading peak.
  - Speed:
    - decode 22–23 tok/s
    - prefill about 740 tok/s at 1.8k–6k tokens, and 703 tok/s at 25k tokens (36 s)
  - Function:
    - **Vision:** read the heading and all 4 table numbers of benchmark page 1.
    - **Reasoning:** correct, with a short reasoning trace.
    - **Mind map:** a JSON-mode prompt outside the app came back malformed once, but the app's mind map
      (1,500 words of input) succeeded on its first call, with 31 nodes, in about 4 min. Thinking is on by
      default; turning it off for mind maps would cut that time.
- **Image: Qwen-Image-2.1-Turbo** (`d65dbc9a`, Qwen Research License).
  - What it is: the same model distilled to 8 steps.
  - It needs diffusers 0.41.0 (now a release pin) and transformers 5.19.
  - Memory: float8 at 17.1 GiB on the GPU, with SDPA attention.
  - Speed: 18 s at 1024² and 65 s at 2048², about 4.4× faster than the base model's 80 s and 286 s.
  - Quality: on the same 4 prompts with seed 42 it matches the base model. Small text is slightly worse
    at 1024² ("Capruccino"). At 2048² the requested text is right, and like the base model it adds
    invented lines to a sparse menu.

## Left to do

1. **Bring Flash Next back:** `./scripts/spark-switch.sh llm --yes`, then check `:8888`.
2. **Saluki as the LLM backend** (it would also retire the vLLM crash below).
   - Add `--llm-backend qwen36|saluki` with a llama.cpp CUDA service. There is no ARM64 CUDA image, so it
     needs a build for sm_121, as for Parakeet.
   - Download the pinned files, and turn thinking off for mind maps (`chat_template_kwargs`).
3. **LLM crash (if Qwen3.6 stays).**
   - Reproduce with one long generation (`min_tokens` about 8000) on the stock config, then without
     `--async-scheduling`.
   - Load the LLM before the other services on every restart, not only at first start. Replace
     `restart: unless-stopped` with a bounded restart, or a script that frees memory first, so a crash
     cannot become an OOM loop.
4. **Parakeet as the ASR backend.**
   - Add an adapter service: parakeet.cpp built with `-DPARAKEET_GGML_CUDA=ON
     -DCMAKE_CUDA_ARCHITECTURES=121` (v0.5.0 has no ARM64 CUDA release).
   - Add an ASR profile that requests `verbose_json` with word timestamps, for word-accurate subtitles.
   - It frees about 11 GiB, which also gives an LLM restart room.
5. **Image default:** make `qwen-image-2.1-turbo` the default image backend, and consider defaulting it
   to 2048² for prompts with text. If so, delete the base Qwen-Image 2.1 weights (31 GB).
6. **Not run (weights deleted):** Z-Image against Qwen-Image on the same seed, and Unlimited-OCR against
   PaddleOCR-VL on the benchmark PDF.
7. **Load test script:** `load.sh` stops polling on an empty-array check under `set -u`.
   Use `declare -A finished=()`.

## Backlog (from the first review, not started)

- Security:
  - Drop `app.use(cors())`.
  - Redact API keys in `GET /api/settings`.
  - Add a Host/Origin allowlist and an optional token.
- Correctness:
  - Add a per-job lock in `updateJob` (store.ts); concurrent runs can lose writes or cross progress.
- Speed: send OCR pages and ASR chunks with bounded concurrency. The servers run `--max-num-seqs 2`, but
  the processor sends one request at a time.
- Subtitles: Qwen3-ForcedAligner-0.6B for word timestamps. Cues are about 60 s chunks today.
- Long documents:
  - Chat and mind maps put the whole document in the prompt (LLM max 65k), so give them a token budget,
    then retrieval.
  - Add full-text search.
- Image editing with Qwen-Image 2.1 (masks, multi-reference, grounding → edit).

## Development notes

- Windows dev:
  - `docker run -d --name sk-redis -p 6379:6379 redis:8-alpine`
  - `node scripts/seed-dev-data.mjs`
  - `npm run dev`
- Set `WORKER_ENABLED=false` to keep the seeded running and queued jobs as they are.
- Without `pdftoppm` (not installed on Windows), PDF thumbnails fall back to icons. They work in Docker.
- On Windows, `src/server/dgx-update.test.ts` fails 8 tests (GNU tar reads `C:` as a host). It passes on
  Linux/CI.
- In this OneDrive checkout, `git status` can list unchanged files as modified. Trust `git diff`. The
  repo uses `core.autocrlf=false`, `core.trustctime=false` and `core.checkStat=minimal`.
- Python adapter tests run without a GPU:

  ```
  docker run --rm -v <service dir>:/app -w /app python:3.12-slim sh -c "pip install fastapi uvicorn python-multipart && python -m unittest"
  ```
