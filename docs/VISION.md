# Percepta — Vision Module Design

## Step 1: Assessment battery

Four short, interactive tests run entirely in the browser; raw results are shipped to
`POST /vision/analyze` where `services/analysis/vision_scoring.py` turns them into a
`VisionProfile`.

### 1. Contrast sensitivity

- Sine-wave gratings (≈ 1 cycle/deg) rendered to canvas at descending Michelson
  contrast: `100% → 30% → 10% → 3% → 1%`.
- The user responds "visible / not visible"; the **threshold contrast %** is the
  lowest contrast still detected (interpolated).
- Score `0..1`: `score = 1 - clamp(log10(threshold%) / log10(100))`.

### 2. Color perception

- Ishihara-style plates generated on canvas: colored-dot matrices with an embedded
  digit using confusion-palette colors (red–green deficient and blue–yellow
  deficient variants).
- The user reports the digit seen (or "none"). Cross-checking reported vs expected
  across plates classifies:
  `normal | protanomaly | deuteranomaly | tritanomaly` (heuristic).

### 3. Visual acuity

- Tumbling-E charts (single optotype per screen, decreasing size).
- The user clicks the orientation of the smallest E they can reliably read.
- Convert to Snellen (`20/xx`), logMAR, and decimal acuity.

### 4. Blind-spot mapping

- Fixation cross + a grid of small dots; the user (one eye closed, measured viewing
  distance) clicks dots that disappear.
- Backend fits the missing-dot cloud to a circle and reports
  `center (x, y) + radius_deg` (assuming `viewing_distance_cm`; 57 cm ≈ 1°/cm).

## Step 2: Image enhancement pipeline

`VisionPipeline.process(image, profile, options) -> EnhancementResult` composes five
named processors (OpenCV).

| Processor              | Technique                                                                  |
| ---------------------- | -------------------------------------------------------------------------- |
| `contrast_enhancement` | CLAHE on the L channel of LAB (clip limit scales with profile contrast loss)|
| `adaptive_brightness`  | Local gamma correction guided by the profile's brightness sensitivity      |
| `edge_enhancement`     | Unsharp masking (Gaussian blur difference), strength from profile/options   |
| `color_remapping`      | Dichromacy-corrective channel rebalancing in LMS-ish space                  |
| `magnification`        | High-quality upscale (INTER_CUBIC) to requested zoom (1×–3×)               |

### Output

Enhanced PNG (base64) + dimensions + the list of applied stages + metadata.

## Frontend

- `components/vision/ContrastTest.tsx`, `ColorTest.tsx`, `AcuityTest.tsx`,
  `BlindSpotTest.tsx` — the four interactive assessments.
- `components/vision/ImageEnhancer.tsx` — upload → enhance → compare.
- `components/vision/CompareSlider.tsx` — draggable before/after reveal.
- Assessment flow is guided by `VisionWorkspace.tsx` (tabbed steps).
