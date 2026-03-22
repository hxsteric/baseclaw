FROM node:22-slim

# EigenCloud TEE requires root user
USER root

# ─── Install Python 3 + git (needed for Hermes Agent) ───
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 python3-pip python3-venv git curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# ─── Install uv (Python package manager used by Hermes) ───
RUN curl -LsSf https://astral.sh/uv/install.sh | sh
ENV PATH="/root/.local/bin:$PATH"

# ─── Clone and install Hermes Agent ───
RUN git clone --depth 1 https://github.com/NousResearch/hermes-agent.git /opt/hermes && \
    echo "[Hermes] Clone successful — files:" && \
    ls /opt/hermes/run_agent.py && \
    echo "[Hermes] run_agent.py confirmed"

WORKDIR /opt/hermes
RUN uv venv && \
    (uv pip install -r requirements.txt 2>&1 || true) && \
    echo "[Hermes] Python deps install attempted"

# ─── Set up Node.js proxy ───
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install

COPY src/ ./src/
COPY hermes/ ./hermes/
COPY tsconfig.json ./

RUN npx tsc
RUN npm prune --production

# ─── Verify Hermes is still intact ───
RUN echo "[Hermes] Final check:" && ls -la /opt/hermes/run_agent.py

# ─── Environment ───
ENV PORT=3001
ENV HERMES_PATH=/opt/hermes
ENV PYTHON_BIN="/opt/hermes/.venv/bin/python3"
ENV PYTHONUNBUFFERED=1

EXPOSE 3001

CMD ["node", "dist/index.js"]
