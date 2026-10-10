# One-off YuE2 measurement image for the DGX Spark; see docs/superpowers/plans/2026-10-10-yue2-music-bakeoff.md.
# The image-generation service's base: its torch 2.10 is the version YuE2 pins, built for CUDA 13 and GB10.
ARG PYTORCH_IMAGE=nvcr.io/nvidia/pytorch:25.11-py3@sha256:4a85d8cf6fb3a943280960b8948cf4e9b6eca77b4414c68c9b2c7bb863f79b70
FROM ${PYTORCH_IMAGE}

# Tag yue2-v0.1.6.
ARG YUE2_COMMIT=9c6c4b349be978b06a9d0d958471a07a6cdeff4d

ENV DEBIAN_FRONTEND=noninteractive \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONUNBUFFERED=1 \
    HOME=/tmp

RUN apt-get update \
    && apt-get install -y --no-install-recommends git libsndfile1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /bench/requirements.txt
# --no-deps keeps the base image's torch; requirements.txt pins the rest of what YuE2 declares. pip check
# reports YuE2's exact torch pin against the NGC build, so its output is kept for the results, not enforced.
RUN PIP_CONSTRAINT='' python3 -m pip install --no-cache-dir -r /bench/requirements.txt \
    && PIP_CONSTRAINT='' python3 -m pip install --no-cache-dir --no-deps \
       "yue2-infer @ git+https://github.com/multimodal-art-projection/YuE@${YUE2_COMMIT}" \
    && { python3 -m pip check > /bench/pip-check.txt 2>&1 || true; } \
    && python3 -c "import soundfile, torch, yue2.modeling_vae, yue2.modeling_yue2, yue2.pipeline; print('torch', torch.__version__)"

COPY bench.py /bench/bench.py
WORKDIR /bench
USER 65534:65534

ENTRYPOINT []
CMD ["python3", "/bench/bench.py", "--help"]
