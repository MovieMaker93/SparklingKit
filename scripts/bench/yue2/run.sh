#!/usr/bin/env bash
# Measures YuE2 (music generation) on a DGX Spark next to whatever is already running: whole-job memory
# above the resident stack, speed, cold start and unload. A one-off kit for the bake-off in
# docs/superpowers/plans/2026-10-10-yue2-music-bakeoff.md; it starts no service and stops nothing.
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
KIT_DIR="$PROJECT_DIR/scripts/bench/yue2"
cd "$PROJECT_DIR"

IMAGE="sparklingkit/yue2-bench:0.1.6"
CONTAINER="sparklingkit-yue2-bench"
MODEL_REPO="m-a-p/YuE2-3B"
VAE_REPO="m-a-p/YuE2-Vae"
BUDGET_GIB="${YUE2_BUDGET_GIB:-24}"
MIN_AVAILABLE_GIB="${YUE2_MIN_AVAILABLE_GIB:-30}"
SETTLE_SECONDS=10
ACCEPT_MODEL_LICENSE=false
SKIP_BUILD=false

usage() {
  cat <<'EOF'
Usage: ./scripts/bench/yue2/run.sh --accept-model-license [--skip-build] [case-id ...]

Builds the YuE2 bench image, downloads YuE2-3B and YuE2-Vae, generates the bench songs next to the running
stack and prints memory, speed and the plan's gates. Results go to data/bench/yue2/<timestamp>/.

  --accept-model-license  Confirm you reviewed YuE2's weights license (CC BY-NC 4.0 with a creator permission)
  --skip-build            Reuse the bench image from an earlier run
  case-id ...             Run only these cases (en-short en-full-1 en-full-2 en-full-off it-pop)

Environment:
  YUE2_REVISION, YUE2_VAE_REVISION  Hugging Face commits to use (default: resolve the current main once)
  YUE2_BUDGET_GIB                   YuE2's own memory budget (default 24, its upstream default)
  YUE2_MIN_AVAILABLE_GIB            Refuse to start below this much available memory (default 30)
EOF
}

cases=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --accept-model-license) ACCEPT_MODEL_LICENSE=true ;;
    --skip-build) SKIP_BUILD=true ;;
    -h|--help) usage; exit 0 ;;
    -*) printf 'Unknown option: %s\n' "$1" >&2; usage >&2; exit 2 ;;
    *) cases+=("$1") ;;
  esac
  shift
done

if [[ "$ACCEPT_MODEL_LICENSE" != "true" ]]; then
  cat >&2 <<'EOF'
YuE2's weights are licensed CC BY-NC 4.0 with an additional creator permission: individuals may use and
monetize what they generate, companies need a commercial license from the authors. Review
https://huggingface.co/m-a-p/YuE2-3B, then re-run with --accept-model-license.
EOF
  exit 1
fi

for command in docker nvidia-smi python3 awk; do
  if ! command -v "$command" >/dev/null 2>&1; then
    printf 'Required command not found: %s\n' "$command" >&2
    exit 1
  fi
done

COMPOSE=(
  docker compose
  --project-name sparklingkit
  --file compose.yaml
  --file compose.spark.yaml
  --file compose.dgx.yaml
)

available_gib() {
  awk '/^MemAvailable:/ { printf "%d", $2 / 1048576 }' /proc/meminfo
}

printf '== Before starting (the bench stops nothing) ==\n'
docker ps --format 'table {{.Names}}\t{{.Status}}'
free -g
nvidia-smi --query-gpu=name,utilization.gpu,memory.used --format=csv || true

if docker ps -a --format '{{.Names}}' | grep -qx "$CONTAINER"; then
  printf 'A container named %s already exists; remove it with: docker rm -f %s\n' "$CONTAINER" "$CONTAINER" >&2
  exit 1
fi

if [[ "$SKIP_BUILD" != "true" ]]; then
  printf '\nBuilding %s...\n' "$IMAGE"
  docker build --tag "$IMAGE" "$KIT_DIR"
fi

model_root="$PROJECT_DIR/data/dgx-models"
mkdir -p "$model_root"

resolve_revision() {
  "${COMPOSE[@]}" --profile tools run --rm --no-deps --entrypoint python3 model-downloader \
    -c 'import sys; from huggingface_hub import HfApi; print(HfApi().model_info(sys.argv[1]).sha)' "$1" \
    | tail -n 1
}

# Same layout and completion marker as download_model in scripts/start-dgx-spark.sh, limited to the files
# YuE2 itself loads.
download_model() {
  local repository="$1"
  local revision="$2"
  local completion_marker="$model_root/$repository/.sparklingkit-$revision.complete"

  if [[ -f "$completion_marker" ]]; then
    printf 'Using existing %-20s %s\n' "$repository" "$revision"
    return
  fi
  printf 'Downloading %-20s %s\n' "$repository" "$revision"
  mkdir -p "$model_root/$repository"
  "${COMPOSE[@]}" --profile tools run --rm --no-deps \
    --user "$(id -u):$(id -g)" \
    model-downloader \
    download "$repository" \
    --revision "$revision" \
    --local-dir "/models/$repository" \
    --include "*.json" "*.safetensors" "qwen.tiktoken" "*.py" "LICENSE" "THIRD_PARTY_NOTICES.md" "licenses/*" \
    --max-workers 8
  if [[ ! -s "$model_root/$repository/config.json" ]]; then
    printf 'Download validation failed for %s: no config.json\n' "$repository" >&2
    exit 1
  fi
  touch "$completion_marker"
}

model_revision="${YUE2_REVISION:-}"
vae_revision="${YUE2_VAE_REVISION:-}"
if [[ -z "$model_revision" ]]; then model_revision="$(resolve_revision "$MODEL_REPO")"; fi
if [[ -z "$vae_revision" ]]; then vae_revision="$(resolve_revision "$VAE_REPO")"; fi
for revision in "$model_revision" "$vae_revision"; do
  if [[ ! "$revision" =~ ^[0-9a-f]{40}$ ]]; then
    printf 'Not a commit hash: %s\n' "$revision" >&2
    exit 1
  fi
done
printf '\nPinning this run to %s@%s and %s@%s\n' "$MODEL_REPO" "$model_revision" "$VAE_REPO" "$vae_revision"
download_model "$MODEL_REPO" "$model_revision"
download_model "$VAE_REPO" "$vae_revision"

# Loading services have the largest peaks, and measuring next to one would also skew the baseline.
loading="$(docker ps --filter health=starting --format '{{.Names}}')"
if [[ -n "$loading" ]]; then
  printf 'These containers are still starting; run the bench once they are healthy:\n%s\n' "$loading" >&2
  exit 1
fi
if (( $(available_gib) < MIN_AVAILABLE_GIB )); then
  printf 'Only %s GiB available, below %s GiB. YuE2 may need about 20 GiB with headroom; this script stops\n' \
    "$(available_gib)" "$MIN_AVAILABLE_GIB" >&2
  printf 'nothing, so free memory first (and ask before stopping services you did not start).\n' >&2
  exit 1
fi

out="$PROJECT_DIR/data/bench/yue2/$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "$out"

sample_memory() {
  printf 'epoch,mem_available_kib\n'
  while :; do
    printf '%s,%s\n' "$(date +%s.%N)" "$(awk '/^MemAvailable:/ { print $2 }' /proc/meminfo)"
    sleep 1
  done
}
sample_memory >"$out/host-memory.csv" &
sampler_pid=$!
trap 'kill "$sampler_pid" 2>/dev/null || true' EXIT

printf '\nRecording the resident stack for 10 s before the run...\n'
sleep 10
baseline_until="$(date +%s.%N)"

# The memory cap matches the image-generation service's, so a runaway generation is stopped before it can
# push the resident services out.
bench_args=(
  --model /models/YuE2-3B --vae /models/YuE2-Vae --out /out
  --model-revision "$model_revision" --vae-revision "$vae_revision"
  --budget-gib "$BUDGET_GIB" --settle-seconds "$SETTLE_SECONDS"
)
if (( ${#cases[@]} )); then bench_args+=(--only "${cases[@]}"); fi

status=0
docker run --rm --name "$CONTAINER" \
  --gpus all --ipc=host --network none \
  --memory 26g --memory-swap 26g \
  --user "$(id -u):$(id -g)" \
  -e HF_HUB_OFFLINE=1 -e TRANSFORMERS_OFFLINE=1 \
  -v "$model_root/m-a-p:/models:ro" \
  -v "$out:/out" \
  "$IMAGE" \
  python3 /bench/bench.py run "${bench_args[@]}" \
  || status=$?

kill "$sampler_pid" 2>/dev/null || true
python3 "$KIT_DIR/bench.py" summarize --out "$out" --baseline-until "$baseline_until" \
  --settle-seconds "$SETTLE_SECONDS" || status=$?

printf '\nSongs, scores and results: %s\n' "$out"
printf 'Send back results.json and summary.json from there, plus a note on how the songs sound.\n'
exit "$status"
