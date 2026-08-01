# Percepta

> AI that adapts the digital world to how **you** perceive it.

Percepta is an AI-powered accessibility platform that builds a personal hearing and
vision profile from short in-browser assessments, then remaps speech and imagery so
content fits *your* senses — not the average person's.

- **Hearing** — pure-tone audiogram, speech-in-noise, and frequency-range tests with a
  live signal-processing chain (EQ · denoise · frequency remap · normalize).
- **Vision** — acuity, color-vision, contrast, and blind-spot tests with an image
  enhancement chain (contrast · edge enhance · color remap).
- **Personalized** — every adaptation is driven by a per-user profile; nothing is shared.

## Tech stack

| Layer      | Tech                                                                 |
| ---------- | -------------------------------------------------------------------- |
| Frontend   | React 19, Vite 8, Tailwind CSS v4, Framer Motion, Radix UI, lucide   |
| Backend    | FastAPI (Python 3.12), Pydantic, NumPy/SciPy, librosa, OpenCV        |
| Optional AI| Google Gemini — swaps EQ / contrast stages for AI-recommended params  |
| Dev        | `concurrently` at the root runs both servers with one command         |

## Repo layout

```
percepta/
├── backend/   # FastAPI app: routers, processors, services, schemas
├── frontend/  # React SPA: pages, components, models, hooks
├── docs/      # Engineering docs (plan, architecture, API, setup…)
└── package.json  # Root dev scripts (run both servers together)
```

See [docs/README.md](docs/README.md) for the full documentation index.

## Quick start

Prerequisites: Node.js ≥ 20, Python ≥ 3.11 (3.12 recommended).

```powershell
npm install        # root — installs `concurrently`
npm run dev
```

- Backend (uvicorn, reload) → `http://localhost:8000` (API + `/docs`)
- Frontend (Vite) → `http://localhost:5173` (`/api` is proxied to the backend)
- `Ctrl+C` stops both.

Full setup (venv, env vars, AI processors) is in [docs/SETUP.md](docs/SETUP.md).

## Scripts

| Command            | What it does                                  |
| ------------------ | --------------------------------------------- |
| `npm run dev`      | Run backend + frontend together               |
| `npm run test`     | Backend (`pytest`) + frontend (`vitest`)      |
| `npm run typecheck`| Frontend `tsc -b --noEmit`                    |
| `npm run ping`     | Keep a deployed backend awake (see below)     |
| `npm --prefix frontend run build` | Production frontend build       |

## Keeping the backend awake

Free hosting tiers (Render, Railway, Fly.io, …) sleep idle instances after ~15
minutes. To keep the deployed backend warm, run the ping script from anywhere:

```powershell
PERCEPTA_BACKEND_URL=https://your-app.onrender.com npm run ping
```

- Pings `/health` every 10 minutes by default (override with `PING_INTERVAL_MIN`).
- Defaults to `http://localhost:8000` if no URL is set.
- Failures are logged and retried automatically.

## Conventions

- Frontend TS types in `frontend/src/models` mirror backend Pydantic schemas in
  `backend/app/schemas` — keep them in sync when changing contracts.
- Every processing module exposes `process(input, user_profile) -> output`. See
  [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the contract.
- No authentication in the MVP: single-user profile persisted to a JSON file on the
  backend; the frontend is local-first.
