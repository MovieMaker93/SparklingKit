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
| Branch | `polish-ui` on the fork, https://github.com/MovieMaker93/SparklingKit, PR #1 into the fork's `main` |
| Windows checkout | `Desktop\sparkiljng\SparklingKit` (remotes: `origin` = stevibe upstream, `fork` = MovieMaker93) |
| Spark checkout | `~/code/SparklingKit` on `ssh spark` (gx10-4246), branch `polish-ui` |
| `gh` (logged in as MovieMaker93) | on the Spark: `~/.local/share/codex-tools/gh-2.96.0/gh_2.96.0_linux_arm64/bin/gh` |
| Always-on LLM on the Spark | container `qwen38-flash-next-tf` (TensorFold, `:8888`, `restart=no`), about 85 GB in use |

Rules:
- Commit as `-c user.name=MovieMaker93 -c user.email=fortunato.alfonso93@gmail.com`, with no Claude trailer.
- Push or touch PRs only with an explicit OK.
- Never stop the LLM container without asking.

## Done

The UI was checked in both themes at 1440 and 375 px; all code paths have unit tests, except the model
paths listed under "Left to do".

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

## Left to do

This needs a GPU window on the Spark (Flash Next stopped). Allow about 1–2 hours.

1. **Prepare.**
   - On the Spark: `cd ~/code/SparklingKit && git pull`.
   - Confirm Flash Next is idle and that it is fine to stop it.
2. **Deploy.**
   - Run `./scripts/spark-switch.sh sparklingkit --ocr-backend paddleocr-vl --image-backend qwen-image-2.1 --accept-model-licenses`.
   - SparklingKit has never been installed on this Spark, so all the models download. That is about
     70 GB, of which Qwen-Image 2.1 is 33 GB and PaddleOCR-VL 1.9 GB. 238 GB is free.
3. **PaddleOCR-VL spike.**
   - `paddleocr-vl` must reach `/health` on `:8332`.
   - Check that `pip install paddlepaddle==3.2.2` worked on aarch64.
   - Check that `PaddleOCRVL(... device="cpu")` loads PP-DocLayout. It downloads into
     `data/dgx-runtime/paddleocr-vl` on first start.
   - Check that `result.json` / `result.markdown` have the keys `paddle_server.result_to_payload`
     expects (`res.parsing_res_list[].block_label/block_bbox/block_content`, `markdown_texts`). Adjust
     the adapter and its unit test if not.
   - Fallback: `--ocr-backend unlimited-ocr`.
4. **Qwen-Image 2.1 spike.**
   - `curl :8336/health` should report `quantization: float8wo`.
   - If torchao rejects `quant_type="float8wo"` or fails on sm_121, try the name the installed torchao
     expects, or run with `IMAGE_QUANTIZE=none IMAGE_MEM_LIMIT=44g`.
   - Time one 1024² image and one 2048² image, both at 40 steps.
5. **Memory budget.** With all services up and one job per module running, peak use must stay under
   about 112 GiB (watch sparkDash or `:8330/v1/status`). Tune the `*_GPU_MEMORY_UTILIZATION` and
   `IMAGE_MEM_LIMIT` values in `compose.dgx.yaml` if needed.
6. **Functional checks.**
   - In Settings → Services, set the OCR model to `PaddleOCR-VL-1.6`.
   - OCR a 20-page PDF with tables on both OCR backends and compare the Markdown.
   - Generate the same prompt with seed 42 on Z-Image, then on Qwen-Image. To switch the image backend,
     re-run step 2 with the other `--image-backend`. Compare the two in Gallery → Compare.
7. **Switch back.** Run `./scripts/spark-switch.sh llm`, then confirm Flash Next answers on `:8888`.
8. **Record results.**
   - Update the Status section in `fork.md`, plus defaults and limits in the compose/adapters.
   - Commit, and push with OK.

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
