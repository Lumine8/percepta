# Percepta — Roadmap

## Current (MVP)

- [x] Rule-based hearing + vision adaptation pipelines behind a stable contract.
- [x] Local-first profile storage (JSON + localStorage).
- [x] Interactive in-browser assessments.
- [x] Documented HTTP API.

## Next

### AI-model replacement (no frontend changes)

The processor registry is the seam for this work. Implemented so far — Gemini-backed
stages that recommend processing parameters and degrade to rule-based DSP:

- [x] `hearing.equalization` → Gemini-reasoned gains (biquad apply, fallback safe)
- [x] `vision.contrast_enhancement` → Gemini-recommended CLAHE/brightness (OpenCV apply)
- [x] Feature-flag via `PERCEPTA_USE_AI_PROCESSORS=true`; key in `PERCEPTA_GEMINI_API_KEY`

Still planned (model-driven stages, same contract):

| Stage                 | Rule-based today            | AI target                        |
| --------------------- | --------------------------- | -------------------------------- |
| `noise_reduction`     | Spectral gating             | Denoising NN (e.g., DCCRN/DeepFilterNet) |
| `equalization`        | Biquad EQ from audiogram    | Learned gain curves per profile  |
| `frequency_*`         | Phase-vocoder remapping     | Speech-resynthesis / band widening |
| `contrast_enhancement`| CLAHE                       | Learned tone-mapping / enhancement net |
| `color_remapping`     | LMS channel rebalancing     | Simulation-aware recoloring net  |

Delivery steps (for the remaining stages):

1. Train offline, export ONNX.
2. Implement `Processor` wrappers with the same `name`s; register with priority.
3. A/B against the rule-based pipeline on the existing pytest fixtures.
4. Feature-flag via settings (`PERCEPTA_USE_AI_PROCESSORS=1`).

### Calibration & clinical rigor

- Real dB-SPL calibration path (e.g., known headphone + volume keying).
- Validation of audiogram vs. clinical audiometry.
- Clear medical-disclaimer + screening-only labeling.

### Productization

- Multi-user accounts + backend DB (swap JSON store for SQLite/Postgres).
- Profile portability (export/import).
- Browser extension / OS-level "adapt this page" integration.
- Speech: streaming chunked processing for live audio.
- Vision: video input (camera) enhancement.

### Accessibility & i18n

- Screen-reader verification of every interactive control.
- Multiple languages for assessment instructions.
