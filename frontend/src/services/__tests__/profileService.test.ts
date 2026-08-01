import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { profileService } from '@/services/profileService'
import type { HearingProfile } from '@/models/profile'

const HEARING: HearingProfile = {
  ear: 'right',
  audiogram: [
    { frequency: 250, threshold_db: 15 },
    { frequency: 1000, threshold_db: 25 },
  ],
  average_loss_db: 20,
  classification: 'normal',
  bands: { low: 'normal', mid: 'mild', high: 'normal' },
  completed_at: '2026-08-01T12:00:00Z',
}

describe('profileService', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('returns an empty state when nothing is stored', () => {
    const state = profileService.loadLocal()
    expect(state.profile).toBeNull()
    expect(state.loaded).toBe(true)
  })

  it('persists and reloads a hearing profile locally', () => {
    profileService.updateHearingLocal(HEARING)
    const state = profileService.loadLocal()
    expect(state.profile?.hearing?.classification).toBe('normal')
    expect(state.profile?.hearing?.audiogram).toHaveLength(2)
  })

  it('merges a vision profile without clobbering the hearing profile', () => {
    profileService.updateHearingLocal(HEARING)
    profileService.updateVisionLocal({
      color_perception: { deficiency: 'deuteranomaly' },
      completed_at: '2026-08-01T12:10:00Z',
    })
    const state = profileService.loadLocal()
    expect(state.profile?.hearing?.classification).toBe('normal')
    expect(state.profile?.vision?.color_perception.deficiency).toBe('deuteranomaly')
  })

  it('falls back to local data when the backend is unreachable', async () => {
    profileService.updateHearingLocal(HEARING)
    globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('fetch failed'))
    const state = await profileService.syncFromBackend()
    expect(state.offline).toBe(true)
    expect(state.profile?.hearing?.classification).toBe('normal')
  })

  it('adopts remote data when the backend responds', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          hearing: { ...HEARING, classification: 'mild' },
          generated_at: '2026-08-01T12:00:00Z',
        }),
    })
    const state = await profileService.syncFromBackend()
    expect(state.offline).toBe(false)
    expect(state.profile?.hearing?.classification).toBe('mild')
  })
})
