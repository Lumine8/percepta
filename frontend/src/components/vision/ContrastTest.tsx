import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/shared/ui/button'
import { GlassCard } from '@/components/shared/GlassCard'
import type { ContrastFrequencyResult, ContrastResult } from '@/models/vision'

const CONTRAST_STEPS = [100, 30, 10, 3, 1]

/** Two spatial frequencies: coarse (low cpd) and fine (high cpd) gratings. */
const FREQUENCIES = [
  { cpd: 2, cycles: 4, label: 'Coarse stripes' },
  { cpd: 12, cycles: 18, label: 'Fine stripes' },
]

interface ContrastTestProps {
  onComplete: (result: ContrastResult) => void
}

export function thresholdFromTrials(visible: number[], missed: number): number {
  const last = visible[visible.length - 1] ?? CONTRAST_STEPS[0]
  return Math.max(1, Math.round(((last + missed) / 2) * 100) / 100)
}

/** Contrast-sensitivity grating detection across two spatial frequencies. */
export function ContrastTest({ onComplete }: ContrastTestProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [freqIndex, setFreqIndex] = useState(0)
  const [index, setIndex] = useState(0)
  const [visibleTrials, setVisibleTrials] = useState<number[]>([])
  const [allVisible, setAllVisible] = useState<number[]>([])
  const [freqThresholds, setFreqThresholds] = useState<ContrastFrequencyResult[]>([])
  const [phase, setPhase] = useState<'trial' | 'done'>('trial')

  const freq = FREQUENCIES[freqIndex]
  const contrast = CONTRAST_STEPS[index]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || phase === 'done') return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const w = canvas.width
    const h = canvas.height
    ctx.fillStyle = '#0b0d1f'
    ctx.fillRect(0, 0, w, h)

    // Square-ish grating at the current spatial frequency.
    const cycles = freq.cycles
    for (let x = 0; x < w; x++) {
      const c = contrast / 100
      const band = Math.floor((x / w) * cycles) % 2 === 0
      const lum = band ? 0.5 + (0.5 * c) / 2 : 0.5 - (0.5 * c) / 2
      ctx.fillStyle = `rgb(${Math.round(lum * 255)}, ${Math.round(lum * 255)}, ${Math.round(lum * 255)})`
      ctx.fillRect(x, 0, 1, h)
    }
  }, [contrast, freq, phase])

  const respond = (visible: boolean) => {
    if (phase === 'done') return
    const nextVisible = [...visibleTrials]
    const combinedAll = [...allVisible]
    let threshold: number | null = null

    if (visible) {
      nextVisible.push(contrast)
      combinedAll.push(contrast)
      if (index < CONTRAST_STEPS.length - 1) {
        setIndex(index + 1)
        setVisibleTrials(nextVisible)
        setAllVisible(combinedAll)
        return
      }
      threshold = contrast
    } else {
      threshold = thresholdFromTrials(visibleTrials, contrast)
    }
    setVisibleTrials(nextVisible)
    setAllVisible(combinedAll)

    const nextThresholds = [...freqThresholds, { cpd: freq.cpd, threshold_percent: threshold }]
    setFreqThresholds(nextThresholds)

    if (freqIndex < FREQUENCIES.length - 1) {
      setFreqIndex(freqIndex + 1)
      setIndex(0)
      setVisibleTrials([])
      return
    }

    setPhase('done')
    const headline = Math.max(...nextThresholds.map((t) => t.threshold_percent))
    onComplete({
      threshold_percent: headline,
      trials_visible: combinedAll,
      frequencies: nextThresholds,
    })
  }

  if (phase === 'done') {
    return (
      <GlassCard className="p-6">
        <p className="text-sm text-muted-foreground">
          Contrast test complete — continue to the next assessment.
        </p>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Contrast sensitivity</h3>
          <p className="text-sm text-muted-foreground">
            {freq.label} · 2 of {FREQUENCIES.length} frequencies
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          Contrast {contrast}% · trial {index + 1}/{CONTRAST_STEPS.length}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={320}
        height={160}
        className="w-full rounded-lg border border-border"
        aria-label={`${freq.label} grating at ${contrast} percent contrast`}
      />
      <p className="mt-3 text-sm text-muted-foreground">
        Do you see the stripes? (The pattern may be faint.)
      </p>
      <div className="mt-4 flex gap-3">
        <Button variant="default" onClick={() => respond(true)}>
          I see the stripes
        </Button>
        <Button variant="outline" onClick={() => respond(false)}>
          I can’t see them
        </Button>
      </div>
    </GlassCard>
  )
}
