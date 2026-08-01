import { motion } from 'framer-motion'
import { Volume2, VolumeX } from 'lucide-react'
import { useCallback, useEffect, useReducer, useState } from 'react'

import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import { GlassCard } from '@/components/shared/GlassCard'
import { Progress } from '@/components/shared/ui/progress'
import { AudiogramChart } from '@/components/hearing/AudiogramChart'
import { useAudioTone } from '@/hooks/useAudioTone'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useProfile } from '@/hooks/useProfile'
import type { Ear } from '@/models/profile'
import { testResultsService } from '@/services/testResultsService'
import {
  createInitialState,
  FREQUENCIES,
  MAX_FALSE_POSITIVES,
  NO_RESPONSE_DB,
  reduceToneTest,
  rollCatch,
  type ToneTestState,
} from '@/services/toneTestEngine'
import { levelToAmplitude } from '@/utils/audio'

type Phase = 'idle' | 'presenting' | 'awaiting' | 'done'

interface UiState {
  engine: ToneTestState
  phase: Phase
  isCatch: boolean
  trialId: number
}

type UiEvent =
  | { type: 'begin' }
  | { type: 'present' }
  | { type: 'respond' }
  | { type: 'timeout' }
  | { type: 'reset' }

const RESPONSE_WINDOW_MS = 1400

const initialState = (): UiState => ({
  engine: createInitialState(FREQUENCIES),
  phase: 'idle',
  isCatch: false,
  trialId: 0,
})

function uiReducer(state: UiState, event: UiEvent): UiState {
  switch (event.type) {
    case 'begin':
      return state.phase === 'idle' || state.phase === 'done'
        ? { ...state, phase: 'presenting', trialId: state.trialId + 1 }
        : state
    case 'present':
      return state.phase === 'presenting'
        ? {
            ...state,
            phase: 'awaiting',
            isCatch: rollCatch(),
            trialId: state.trialId + 1,
          }
        : state
    case 'respond': {
      if (state.phase !== 'awaiting') return state
      const engine = reduceToneTest(state.engine, {
        type: 'heard',
        isCatch: state.isCatch,
      })
      return engine.done
        ? { ...state, engine, phase: 'done' }
        : { ...state, engine, phase: 'presenting', trialId: state.trialId + 1 }
    }
    case 'timeout': {
      if (state.phase !== 'awaiting') return state
      const engine = reduceToneTest(state.engine, {
        type: 'missed',
        isCatch: state.isCatch,
      })
      return engine.done
        ? { ...state, engine, phase: 'done' }
        : { ...state, engine, phase: 'presenting', trialId: state.trialId + 1 }
    }
    case 'reset':
      return initialState()
  }
}

/** In-browser Hughson–Westlake tone test producing a threshold audiogram. */
export function ToneTest() {
  const [state, dispatch] = useReducer(uiReducer, undefined, initialState)
  const [ear, setEar] = useState<Ear>('right')
  const { playTone } = useAudioTone()
  const { setHearing } = useProfile()
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [savedClassification, setSavedClassification] = useState<string | null>(null)

  const { engine, phase, isCatch } = state
  const running = phase === 'presenting' || phase === 'awaiting'
  const complete = phase === 'done'
  const currentFrequency = engine.currentFrequency
  const level = engine.level

  // Auto-advance the trial loop.
  useEffect(() => {
    if (phase === 'presenting') {
      const id = window.setTimeout(
        () => dispatch({ type: 'present' }),
        350 + Math.random() * 600,
      )
      return () => window.clearTimeout(id)
    }
    if (phase === 'awaiting') {
      const t0 = window.setTimeout(() => {
        if (!isCatch) playTone(currentFrequency, levelToAmplitude(level))
      }, 180)
      const t1 = window.setTimeout(() => dispatch({ type: 'timeout' }), 180 + RESPONSE_WINDOW_MS)
      return () => {
        window.clearTimeout(t0)
        window.clearTimeout(t1)
      }
    }
  }, [state.trialId, phase, isCatch, currentFrequency, level, playTone])

  // Persist results when the test completes.
  const persist = useCallback(() => {
    const audiogram = engine.thresholds
      .filter((t) => t.threshold_db !== null)
      .map((t) => ({ frequency: t.frequency, threshold_db: t.threshold_db as number }))
    if (audiogram.length === 0) return
    const averageLoss = Math.round(
      audiogram.reduce((sum, p) => sum + p.threshold_db, 0) / audiogram.length,
    )
    setSaving(true)
    setSaveError(null)
    setHearing({
      ear,
      audiogram,
      average_loss_db: 0,
      classification: 'normal',
      bands: {},
      completed_at: new Date().toISOString(),
    })
      .then((profile) => {
        const classification = profile.hearing?.classification
        if (classification) setSavedClassification(classification)
        testResultsService.addResult({
          module: 'hearing',
          test: 'tone',
          label: `Tone test — ${ear} ear`,
          summary: classification
            ? `${classification} · ${averageLoss} dB average`
            : `${averageLoss} dB average`,
          completedAt: new Date().toISOString(),
          data: { ear, audiogram },
        })
      })
      .catch(() => {
        setSaveError('Could not reach the backend — results kept locally.')
        testResultsService.addResult({
          module: 'hearing',
          test: 'tone',
          label: `Tone test — ${ear} ear`,
          summary: `${averageLoss} dB average`,
          completedAt: new Date().toISOString(),
          data: { ear, audiogram },
        })
      })
      .finally(() => setSaving(false))
  }, [engine.thresholds, ear, setHearing])

  useEffect(() => {
    if (complete && !saving && savedClassification === null && engine.thresholds.length > 0) {
      persist()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [complete])

  const respond = useCallback(() => dispatch({ type: 'respond' }), [])

  useKeyboardShortcuts([
    { key: ' ', label: 'Respond “I heard it”', action: respond, preventDefault: true, excludeWhenTyping: true },
  ], running)

  const freqProgress = (engine.freqIndex / FREQUENCIES.length) * 100

  const levelLabel = engine.unreliable
    ? 'Unreliable'
    : `${level} dB HL`

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold">Pure-tone screening</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Press the button (or <kbd className="rounded bg-secondary px-1">Space</kbd>) the
              moment you hear a tone. Some trials are silent — don’t press those.
            </p>
          </div>
          <div role="group" aria-label="Ear to test" className="flex items-center gap-1 rounded-lg border border-border p-1">
            {(['left', 'right'] as const).map((e) => (
              <button
                key={e}
                type="button"
                disabled={running}
                onClick={() => setEar(e)}
                aria-pressed={ear === e}
                className={`rounded-md px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed ${
                  ear === e ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
                }`}
              >
                {e === 'left' ? '←' : '→'} {e}
              </button>
            ))}
          </div>
        </div>

        {/* Live status */}
        {running && (
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Status label="Frequency" value={`${currentFrequency} Hz`} />
            <Status
              label="Level"
              value={levelLabel}
              icon={engine.unreliable ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            />
            <Status label="Progress" value={`${engine.freqIndex + 1} / ${FREQUENCIES.length}`} />
          </div>
        )}

        {running && (
          <motion.div
            initial={{ scale: 0.98, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="mt-6 flex flex-col items-center gap-4"
          >
            <Button
              size="lg"
              variant="default"
              onClick={respond}
              className="h-24 w-48 rounded-full text-base"
              aria-label="I heard the tone"
            >
              I heard it
              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">Space</span>
            </Button>
            <p className="text-xs text-muted-foreground">
              {isCatch
                ? 'Silent trial — only respond if you actually heard a tone.'
                : `Listening for a ${currentFrequency} Hz tone at ${level} dB…`}
            </p>
          </motion.div>
        )}

        {/* Start / results */}
        {!running && !complete && (
          <div className="mt-6 flex flex-col items-center gap-3 py-6">
            <Button size="lg" variant="default" onClick={() => dispatch({ type: 'begin' })}>
              Begin assessment
            </Button>
            <p className="text-xs text-muted-foreground">
              Uses your headphones/volume — a screening tool, not a medical diagnosis.
            </p>
          </div>
        )}

        {engine.unreliable && (
          <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            You responded to {engine.falsePositives} of {MAX_FALSE_POSITIVES} allowed silent
            trials. Results may be unreliable — please be honest about what you hear.
          </div>
        )}

        {running && (
          <div className="mt-4">
            <Progress value={freqProgress} aria-label="Assessment progress" />
          </div>
        )}

        {complete && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="success">Complete</Badge>
              {engine.unreliable && <Badge variant="warning">Unreliable responses</Badge>}
              {savedClassification && <Badge variant="success">Classification: {savedClassification}</Badge>}
              {saving && <Badge variant="secondary">Saving…</Badge>}
              {saveError && <Badge variant="destructive">{saveError}</Badge>}
            </div>
            <AudiogramChart
              audiogram={engine.thresholds
                .filter((t) => t.threshold_db !== null)
                .map((t) => ({ frequency: t.frequency, threshold_db: t.threshold_db as number }))}
              ear={ear}
            />
            <div className="flex flex-wrap gap-2">
              {engine.thresholds.map((t) => (
                <div key={t.frequency} className="rounded-lg border border-border bg-background/40 px-3 py-2 text-sm">
                  <span className="text-muted-foreground">{t.frequency} Hz</span>{' '}
                  <span className="font-medium">
                    {t.threshold_db === NO_RESPONSE_DB ? 'NR' : `${t.threshold_db} dB`}
                  </span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => dispatch({ type: 'reset' })}>
                Retest {ear} ear
              </Button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}

function Status({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 flex items-center gap-2 text-lg font-semibold">
        {icon}
        {value}
      </p>
    </div>
  )
}
