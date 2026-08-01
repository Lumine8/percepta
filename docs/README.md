# Percepta — Docs

Percepta is an AI-powered accessibility platform that creates personalized hearing and
vision profiles and adapts digital content accordingly.

This directory holds the engineering documentation for the project.

## Index

| Document               | Purpose                                                            |
| ---------------------- | ------------------------------------------------------------------ |
| [PLAN.md](PLAN.md)     | Product plan: scope, MVP feature set, acceptance criteria.         |
| [ARCHITECTURE.md](ARCHITECTURE.md) | System architecture, module layout, processor contract, AI-swap strategy. |
| [API.md](API.md)       | HTTP API reference (contracts, payloads, examples).                |
| [HEARING.md](HEARING.md) | Hearing module design: assessment protocol, signal-processing chain. |
| [VISION.md](VISION.md) | Vision module design: assessments, image-enhancement chain.        |
| [SETUP.md](SETUP.md)   | Local development setup and run instructions.                      |
| [ROADMAP.md](ROADMAP.md) | Future work: AI-model replacement, calibration, multi-user.        |

## Conventions

- **Single source of truth for types**: frontend TS types in `frontend/src/models`
  mirror backend Pydantic schemas in `backend/app/schemas`. Keep them in sync when
  changing contracts.
- **Every processing module exposes the same interface**:
  `process(input, user_profile) -> output`. See `ARCHITECTURE.md` for the exact
  contract.
- **No authentication** in the MVP. The backend manages a single-user profile
  persisted to a JSON file, while the frontend is local-first (localStorage).
