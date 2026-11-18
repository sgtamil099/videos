# VYRO AI STUDIO — Installation, Environment & Deployment Guide

**Tagline:** Your Imagination. AI Creates.

## 1. Architecture Overview

VYRO AI STUDIO is organized as a modular full-stack platform:

- **Frontend (`src/`)**: React 19, TypeScript, Tailwind CSS v4, Canvas2D/WebAudio NLE Studio Compositor & Exporter.
- **Core Backend (`server.ts`, `src/server/ai-engine.ts`)**: Node.js + Express + Drizzle ORM + PostgreSQL + Firebase Admin Auth + `@google/genai` SDK.
- **Database (`src/db/`)**: PostgreSQL schema (`users`, `projects`, `characters`, `render_jobs`, `ai_models`, `gpu_nodes`, `subscriptions`).
- **CUDA GPU Microservice (`backend-gpu/`)**: Python FastAPI + PyTorch CUDA worker for local/cluster NVIDIA RTX 4090, A100, and Multi-GPU H100 inference (Wan 2.1, SadTalker/Wav2Lip, MusicGen, Real-ESRGAN 4K/8K).

## 2. Feature Execution Modes

- **Live Cloud AI (Included)**:
  - Multi-Scene Storyboard Generator (`gemini-4-hydrogen`)
  - Cinematic Prompt Enhancer (`gemini-4-hydrogen`)
  - Single & Dual-Speaker AI Voice Generator (`gemini-3.8-flash-lite-tts` & `gemini-3.8-flash-tts`, WAV 24kHz)
  - Lip-Sync Viseme Timeline Generator (`gemini-4-hydrogen`)
  - Browser NLE Studio Compositor & Video Exporter (Canvas2D + WebAudio MediaRecorder)
- **Billing-Enabled Cloud AI (Requires Paid Gemini API Key in Settings > Secrets)**:
  - Cloud Text-to-Video & Image-to-Video (`gemini-omni-1.2-flash`)
  - Cloud AI Music (`lyria-3-clip-preview` / `lyria-3-pro-preview`)
- **Self-Hosted NVIDIA CUDA GPU Worker (`GPU_WORKER_URL`)**:
  - Open-source local/cloud GPU video diffusion (`Wan2.1`), CUDA lip-sync (`Wav2Lip`/`SadTalker`), and `MusicGen`.

## 3. Local Development Setup

```bash
npm install
npm run dev
```

Ensure PostgreSQL environment variables (`SQL_HOST`, `SQL_DB_NAME`, `SQL_USER`, `SQL_PASSWORD`, `SQL_ADMIN_USER`, `SQL_ADMIN_PASSWORD`) and `GEMINI_API_KEY` are configured in your environment.

Push database schema updates with Drizzle Kit:

```bash
npx drizzle-kit push --config=src/db/drizzle.config.ts
```

## 4. Docker + NVIDIA CUDA GPU Deployment

Requires Docker Engine and NVIDIA Container Toolkit on Linux/WSL2:

```bash
export GEMINI_API_KEY="your-key"
docker compose up --build -d
```

- Web Studio: `http://localhost:3000`
- FastAPI CUDA Telemetry: `http://localhost:8000/api/v1/gpu/telemetry`
