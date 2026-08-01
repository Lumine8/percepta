# Percepta — Product Plan

## Vision

> "AI that adapts the digital world to how YOU perceive it."

Percepta builds a personalized **perception profile** (hearing + vision) from a short
battery of interactive assessments, then adapts digital content — audio and images —
to that profile in real time.

The MVP deliberately routes every adaptation through a **rule-based signal-processing
pipeline** built with `librosa`, `scipy`, `numpy`, and OpenCV. The architecture is
designed so any rule-based stage can later be swapped for an ML model without touching
the frontend or the HTTP contracts.

## MVP scope

### Hearing

1. **Assessment (Step 1)**
   - Pure-tone screening across `125, 250, 500, 1000, 2000, 4000, 8000` Hz.
   - The user presses a button (or Space) whenever they hear a tone.
   - Adaptive presentation with random **catch trials** (silence) to detect guessing.
   - Produces a threshold audiogram per ear.
   - Stored locally (localStorage) and posted to the backend for scoring/persistence.

2. **Speech processing (Step 2)**
   - Input via file upload or live microphone recording.
   - Pipeline: equalization → noise reduction → frequency compression →
     frequency transposition → volume normalization (see `HEARING.md`).
   - Output: original + processed waveforms and before/after playback.

### Vision

1. **Assessment**
   - Contrast sensitivity (sine-wave grating detection).
   - Color perception (Ishihara-style plates).
   - Visual acuity (tumbling-E chart).
   - Blind-spot mapping (dot grid).
   - Produces a perception profile (see `VISION.md`).

2. **Image enhancement**
   - Upload an image; apply contrast enhancement, adaptive brightness, edge
     enhancement, color remapping, and magnification.
   - Original vs. enhanced side-by-side comparison.

## Out of scope for MVP

- Authentication / multi-user accounts.
- Cloud storage.
- Clinical-grade calibration (dB levels are gain proxies — **screening only**).
- Automated ML training pipelines.

## Acceptance criteria

- [ ] Landing page with all 7 sections (Hero, Features, How it Works, Demo,
      Research, Accessibility, Footer).
- [ ] Dashboard with Hearing and Vision entry cards.
- [ ] Full hearing assessment produces a correct-looking audiogram and persists.
- [ ] Speech upload/record → processed audio with visible waveform diff.
- [ ] Full vision assessment produces a perception profile.
- [ ] Image enhancement produces visibly improved output with compare slider.
- [ ] All five backend endpoints functional and documented at `/docs`.
- [ ] `process(input, profile) -> output` interface verified by tests; swapping a
      processor for an AI version requires no frontend changes.
- [ ] Keyboard shortcuts, dark glassmorphism UI, responsive.
- [ ] Backend pytest suite and frontend Vitest suite green.
