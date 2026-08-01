# Percepta — Setup

## Prerequisites

- Node.js ≥ 20
- Python ≥ 3.11 (3.12 recommended)
- A modern browser (Chrome/Edge/Firefox) for the Web Audio + MediaRecorder features.

## Run everything (frontend + backend)

From the repo root, one command starts both servers and keeps them in sync:

```powershell
npm install        # once — installs `concurrently` at the root
npm run dev
```

- Backend (uvicorn, `--reload`) on `http://localhost:8000` — API + `/docs`
- Frontend (Vite) on `http://localhost:5173` — `/api` is proxied to the backend
- Ctrl+C stops both (`concurrently -k`).

Other root scripts: `npm run test` (backend + frontend), `npm run typecheck`.

## Backend

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

- API + docs: `http://localhost:8000/docs`
- The profile is stored at `backend/data/profile.json` (created on first write).

> Windows note: `librosa`/`numba` versions are pinned in `requirements.txt` to a
> combination known to work on Python 3.12. If you hit a numba/llvmlite build error,
> either use the exact pins or remove `librosa` and rely on the `scipy`-only STFT
> fallback paths (the pipeline degrades gracefully).

## Frontend

```powershell
cd frontend
npm install
npm run dev
```

- App: `http://localhost:5173`
- `/api` requests are proxied to `http://localhost:8000` by Vite.

## Tests

```powershell
# Backend
cd backend
pytest -q

# Frontend
cd frontend
npm run test        # unit + component tests
npm run typecheck   # tsc --noEmit
npm run build       # production build
```

## AI-backed processors (Gemini)

Two pipeline stages — the hearing equalizer and the vision contrast enhancer — can
be swapped for Gemini-backed versions that recommend processing parameters. No
frontend or router changes needed: the AI versions shadow the same processor names
in the registry.

```powershell
# 1. Put your key in backend/.env (see backend/.env.example)
PERCEPTA_GEMINI_API_KEY=...
# 2. Enable the AI processors
PERCEPTA_USE_AI_PROCESSORS=true
```

- The hearing AI stage sends the audiogram + a coarse spectrum envelope of the
  audio to Gemini and applies the returned per-band gains with the same biquad
  filters the rule-based EQ uses.
- The vision AI stage sends a small thumbnail + the user's contrast score and
  applies Gemini's CLAHE clip limit / brightness suggestions with OpenCV.
- Both fall back to the rule-based stage if the key is missing, the API errors, or
  the response is unusable — so enabling the flag is always safe.
- Configure the model with `PERCEPTA_GEMINI_MODEL` (default `gemini-3.5-flash`) and
  timeouts with `PERCEPTA_GEMINI_TIMEOUT_S`.

## Environment variables

| Variable          | Default               | Description                          |
| ----------------- | --------------------- | ------------------------------------ |
| `PERCEPTA_DATA_DIR` | `backend/data`      | Where the profile JSON is persisted  |
| `PERCEPTA_CORS_ORIGINS` | `http://localhost:5173` | Comma-separated allowed origins |
| `PERCEPTA_HOST` / `PERCEPTA_PORT` | `0.0.0.0` / `8000` | uvicorn bind (used by `run.py`) |
| `PERCEPTA_USE_AI_PROCESSORS` | `false` | Swap EQ/contrast stages for Gemini |
| `PERCEPTA_GEMINI_API_KEY` | — | Gemini API key (optional) |
| `PERCEPTA_GEMINI_MODEL` | `gemini-3.5-flash` | Gemini model id |
| `PERCEPTA_GEMINI_TIMEOUT_S` | `30` | Gemini per-request timeout |

## Useful commands

```powershell
# Run backend without uvicorn CLI (reads settings)
cd backend
python run.py
```
