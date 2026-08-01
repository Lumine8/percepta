# Percepta — Hearing Module Design

## Step 1: Pure-tone assessment

### Frequencies

`125, 250, 500, 1000, 2000, 4000, 8000` Hz — the standard audiometric octave set.

### Procedure (Hughson–Westlake, simplified)

1. Present a 1000 Hz probe at a comfortable level (~40 dB).
2. Per frequency, descend in 10 dB steps while the user responds "I heard it";
   on the first miss, ascend in 5 dB steps; the **threshold** is the lowest level
   at which the user still responds on the ascending run.
3. **Catch trials**: each frequency run is interleaved with random silent trials.
   If the user responds to a catch trial, the run is flagged as unreliable and
   retested once.

The tone is a pure sine rendered by the browser **Web Audio API** (short ramps to
avoid clicks). Tone gain maps to a **dB-HL proxy** — not calibrated hardware — and the
UI clearly labels results as a *screening tool*.

### Output

- `{ frequency, threshold_db }` per tested frequency → an **audiogram**.
- Both ears can be tested; results are stored per ear.
- The frontend renders the audiogram on a custom canvas (log-frequency axis,
  normal range shaded).
- Results are saved to `localStorage` and posted to `POST /hearing/test` for
  scoring + persistence.

### Scoring (backend `services/analysis/hearing_scoring.py`)

- **Average loss**: mean threshold across `500, 1000, 2000, 4000` Hz (BTA).
- **Classification**: `normal ≤ 20` · `mild ≤ 40` · `moderate ≤ 70` · `severe ≤ 90` ·
  `profound > 90` dB.
- **Band interpretation**: low (`125–500`), mid (`1000–2000`), high (`4000–8000`).

## Step 2: Speech adaptation pipeline

A single entry point `HearingPipeline.process(audio, profile) -> ProcessingResult`
composes the five named processors. Each processor implements the common
`Processor` contract and reads only the profile fields it needs.

### 1. `equalization` — audiogram-driven multiband EQ

- Design biquad shelving/peaking filters (via `scipy.signal`) around the audiogram
  frequencies.
- Gain per band ≈ min(threshold_db, cap) × 0.5 dB/dB, so quieter bands get more
  amplification without excessive loudness.
- Applied as a cascaded biquad filter chain.

### 2. `noise_reduction` — spectral gating

- STFT (`librosa.stft`) → estimate noise floor from the quietest frames
  (percentile) → compute a soft spectral mask → inverse STFT (Wiener-style gating).

### 3. `frequency_compression` — high-frequency remapping

- When high-frequency loss is severe, compress the upper spectrum into the
  audible range using phase-vocoder time-stretch + pitch-shift
  (`librosa.effects`), mixing the transposed band under the original.

### 4. `frequency_transposition` — spectral lowering

- Applies a profile-driven downward pitch shift (perceptually transposing high
  frequencies to where sensitivity is better).

### 5. `normalization` — loudness + peak control

- Perceptual loudness normalization to a target (~ −23 LUFS proxy) and final peak
  limiting to −1 dBFS so output never clips.

### Output

- Processed WAV (44.1 kHz / 16-bit) + downsampled **min/max peak arrays** for both
  original and processed signals (for waveform rendering) + metadata.

## Frontend

- `components/hearing/ToneTest.tsx` — the assessment runner (Web Audio tones,
  catch trials, Space-bar support).
- `components/hearing/AudiogramChart.tsx` — canvas audiogram renderer.
- `components/hearing/SpeechProcessing.tsx` — upload/record → process → compare.
- `components/hearing/WaveformCanvas.tsx` — dual waveform rendering from peak data.
- `hooks/useAudioTone.ts` — tone synthesis/playback engine.
- `hooks/useMediaRecorder.ts` — mic recording to WAV.
