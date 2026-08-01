import { useEffect, useRef, useState } from 'react'

import { Button } from '@/components/shared/ui/button'
import { GlassCard } from '@/components/shared/GlassCard'

const CONTRAST_STEPS = [100, 30, 10, 3, 1]

interface ContrastTestProps {
  onComplete: (result: { threshold_percent: number; trials_visible: number[] }) => void
}

/** Contrast-sensitivity grating detection (Michelson contrast descending). */
export function ContrastTest({ onComplete }: ContrastTestProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [index, setIndex] = useState(0)
  const [visibleTrials, setVisibleTrials] = useState<number[]>([])
  const [phase, setPhase] = useState<'trial' | 'done'>('trial')

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

    // 4 cycles of a square-ish grating (easier to detect than sine at small sizes).
    const cycles = 4
    for (let x = 0; x < w; x++) {
      const c = contrast / 100
      const band = Math.floor((x / w) * cycles) % 2 === 0
      const lum = band
        ? 0.5 + (0.5 * c) / 2
        : 0.5 - (0.5 * c) / 2
      ctx.fillStyle = `rgb(${Math.round(lum * 255)}, ${Math.round(lum * 255)}, ${Math.round(lum * 255)})`
      ctx.fillRect(x, 0, 1, h)
    }
  }, [contrast, phase])

  const respond = (visible: boolean) => {
    const nextVisible = [...visibleTrials]
    if (visible) {
      nextVisible.push(contrast)
      if (index < CONTRAST_STEPS.length - 1) {
        setIndex(index + 1)
      } else {
        setPhase('done')
        onComplete({ threshold_percent: contrast, trials_visible: nextVisible })
      }
    } else {
      // Threshold is interpolated between last seen and this missed contrast.
      const last = visibleTrials[visibleTrials.length - 1] ?? CONTRAST_STEPS[0]
      const threshold = Math.max(1, Math.round(((last + contrast) / 2) * 100) / 100)
      setPhase('done')
      onComplete({ threshold_percent: threshold, trials_visible: nextVisible })
    }
    setVisibleTrials(nextVisible)
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
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Contrast sensitivity</h3>
        <span className="text-sm text-muted-foreground">
          Contrast {contrast}% · trial {index + 1}/{CONTRAST_STEPS.length}
        </span>
      </div>
      <canvas
        ref={canvasRef}
        width={320}
        height={160}
        className="w-full rounded-lg border border-border"
        aria-label={`Grating at ${contrast} percent contrast`}
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
