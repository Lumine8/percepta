import { useCallback, useEffect, useRef, useState } from 'react'
import { RotateCcw } from 'lucide-react'

import { Button } from '@/components/shared/ui/button'
import { GlassCard } from '@/components/shared/GlassCard'
import type { EyeAcuityResult } from '@/models/vision'

/** Sloan optotypes used on the chart (high legibility, no confusable pairs). */
const SLOAN_LETTERS = ['C', 'D', 'H', 'K', 'N', 'O', 'R', 'S', 'V', 'Z']

/** Decimal acuity per Snellen row (mirrors backend `_SNELLEN_ROWS`). */
const SNELLEN_DECIMAL: Record<string, number> = {
  '20/200': 0.1,
  '20/100': 0.2,
  '20/70': 0.29,
  '20/50': 0.4,
  '20/40': 0.5,
  '20/30': 0.67,
  '20/25': 0.8,
  '20/20': 1.0,
  '20/16': 1.25,
}

/** Chart rows, largest first. `size` is the on-screen letter height in px. */
const ROWS = [
  { snellen: '20/200', size: 120 },
  { snellen: '20/100', size: 88 },
  { snellen: '20/70', size: 64 },
  { snellen: '20/50', size: 50 },
  { snellen: '20/40', size: 42 },
  { snellen: '20/30', size: 33 },
  { snellen: '20/25', size: 27 },
  { snellen: '20/20', size: 22 },
  { snellen: '20/16', size: 18 },
]

const CANVAS_W = 460
const CANVAS_H = 200
const PASS_MATCHES = 3 // read ≥3 of 5 letters to pass a row

type EyePhase = 'right' | 'left'

interface AcuityTestProps {
  onComplete: (result: {
    last_readable_row: string
    correct: boolean
    left: EyeAcuityResult | null
    right: EyeAcuityResult | null
  }) => void
}

function randomLetters(): string[] {
  const pool = [...SLOAN_LETTERS]
  const out: string[] = []
  for (let i = 0; i < 5; i++) {
    const idx = Math.floor(Math.random() * pool.length)
    out.push(pool.splice(idx, 1)[0])
  }
  return out
}

export function logmar(snellen: string): number {
  const decimal = SNELLEN_DECIMAL[snellen] ?? 0.1
  return Math.round(Math.log10(1 / decimal) * 100) / 100
}

export function betterEye(a: EyeAcuityResult | null, b: EyeAcuityResult | null): EyeAcuityResult | null {
  const candidates = [a, b].filter(Boolean) as EyeAcuityResult[]
  if (candidates.length === 0) return null
  return candidates.reduce((best, c) =>
    SNELLEN_DECIMAL[c.snellen] > SNELLEN_DECIMAL[best.snellen] ? c : best,
  )
}

/**
 * Full Snellen letter chart: each eye reads descending rows of 5 Sloan letters,
 * typing the letters they see on the keypad below. A row passes when ≥3 of the
 * 5 letters match; the last passed row becomes that eye's acuity.
 */
export function AcuityTest({ onComplete }: AcuityTestProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<EyePhase | 'done'>('right')
  const [rowIndex, setRowIndex] = useState(0)
  const [rowLetters, setRowLetters] = useState<string[]>(() => randomLetters())
  const [selected, setSelected] = useState<string[]>([])
  const [lastReadable, setLastReadable] = useState<string | null>(null)
  const [shown, setShown] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [eyeResults, setEyeResults] = useState<{
    right: EyeAcuityResult | null
    left: EyeAcuityResult | null
  }>({ right: null, left: null })

  const row = ROWS[rowIndex]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#0b0d1f'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
    ctx.fillStyle = '#e7e9f5'
    ctx.font = `700 ${row.size}px Arial, Helvetica, sans-serif`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    const spacing = row.size * 0.8
    rowLetters.forEach((letter, i) => {
      ctx.fillText(letter, CANVAS_W / 2 + (i - 2) * spacing, CANVAS_H / 2)
    })
  }, [row, rowLetters])

  const resetEye = useCallback(() => {
    setRowIndex(0)
    setRowLetters(randomLetters())
    setSelected([])
    setLastReadable(null)
    setShown(0)
    setCorrectCount(0)
  }, [])

  const finalizeEye = useCallback(
    (bestRow: string | null, extraShown = 0, extraCorrect = 0) => {
      const result: EyeAcuityResult = {
        snellen: bestRow ?? ROWS[0].snellen,
        logmar: logmar(bestRow ?? ROWS[0].snellen),
        correct: bestRow != null,
        letters_shown: shown + extraShown,
        letters_correct: correctCount + extraCorrect,
      }
      const next = { ...eyeResults, [phase as EyePhase]: result }
      setEyeResults(next)
      if (phase === 'right') {
        setPhase('left')
        resetEye()
      } else {
        const headline = betterEye(next.right, next.left)
        setPhase('done')
        onComplete({
          last_readable_row: headline?.snellen ?? ROWS[0].snellen,
          correct: headline != null,
          left: next.left,
          right: next.right,
        })
      }
    },
    [correctCount, eyeResults, onComplete, phase, resetEye, shown],
  )

  const submitRow = (forceFail = false) => {
    if (phase === 'done') return
    if (forceFail) {
      finalizeEye(lastReadable)
      return
    }
    const matches = rowLetters.filter((l) => selected.includes(l)).length
    if (matches < PASS_MATCHES) {
      finalizeEye(lastReadable)
      return
    }
    const nextShown = shown + rowLetters.length
    const nextCorrect = correctCount + matches
    setShown(nextShown)
    setCorrectCount(nextCorrect)
    if (rowIndex < ROWS.length - 1) {
      setLastReadable(row.snellen)
      setRowIndex(rowIndex + 1)
      setRowLetters(randomLetters())
      setSelected([])
    } else {
      finalizeEye(row.snellen, rowLetters.length, matches)
    }
  }

  const toggleLetter = (letter: string) => {
    if (phase === 'done') return
    setSelected((prev) =>
      prev.includes(letter) ? prev.filter((l) => l !== letter) : [...prev, letter],
    )
  }

  if (phase === 'done') {
    return (
      <GlassCard className="p-6">
        <p className="text-sm text-muted-foreground">
          Acuity test complete — continue to the next assessment.
        </p>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Visual acuity</h3>
          <p className="text-sm text-muted-foreground">
            {phase === 'right'
              ? 'Cover your left eye and read with your right.'
              : 'Cover your right eye and read with your left.'}
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {phase} eye · Row {rowIndex + 1}/{ROWS.length} · {row.snellen}
        </span>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-background/40 p-6">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="max-w-full"
          aria-label={`Row ${rowIndex + 1}: five letters at ${row.snellen}`}
        />
        <p className="text-sm text-muted-foreground">
          Type the letters you can see on this row.
        </p>
        <div className="grid grid-cols-10 gap-2">
          {SLOAN_LETTERS.map((letter) => (
            <button
              key={letter}
              type="button"
              aria-pressed={selected.includes(letter)}
              disabled={selected.length >= 5 && !selected.includes(letter)}
              onClick={() => toggleLetter(letter)}
              className={`h-10 w-10 rounded-md border text-sm font-semibold transition-colors ${
                selected.includes(letter)
                  ? 'border-emerald-400 bg-emerald-400/20 text-emerald-300'
                  : 'border-border bg-background/40 text-foreground hover:border-emerald-400/50'
              }`}
            >
              {letter}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button
            variant="default"
            disabled={selected.length === 0}
            onClick={() => submitRow(false)}
          >
            Submit row ({selected.length} selected)
          </Button>
          <Button variant="outline" onClick={() => submitRow(true)}>
            I can’t read this row
          </Button>        </div>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Keep your normal reading distance (~40 cm) and hold the screen steady.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setRowLetters(randomLetters())
            setSelected([])
          }}
        >
          <RotateCcw /> New letters
        </Button>
      </div>
    </GlassCard>
  )
}
