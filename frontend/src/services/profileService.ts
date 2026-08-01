import { fetchProfile } from '@/api/profile'
import type { HearingProfile, PerceptionProfile, VisionProfile } from '@/models/profile'

/** localStorage key for the local-first profile mirror. */
const STORAGE_KEY = 'percepta:profile'

export interface ProfileState {
  profile: PerceptionProfile | null
  loaded: boolean
  offline: boolean
}

const EMPTY: ProfileState = { profile: null, loaded: true, offline: false }

/**
 * Local-first profile service.
 *
 * The browser keeps the profile in localStorage so the app works offline and is
 * instant on load; the backend is synced opportunistically. Local changes win
 * until a backend value is successfully fetched.
 */
class ProfileService {
  /** Load from localStorage immediately (synchronous, never throws). */
  loadLocal(): ProfileState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return EMPTY
      return { profile: JSON.parse(raw) as PerceptionProfile, loaded: true, offline: false }
    } catch {
      return EMPTY
    }
  }

  /** Persist to localStorage. */
  saveLocal(profile: PerceptionProfile | null): void {
    try {
      if (profile) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
      } else {
        localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      /* storage unavailable (private mode) — non-fatal */
    }
  }

  /** Merge a hearing profile into the local profile and persist. */
  updateHearingLocal(hearing: HearingProfile): PerceptionProfile {
    const current = this.loadLocal().profile ?? {}
    const next: PerceptionProfile = { ...current, hearing, generated_at: new Date().toISOString() }
    this.saveLocal(next)
    return next
  }

  /** Merge a vision profile into the local profile and persist. */
  updateVisionLocal(vision: VisionProfile): PerceptionProfile {
    const current = this.loadLocal().profile ?? {}
    const next: PerceptionProfile = { ...current, vision, generated_at: new Date().toISOString() }
    this.saveLocal(next)
    return next
  }

  /** Fetch from the backend, falling back to localStorage on failure. */
  async syncFromBackend(signal?: AbortSignal): Promise<ProfileState> {
    try {
      const remote = await fetchProfile(signal)
      this.saveLocal(remote)
      return { profile: remote, loaded: true, offline: false }
    } catch (error) {
      const local = this.loadLocal()
      return { ...local, offline: true }
    }
  }
}

export const profileService = new ProfileService()
