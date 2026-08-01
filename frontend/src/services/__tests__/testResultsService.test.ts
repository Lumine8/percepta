import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { testResultsService, type TestResult } from '@/services/testResultsService'

const RESULT: Omit<TestResult, 'id'> = {
  module: 'hearing',
  test: 'tone',
  label: 'Tone test — right ear',
  summary: 'mild · 32 dB average',
  completedAt: '2026-08-01T12:00:00Z',
  data: { ear: 'right', audiogram: [{ frequency: 1000, threshold_db: 25 }] },
}

describe('testResultsService', () => {
  beforeEach(() => {
    testResultsService.clear()
  })

  afterEach(() => {
    testResultsService.clear()
  })

  it('returns nothing when no tests have been recorded', () => {
    expect(testResultsService.getResults()).toEqual([])
  })

  it('records a completed test and returns it newest-first', () => {
    testResultsService.addResult(RESULT)
    testResultsService.addResult({ ...RESULT, label: 'Tone test — left ear' })

    const results = testResultsService.getResults()
    expect(results).toHaveLength(2)
    expect(results[0].label).toBe('Tone test — left ear')
    expect(results[1].label).toBe('Tone test — right ear')
  })

  it('preserves the structured data payload', () => {
    testResultsService.addResult(RESULT)
    const result = testResultsService.getResults()[0]
    expect(result.data).toEqual(RESULT.data)
  })

  it('scopes persistence to the session (sessionStorage, not localStorage)', () => {
    testResultsService.addResult(RESULT)
    expect(sessionStorage.getItem('percepta:test-results')).not.toBeNull()
    expect(localStorage.getItem('percepta:test-results')).toBeNull()
  })

  it('clears all session results', () => {
    testResultsService.addResult(RESULT)
    testResultsService.clear()
    expect(testResultsService.getResults()).toEqual([])
  })
})
