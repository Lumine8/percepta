/** Vision module request/response types (mirror `backend/app/schemas/vision.py`). */

import type { VisionProfile } from '@/models/profile'

export interface ContrastResult {
  threshold_percent: number
  trials_visible: number[]
}

export interface ColorPlateResult {
  id: string
  reported?: number | null
  expected?: number | null
}

export interface ColorResult {
  plates: ColorPlateResult[]
}

export interface AcuityResult {
  last_readable_row?: string | null
  correct: boolean
}

export interface BlindSpotResult {
  eye: string
  dots_missing: Array<{ x: number; y: number }>
  viewing_distance_cm: number
}

export interface VisionAnalyzeRequest {
  contrast?: ContrastResult | null
  color?: ColorResult | null
  acuity?: AcuityResult | null
  blind_spot?: BlindSpotResult | null
  completed_at?: string
}

export interface VisionEnhanceOptions {
  zoom: number
  edge_strength: number
}

export interface VisionEnhanceResponse {
  enhanced_b64: string
  width: number
  height: number
  stages: string[]
  meta: Record<string, unknown>
}

export type VisionAnalyzeResponse = VisionProfile
