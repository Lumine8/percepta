/** Hearing module request/response types (mirror `backend/app/schemas/hearing.py`). */

import type { Ear, HearingProfile } from '@/models/profile'

export interface HearingTestRequest {
  ear: Ear
  audiogram: Array<{ frequency: number; threshold_db: number }>
  completed_at?: string
}

export interface WaveformPeaks {
  /** [[min, max], ...] per time bucket, for custom-canvas rendering. */
  peaks: number[][]
}

export interface HearingProcessResponse {
  duration_s: number
  sample_rate: number
  original: WaveformPeaks
  processed: WaveformPeaks
  processed_audio_b64: string
  stages: string[]
  meta: Record<string, unknown>
}

export type HearingTestResponse = HearingProfile
