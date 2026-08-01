/**
 * Session-scoped test history.
 *
 * Each completed test (hearing ear, vision contrast/color/acuity/blind-spot)
 * is recorded here so the dashboard can show every result from the current
 * browser session. Backed by `sessionStorage`, so everything clears the moment
 * the tab or browser is closed.
 */

export type TestModule = 'hearing' | 'vision'

export interface TestResult {
  id: string
  module: TestModule
  /** Machine-readable test id: 'tone' | 'contrast' | 'color' | 'acuity' | 'blindspot' */
  test: string
  /** Human label, e.g. "Tone test — right ear". */
  label: string
  /** One-line summary, e.g. "mild · 32 dB average". */
  summary: string
  completedAt: string
  /** Structured payload for the specific test. */
  data: Record<string, unknown>
}

const STORAGE_KEY = 'percepta:test-results'

const makeId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

class TestResultsService {
  /** All test results recorded this session (newest first). */
  getResults(): TestResult[] {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? (parsed as TestResult[]).reverse() : []
    } catch {
      return []
    }
  }

  /** Record a completed test. */
  addResult(result: Omit<TestResult, 'id'>): TestResult {
    const entry: TestResult = { ...result, id: makeId() }
    try {
      const current = sessionStorage.getItem(STORAGE_KEY)
      const next = current ? [...JSON.parse(current), entry] : [entry]
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    } catch {
      /* storage unavailable — non-fatal */
    }
    return entry
  }

  /** Remove all session results (mainly for tests/clearing). */
  clear(): void {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch {
      /* non-fatal */
    }
  }
}

export const testResultsService = new TestResultsService()
