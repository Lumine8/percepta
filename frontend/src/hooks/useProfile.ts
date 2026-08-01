import { useCallback, useEffect, useState } from 'react'

import { submitHearingTest } from '@/api/hearing'
import type { HearingProfile, PerceptionProfile, VisionProfile } from '@/models/profile'
import { profileService } from '@/services/profileService'

export interface UseProfile {
  profile: PerceptionProfile | null
  loaded: boolean
  offline: boolean
  /** Update hearing locally AND sync to the backend (best-effort). */
  setHearing: (hearing: HearingProfile) => Promise<PerceptionProfile>
  /** Update vision locally AND sync to the backend (best-effort). */
  setVision: (vision: VisionProfile) => Promise<PerceptionProfile>
  refresh: () => Promise<void>
}

/**
 * Profile state: loads instantly from localStorage, then reconciles with the
 * backend. Updates are local-first (persist to localStorage immediately, POST to
 * the API without blocking the UI).
 */
export function useProfile(): UseProfile {
  const [profile, setProfile] = useState<PerceptionProfile | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [offline, setOffline] = useState(false)

  useEffect(() => {
    const local = profileService.loadLocal()
    setProfile(local.profile)
    setLoaded(true)
    const controller = new AbortController()
    profileService
      .syncFromBackend(controller.signal)
      .then((state) => {
        setProfile(state.profile)
        setOffline(state.offline)
      })
      .catch(() => {
        /* aborted or failed — keep local */
      })
    return () => controller.abort()
  }, [])

  const refresh = useCallback(async () => {
    const state = await profileService.syncFromBackend()
    setProfile(state.profile)
    setOffline(state.offline)
  }, [])

  const setHearing = useCallback(async (hearing: HearingProfile) => {
    const next = profileService.updateHearingLocal(hearing)
    setProfile(next)
    void submitHearingTest({
      ear: hearing.ear,
      audiogram: hearing.audiogram,
      completed_at: new Date().toISOString(),
    })
      .then(() => profileService.syncFromBackend())
      .then((state) => setProfile(state.profile))
      .catch(() => {
        /* offline — local copy already saved */
      })
    return next
  }, [])

  const setVision = useCallback(async (vision: VisionProfile) => {
    const next = profileService.updateVisionLocal(vision)
    setProfile(next)
    // The workspace already POSTs to /vision/analyze itself; keep this hook's
    // backend sync for the enhancement profile reference.
    void profileService.syncFromBackend().then((state) => {
      setProfile(state.profile)
      setOffline(state.offline)
    })
    return next
  }, [])

  return { profile, loaded, offline, setHearing, setVision, refresh }
}
