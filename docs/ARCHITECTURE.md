# Percepta — Architecture

## System overview

```
┌───────────────────────────────┐        ┌──────────────────────────────┐
│  Frontend (React + Vite)      │        │  Backend (FastAPI)           │
│                               │  /api  │                              │
│  pages/  components/  hooks/  │◀──────▶│  api/routers/  services/     │
│  api/  services/  models/     │  JSON  │  processors/  storage/       │
│  (local-first: localStorage)  │        │  (JSON profile store)        │
└───────────────────────────────┘        └──────────────────────────────┘
```

- **Frontend** drives all interactive assessment UX (tone playback, test stimuli,
  recording) so latency stays low. Results are shipped to the backend as data.
- **Backend** owns scoring, persistence, and all heavy signal/image processing.
- **Local-first**: the frontend keeps the profile in `localStorage` and syncs to the
  backend opportunistically, so the app degrades gracefully offline.

## Monorepo layout

```
frontend/
  src/
    pages/          # Landing, Dashboard, HearingWorkspace, VisionWorkspace
    components/
      hearing/      # ToneTest, AudiogramChart, SpeechProcessing, WaveformCanvas …
      vision/       # ContrastTest, ColorTest, AcuityTest, BlindSpotTest, ImageEnhancer …
      shared/       # GlassCard, GradientBackground, StepIndicator, ui/*
      landing/      # Hero, Features, HowItWorks, Demo, Research, Accessibility, Footer
    api/            # HTTP client + endpoint modules
    services/       # Domain services (hearingService, visionService, profileService)
    hooks/          # useProfile, useAudioTone, useMediaRecorder, useKeyboardShortcuts
    models/         # TS types mirroring backend schemas
    utils/          # audio codec helpers, formatting, cn
  vite.config.ts    # /api proxy → http://localhost:8000

backend/
  app/
    main.py                 # FastAPI app factory, CORS, routers
    core/config.py          # pydantic-settings (paths, CORS origins)
    api/routers/            # hearing.py, vision.py, profile.py
    schemas/                # Pydantic request/response models
    models/                 # Domain types shared across services
    processors/             # The shared processing contract + registry
    services/
      hearing/              # pipeline + processors/
      vision/               # pipeline + processors/
      analysis/             # hearing_scoring, vision_scoring
      profile.py            # profile assembly logic
    storage/profile_store.py# JSON-file persistence
    utils/audio_io.py,image_io.py
  tests/                    # pytest suite
```

## The processor contract (future-proofing)

The single most important design decision: **every processing module exposes a common
interface**, so rule-based stages can be replaced by AI models without touching the
frontend or the routers.

```python
# backend/app/processors/base.py
@runtime_checkable
class Processor(Protocol):
    name: str
    def process(self, input: Any, profile: PerceptionProfile) -> Any: ...
```

- `input` is the raw artifact (a waveform + sr, or an image ndarray + metadata).
- `profile` is the typed `PerceptionProfile`; processors read only the fields they need.
- The output type is fixed **per pipeline stage** and declared by the schemas.

Stages are composed by the pipeline, which calls each named processor in order:

```python
result = registry.run("hearing.process", input=audio, profile=profile)
```

### Swapping in an AI model

1. Implement `class AiNoiseReduction(Processor)` with the same `name` as the
   rule-based stage (e.g. `"noise_reduction"`).
2. Register it in `registry` (highest priority wins).
3. Nothing else changes — routers, schemas, and the frontend are untouched.

## Data flow per endpoint

| Endpoint            | Frontend →                                 | Backend →                                   |
| ------------------- | ------------------------------------------ | ------------------------------------------- |
| `POST /hearing/test`| `{ear, thresholds:[{frequency, threshold_db}]}` | scores + persists, returns `HearingProfile` |
| `POST /hearing/process` | multipart WAV + profile JSON            | processed WAV (base64) + peak arrays + metadata |
| `POST /vision/analyze`  | `VisionAssessment`                     | scores + persists, returns `VisionProfile`  |
| `POST /vision/enhance`  | multipart image + profile + options     | enhanced PNG (base64) + metadata            |
| `GET /profile`          | —                                       | full `PerceptionProfile`                    |

Full contracts: `API.md`.

## Storage

- Backend: a single-user `PerceptionProfile` serialized to JSON at
  `backend/data/profile.json` (path configurable via settings).
- Frontend: profile mirrored in `localStorage` under `percepta:profile`.

## Non-functional

- **UI**: dark glassmorphism, blue/purple gradient, Framer Motion animations,
  accessibility-first (ARIA, focus management, keyboard shortcuts).
- **Testing**: pytest (backend processors + API), Vitest + Testing Library (frontend).
- **Docs**: FastAPI auto-generated at `/docs`; human docs in `docs/`.
