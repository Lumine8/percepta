/**
 * Pure tone-assessment state machine (Hughson–Westlake staircase).
 *
 * This module has **zero DOM/audio dependencies** so it can be unit-tested in
 * isolation. The UI layer (ToneTest component) is responsible for tone playback
 * and timers; it just dispatches `heard` / `missed` events.
 *
 * Protocol (simplified Hughson–Westlake):
 * - Start each frequency at 40 dB.
 * - On *heard*: descend 10 dB. On *miss*: ascend 5 dB.
 * - Reversals are recorded at direction changes; threshold for a frequency is the
 *   mean of the final 3 reversals, rounded to 5 dB.
 * - Random catch trials (silence) detect guessing: too many false positives flag
 *   the run as unreliable.
 */

export const FREQUENCIES = [125, 250, 500, 1000, 2000, 4000, 8000]
export const START_LEVEL = 40
export const STEP_DOWN = 10
export const STEP_UP = 5
export const REVERSALS_REQUIRED = 4
export const THRESHOLD_REVERSALS = 3
export const MAX_LEVEL = 90
export const MIN_LEVEL = 0
export const MAX_FALSE_POSITIVES = 3
export const CATCH_PROBABILITY = 0.2
/** "No response" sentinel threshold for severe/profound loss. */
export const NO_RESPONSE_DB = 90

export interface ThresholdResult {
  frequency: number
  threshold_db: number | null
}

export interface ToneTestState {
  freqIndex: number
  level: number
  direction: -1 | 1
  reversals: number[]
  lastHeard: number | null
  falsePositives: number
  thresholds: ThresholdResult[]
  done: boolean
  unreliable: boolean
  currentFrequency: number
}

export type ToneEvent =
  | { type: 'heard'; isCatch: boolean }
  | { type: 'missed'; isCatch: boolean }
  | { type: 'retest' }

export function createInitialState(frequencies: number[] = FREQUENCIES): ToneTestState {
  return {
    freqIndex: 0,
    level: START_LEVEL,
    direction: -1,
    reversals: [],
    lastHeard: null,
    falsePositives: 0,
    thresholds: [],
    done: false,
    unreliable: false,
    currentFrequency: frequencies[0] ?? 0,
  }
}

/** Roll a catch trial with the configured probability. */
export function rollCatch(): boolean {
  return Math.random() < CATCH_PROBABILITY
}

function roundTo5(value: number): number {
  return Math.round(value / 5) * 5
}

function finalizeFrequency(state: ToneTestState, frequencies: number[]): ToneTestState {
  const reversals = state.reversals.slice(-THRESHOLD_REVERSALS)
  const threshold =
    reversals.length > 0
      ? Math.min(
          NO_RESPONSE_DB,
          Math.max(MIN_LEVEL, roundTo5(reversals.reduce((a, b) => a + b, 0) / reversals.length)),
        )
      : NO_RESPONSE_DB

  const thresholds = [
    ...state.thresholds,
    { frequency: state.currentFrequency, threshold_db: threshold },
  ]

  const nextIndex = state.freqIndex + 1
  if (nextIndex >= frequencies.length) {
    return {
      ...state,
      thresholds,
      done: true,
    }
  }

  return {
    ...state,
    freqIndex: nextIndex,
    currentFrequency: frequencies[nextIndex],
    level: START_LEVEL,
    direction: -1,
    reversals: [],
    lastHeard: null,
    thresholds,
  }
}

export function reduceToneTest(
  state: ToneTestState,
  event: ToneEvent,
  frequencies: number[] = FREQUENCIES,
): ToneTestState {
  if (state.done) return state

  // A retest resets the current frequency's progress.
  if (event.type === 'retest') {
    return {
      ...state,
      level: START_LEVEL,
      direction: -1,
      reversals: [],
      lastHeard: null,
    }
  }

  if (event.type === 'heard') {
    if (event.isCatch) {
      const falsePositives = state.falsePositives + 1
      const unreliable = state.unreliable || falsePositives >= MAX_FALSE_POSITIVES
      return {
        ...state,
        falsePositives,
        unreliable,
        // Mark an unreliable catch-responder's threshold as no-response.
        ...(unreliable && !state.done
          ? { level: MAX_LEVEL, lastHeard: null, reversals: [] }
          : {}),
      }
    }

    let reversals = state.reversals
    let direction: -1 | 1 = -1
    if (state.direction === 1) {
      // Reversal: we were ascending and finally heard a tone again.
      reversals = [...state.reversals, state.level]
      direction = -1
    }
    let level = state.level - STEP_DOWN
    if (level < MIN_LEVEL) level = MIN_LEVEL
    const next: ToneTestState = {
      ...state,
      level,
      direction,
      reversals,
      lastHeard: state.level,
    }
    return maybeFinalize(next, frequencies)
  }

  // 'missed'
  if (event.isCatch) return state // missing a catch trial is the correct behavior

  let reversals = state.reversals
  let direction: -1 | 1 = 1
  if (state.direction === -1) {
    // Reversal: descending and the user stopped hearing. Record the last level
    // they *did* hear; if they never heard anything, treat it as no-response.
    reversals = [...state.reversals, state.lastHeard ?? NO_RESPONSE_DB]
    direction = 1
  }
  let level = state.level + STEP_UP
  if (level > MAX_LEVEL) level = MAX_LEVEL
  const next: ToneTestState = {
    ...state,
    level,
    direction,
    reversals,
    lastHeard: state.lastHeard,
  }
  return maybeFinalize(next, frequencies)
}

function maybeFinalize(state: ToneTestState, frequencies: number[]): ToneTestState {
  const terminalLevel =
    state.reversals.length >= REVERSALS_REQUIRED ||
    state.level >= MAX_LEVEL ||
    state.level <= MIN_LEVEL
  if (terminalLevel && state.reversals.length > 0) {
    return finalizeFrequency(state, frequencies)
  }
  return state
}
