import { describe, expect, it } from 'vitest'

import {
  createInitialState,
  MAX_FALSE_POSITIVES,
  MAX_LEVEL,
  MIN_LEVEL,
  NO_RESPONSE_DB,
  reduceToneTest,
  rollCatch,
  START_LEVEL,
  STEP_DOWN,
  type ToneTestState,
} from '@/services/toneTestEngine'

/** Drive the staircase against a simulated "hearer" with a known threshold. */
function simulate(thresholdDb: number, frequencies?: number[]): ToneTestState {
  let state = createInitialState(frequencies)
  let iterations = 0
  while (!state.done && iterations < 300) {
    const heard = state.level >= thresholdDb
    state = reduceToneTest(state, { type: heard ? 'heard' : 'missed', isCatch: false }, frequencies)
    iterations++
  }
  return state
}

describe('toneTestEngine', () => {
  it('starts each frequency at the start level', () => {
    const state = createInitialState()
    expect(state.level).toBe(START_LEVEL)
    expect(state.currentFrequency).toBe(125)
    expect(state.done).toBe(false)
  })

  it('descends after a heard response and ascends after a miss', () => {
    let state = createInitialState()
    state = reduceToneTest(state, { type: 'heard', isCatch: false })
    expect(state.level).toBe(START_LEVEL - STEP_DOWN)
    expect(state.direction).toBe(-1)
    state = reduceToneTest(state, { type: 'missed', isCatch: false })
    expect(state.level).toBe(START_LEVEL - STEP_DOWN + 5)
    expect(state.direction).toBe(1)
  })

  it('never goes below the minimum level', () => {
    let state = { ...createInitialState(), level: MIN_LEVEL }
    state = reduceToneTest(state, { type: 'heard', isCatch: false })
    expect(state.level).toBe(MIN_LEVEL)
  })

  it('missing at the maximum level finalizes as no response', () => {
    let state = { ...createInitialState([1000]), level: MAX_LEVEL - 5 }
    state = reduceToneTest(state, { type: 'missed', isCatch: false }, [1000])
    expect(state.done).toBe(true)
    expect(state.thresholds[0].threshold_db).toBe(NO_RESPONSE_DB)
  })

  it('counts catch-trial false positives and flags unreliability', () => {
    let state = createInitialState()
    for (let i = 0; i < MAX_FALSE_POSITIVES - 1; i++) {
      state = reduceToneTest(state, { type: 'heard', isCatch: true })
    }
    expect(state.unreliable).toBe(false)
    state = reduceToneTest(state, { type: 'heard', isCatch: true })
    expect(state.unreliable).toBe(true)
  })

  it('missing a catch trial is harmless', () => {
    let state = createInitialState()
    state = reduceToneTest(state, { type: 'missed', isCatch: true })
    expect(state.falsePositives).toBe(0)
    expect(state.unreliable).toBe(false)
  })

  it('retest resets the current frequency progress', () => {
    let state = createInitialState()
    state = reduceToneTest(state, { type: 'heard', isCatch: false })
    expect(state.level).toBe(START_LEVEL - STEP_DOWN)
    state = reduceToneTest(state, { type: 'retest' })
    expect(state.level).toBe(START_LEVEL)
    expect(state.reversals).toEqual([])
  })

  it('estimates a threshold close to the simulated true threshold', () => {
    const threshold = 45
    const state = simulate(threshold)
    expect(state.done).toBe(true)
    const estimate = state.thresholds[0].threshold_db
    expect(estimate).not.toBeNull()
    expect(Math.abs((estimate as number) - threshold)).toBeLessThanOrEqual(15)
  })

  it('runs through all frequencies', () => {
    const state = simulate(25, [250, 500, 1000])
    expect(state.done).toBe(true)
    expect(state.thresholds).toHaveLength(3)
    expect(state.thresholds.map((t) => t.frequency)).toEqual([250, 500, 1000])
  })

  it('rollCatch returns a boolean', () => {
    const value = rollCatch()
    expect(typeof value).toBe('boolean')
  })
})
