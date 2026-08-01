import { postJson, postMultipart } from '@/api/client'
import type {
  HearingProcessResponse,
  HearingTestRequest,
  HearingTestResponse,
} from '@/models/hearing'
import type { HearingProfile } from '@/models/profile'

/** Store + score a completed hearing assessment. */
export function submitHearingTest(
  payload: HearingTestRequest,
): Promise<HearingTestResponse> {
  return postJson<HearingTestResponse>('/hearing/test', payload)
}

/** Adapt an audio file (WAV) to a hearing profile. */
export async function processAudio(
  audioBlob: Blob,
  hearingProfile?: HearingProfile | null,
): Promise<HearingProcessResponse> {
  const fields: Record<string, string | Blob> = { file: audioBlob }
  if (hearingProfile) {
    fields.profile = JSON.stringify(hearingProfile)
  }
  return postMultipart<HearingProcessResponse>('/hearing/process', fields)
}
