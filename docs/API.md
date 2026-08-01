# Percepta — API Reference

Base URL (dev): `http://localhost:8000` — proxied from the frontend at `/api`.

Interactive docs: `http://localhost:8000/docs` (Swagger), `/redoc`.

All schemas are Pydantic models in `backend/app/schemas/`. Every response is JSON
unless stated otherwise.

---

## `GET /profile`

Returns the full perception profile.

**200 OK**

```json
{
  "hearing": {
    "ear": "right",
    "audiogram": [
      {"frequency": 250, "threshold_db": 15},
      {"frequency": 500, "threshold_db": 20}
    ],
    "average_loss_db": 17.5,
    "classification": "mild",
    "bands": {"low": "normal", "mid": "mild", "high": "moderate"},
    "completed_at": "2026-08-01T12:00:00Z"
  },
  "vision": {
    "contrast_sensitivity": {"threshold_percent": 2.5, "score": 0.8},
    "color_perception": {"deficiency": "normal"},
    "acuity": {"snellen": "20/25", "logmar": 0.1, "decimal": 0.8},
    "blind_spot": {"center_x": 15, "center_y": 0, "radius_deg": 2.1, "eye": "left"},
    "completed_at": "2026-08-01T12:10:00Z"
  },
  "generated_at": "2026-08-01T12:10:00Z"
}
```

If the profile does not exist yet, returns `404` with `{"detail": "profile not found"}`.

---

## `POST /hearing/test`

Store + score a completed hearing assessment. The tone presentation itself runs in
the browser (low latency); the backend validates, interprets, and persists.

**Request body**

```json
{
  "ear": "right",
  "audiogram": [
    {"frequency": 125, "threshold_db": 10},
    {"frequency": 250, "threshold_db": 15},
    {"frequency": 500, "threshold_db": 20},
    {"frequency": 1000, "threshold_db": 25},
    {"frequency": 2000, "threshold_db": 40},
    {"frequency": 4000, "threshold_db": 60},
    {"frequency": 8000, "threshold_db": 55}
  ]
}
```

- `ear`: `"left" | "right"`.
- `audiogram` frequency values must be the standard set
  `[125, 250, 500, 1000, 2000, 4000, 8000]` (a subset is tolerated for partial tests).
- `threshold_db`: 0–120 (dB HL proxy).

**200 OK** — returns the persisted `HearingProfile` (shape as in `GET /profile.hearing`),
including `classification` (`normal | mild | moderate | severe | profound`) and per-band
interpretation.

**422** — schema/validation errors.

---

## `POST /hearing/process`

Process an audio upload (or recording) through the hearing-adaptation pipeline.

**Request** — `multipart/form-data`

| Field     | Type   | Description                                              |
| --------- | ------ | -------------------------------------------------------- |
| `file`    | file   | WAV / MP3 / FLAC / OGG / M4A audio file.                 |
| `profile` | string | JSON-encoded `HearingProfile` (optional; falls back to stored profile). |

**200 OK**

```json
{
  "duration_s": 3.2,
  "sample_rate": 44100,
  "original": {"peaks": [0.02, 0.31, 0.1, "…"]},
  "processed": {"peaks": [0.01, 0.28, 0.12, "…"]},
  "processed_audio_b64": "UklGRlwAAABXQVZFZm10…",
  "stages": ["equalization", "noise_reduction", "frequency_compression", "frequency_transposition", "normalization"],
  "meta": {
    "noise_floor_db": -52.3,
    "target_loudness_db": -23.0,
    "peak_db": -1.0
  }
}
```

- `peaks`: downsampled min/max peak arrays (length ≤ 1200) for custom canvas waveform
  rendering — `original` and `processed`.
- `processed_audio_b64`: base64 WAV of the processed audio.

---

## `POST /vision/analyze`

Score + store a completed vision assessment.

**Request body**

```json
{
  "contrast": {"threshold_percent": 3.0, "trials_visible": [100, 30, 10, 3, 1]},
  "color": {"plates": [{"id": "rg_1", "reported": 3, "expected": 3}, {"id": "rg_2", "reported": null, "expected": 7}]},
  "acuity": {"last_readable_row": "6m_20_25", "correct": true},
  "blind_spot": {"eye": "left", "dots_missing": [{"x": 12, "y": 0}, {"x": 16, "y": 0}], "viewing_distance_cm": 57}
}
```

**200 OK** — returns the persisted `VisionProfile` (shape as in `GET /profile.vision`).

---

## `POST /vision/enhance`

Enhance an uploaded image using the vision profile.

**Request** — `multipart/form-data`

| Field     | Type   | Description                                                    |
| --------- | ------ | -------------------------------------------------------------- |
| `file`    | file   | Image (PNG / JPEG / WEBP).                                     |
| `profile` | string | JSON-encoded `VisionProfile` (optional; falls back to stored). |
| `options` | string | JSON-encoded options: `{"zoom": 1.0–3.0, "edge_strength": 0–2}`. |

**200 OK**

```json
{
  "enhanced_b64": "iVBORw0KGgo…",
  "width": 640,
  "height": 480,
  "stages": ["contrast_enhancement", "adaptive_brightness", "edge_enhancement", "color_remapping", "magnification"],
  "meta": {"zoom": 1.5, "contrast_clip_limit": 2.5}
}
```

---

## Error format

Non-2xx responses use the FastAPI default:

```json
{ "detail": "human readable message" }
```

Common status codes:

| Code | Meaning                                  |
| ---- | ---------------------------------------- |
| 400  | Malformed payload (e.g., bad base64/JSON) |
| 404  | Profile or file not found                |
| 422  | Schema validation failure                |
| 500  | Processing error                         |
