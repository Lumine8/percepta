import { getJson } from '@/api/client'
import type { PerceptionProfile } from '@/models/profile'

/** Fetch the full perception profile from the backend. */
export function fetchProfile(signal?: AbortSignal): Promise<PerceptionProfile> {
  return getJson<PerceptionProfile>('/profile', signal)
}
