/** Domain models mirroring `backend/app/models/profile.py`. */

export interface AudiogramPoint {
  frequency: number
  threshold_db: number
}

export type Ear = 'left' | 'right'

export type HearingClassification =
  | 'normal'
  | 'mild'
  | 'moderate'
  | 'severe'
  | 'profound'

export interface HearingProfile {
  ear: Ear
  audiogram: AudiogramPoint[]
  average_loss_db: number
  classification: HearingClassification
  bands: Record<string, string>
  completed_at?: string | null
}

export interface ContrastSensitivityProfile {
  threshold_percent: number
  score: number
}

export type ColorDeficiency =
  | 'normal'
  | 'protanomaly'
  | 'deuteranomaly'
  | 'tritanomaly'

export interface ColorPerceptionProfile {
  deficiency: ColorDeficiency
}

export interface AcuityProfile {
  snellen: string
  logmar: number
  decimal: number
}

export interface BlindSpotProfile {
  eye: string
  center_x: number
  center_y: number
  radius_deg: number
}

export interface VisionProfile {
  contrast_sensitivity?: ContrastSensitivityProfile | null
  color_perception: ColorPerceptionProfile
  acuity?: AcuityProfile | null
  blind_spot?: BlindSpotProfile | null
  completed_at?: string | null
}

export interface PerceptionProfile {
  hearing?: HearingProfile | null
  vision?: VisionProfile | null
  generated_at?: string | null
}
