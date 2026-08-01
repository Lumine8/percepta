import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/shared/ui/button'
import { GlassCard } from '@/components/shared/GlassCard'
import type { ColorPlateResult } from '@/models/vision'
import { DIGIT_GLYPHS } from '@/utils/letters'

export interface PlateDef {
  id: string
  expected: number
  kind: 'rg' | 'by'
}

export const PLATES: PlateDef[] = [
  { id: 'rg_1', expected: 3, kind: 'rg' },
  { id: 'rg_2', expected: 7, kind: 'rg' },
  { id: 'rg_3', expected: 2, kind: 'rg' },
  { id: 'rg_4', expected: 6, kind: 'rg' },
  { id: 'rg_5', expected: 9, kind: 'rg' },
  { id: 'rg_6', expected: 4, kind: 'rg' },
  { id: 'by_1', expected: 5, kind: 'by' },
  { id: 'by_2', expected: 8, kind: 'by' },
  { id: 'by_3', expected: 2, kind: 'by' },
  { id: 'by_4', expected: 7, kind: 'by' },
]

/** Fisher–Yates shuffle so plate order differs per session. */
function shuffle<T>(input: T[]): T[] {
  const arr = [...input]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const BG_RG = ['#3f7a3a', '#35702f', '#2c6a2c', '#468a40', '#4a6a3a', '#4f6a4f']
const FG_RG = ['#c0562e', '#b04828', '#a53a22']
const BG_BY = ['#3a5a9a', '#2f4a8a', '#274078', '#4a6a9a']
const FG_BY = ['#d8b840', '#c8a834', '#b89a28']
const NEUTRALS = ['#707070', '#808080', '#606060']

/** Deterministic PRNG so plates are stable across re-renders. */
function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Draw a plate: dot matrix with an embedded confusion-color digit. */
function drawPlate(
  canvas: HTMLCanvasElement,
  expected: number,
  kind: 'rg' | 'by',
): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const w = canvas.width
  const h = canvas.height
  ctx.fillStyle = '#0b0d1f'
  ctx.fillRect(0, 0, w, h)

  const rand = mulberry32(expected * 7919 + (kind === 'rg' ? 1 : 2))
  const bgPalette = kind === 'rg' ? BG_RG : BG_BY
  const fgPalette = kind === 'rg' ? FG_RG : FG_BY
  const pick = (arr: string[]) => arr[Math.floor(rand() * arr.length)]
  const glyph = DIGIT_GLYPHS[String(expected)]
  const cell = 30
  const gx = w / 2 - (5 * cell) / 2
  const gy = h / 2 - (7 * cell) / 2

  const inDigit = (x: number, y: number): boolean => {
    const col = Math.floor((x - gx) / cell)
    const row = Math.floor((y - gy) / cell)
    if (col < 0 || col >= 5 || row < 0 || row >= 7) return false
    return glyph[row][col] === '1'
  }

  const r = 7
  const spacing = 13
  for (let y = r; y < h - r; y += spacing) {
    for (let x = r; x < w - r; x += spacing) {
      const jitter = (rand() - 0.5) * 6
      const cx = x + jitter
      const cy = y + (rand() - 0.5) * 6
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      const color = inDigit(cx, cy)
        ? pick(fgPalette)
        : rand() < 0.15
          ? pick(NEUTRALS)
          : pick(bgPalette)
      ctx.fillStyle = color
      ctx.fill()
    }
  }
}

interface ColorTestProps {
  onComplete: (plates: ColorPlateResult[]) => void
}

/** Ishihara-style plate battery for color perception screening. */
export function ColorTest({ onComplete }: ColorTestProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [order] = useState<PlateDef[]>(() => shuffle(PLATES))
  const [index, setIndex] = useState(0)
  const [answers, setAnswers] = useState<ColorPlateResult[]>([])
  const [done, setDone] = useState(false)

  const plate = order[index]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    drawPlate(canvas, plate.expected, plate.kind)
  }, [plate])

  const answer = useCallback(
    (reported: number | null) => {
      const result: ColorPlateResult = {
        id: plate.id,
        reported,
        expected: plate.expected,
      }
      const next = [...answers, result]
      if (index < order.length - 1) {
        setIndex(index + 1)
      } else {
        setDone(true)
        onComplete(next)
      }
      setAnswers(next)
    },
    [answers, index, onComplete, plate, order.length],
  )

  if (done) {
    return (
      <GlassCard className="p-6">
        <p className="text-sm text-muted-foreground">
          Color test complete — continue to the next assessment.
        </p>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Color perception</h3>
        <span className="text-sm text-muted-foreground">
          Plate {index + 1}/{order.length}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={300}
        height={220}
        className="w-full rounded-lg border border-border"
        aria-label={`Color plate showing a number`}
      />
      <p className="mt-3 text-sm text-muted-foreground">
        What number do you see? (Select “None” if no number is visible.)
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {Array.from({ length: 10 }, (_, i) => (
          <Button
            key={i}
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={() => answer(i)}
            aria-label={`I see the number ${i}`}
          >
            {i}
          </Button>
        ))}
        <Button variant="ghost" onClick={() => answer(null)}>
          None
        </Button>
      </div>
    </GlassCard>
  )
}
