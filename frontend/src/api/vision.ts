import { postJson, postMultipart } from '@/api/client'
import type {
  VisionAnalyzeRequest,
  VisionAnalyzeResponse,
  VisionEnhanceOptions,
  VisionEnhanceResponse,
} from '@/models/vision'
import type { VisionProfile } from '@/models/profile'

/** Score + store the vision assessment battery. */
export function analyzeVision(
  payload: VisionAnalyzeRequest,
): Promise<VisionAnalyzeResponse> {
  return postJson<VisionAnalyzeResponse>('/vision/analyze', payload)
}

/** Enhance an image against a vision profile. */
export async function enhanceImage(
  imageBlob: Blob,
  options: VisionEnhanceOptions,
  visionProfile?: VisionProfile | null,
): Promise<VisionEnhanceResponse> {
  const fields: Record<string, string | Blob> = {
    file: imageBlob,
    options: JSON.stringify(options),
  }
  if (visionProfile) {
    fields.profile = JSON.stringify(visionProfile)
  }
  return postMultipart<VisionEnhanceResponse>('/vision/enhance', fields)
}
