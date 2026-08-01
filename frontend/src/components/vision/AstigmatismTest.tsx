import { useEffect, useRef, useState } from 'react'
import { Eye } from 'lucide-react'

import { Button } from '@/components/shared/ui/button'
import { GlassCard } from '@/components/shared/GlassCard'
import type { AstigmatismResult } from '@/models/vision'

const ANGLES = Array.from({ length: 12 }, (_, i) => i * 15) // 0°..165°

const CANVAS = 360
const CENTER = CANVAS / 2
const R_INNER = 70
const R_OUTER = 158

interface AstigmatismTestProps {
  onComplete: (result: AstigmatismResult) => void
}

export function circularMean180(angles: number[]): number {
  let s = 0
  let c = 0
  for (const a of angles) {
    s += Math.sin((2 * a * Math.PI) / 180)
    c += Math.cos((2 * a * Math.PI) / 180)
  }
  let mean = Math.atan2(s, c) / 2
  mean = ((mean * 180) / Math.PI + 180) % 180
  return Math.round(mean * 10) / 10
}

/**
 * Astigmatism fan test: a sunburst of 12 radial spokes. Astigmatic eyes report
 * that some spokes appear darker/blurrier than others. The user flags the
 * blurriest direction(s) to estimate the blur axis.
 */
export function AstigmatismTest({ onComplete }: AstigmatismTestProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stage, setStage] = useState<'chart' | 'pick' | 'done'>('chart')
  const [selected, setSelected] = useState<number[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#0b0d1f'
    ctx.fillRect(0, 0, CANVAS, CANVAS)

    ctx.strokeStyle = '#d9dce8'
    ctx.lineWidth = 3
    ctx.lineCap = 'round'
    for (const angle of ANGLES) {
      const theta = (angle * Math.PI) / 180
      ctx.beginPath()
      ctx.moveTo(CENTER + R_INNER * Math.cos(theta), CENTER + R_INNER * Math.sin(theta))
      ctx.lineTo(CENTER + R_OUTER * Math.cos(theta), CENTER + R_OUTER * Math.sin(theta))
      ctx.stroke()
    }

    ctx.fillStyle = '#34d399'
    ctx.beginPath()
    ctx.arc(CENTER, CENTER, 5, 0, Math.PI * 2)
    ctx.fill()
  }, [])

  const toggle = (angle: number) => {
    setSelected((prev) =>
      prev.includes(angle) ? prev.filter((a) => a !== angle) : [...prev, angle],
    )
  }

  const finish = () => {
    if (stage === 'chart') return
    const symmetric = selected.length >= 6
    const axis = symmetric ? 0 : circularMean180(selected)
    const blur_score = Math.min(1, 0.6 + 0.4 * (selected.length / ANGLES.length))
    setStage('done')
    onComplete({ axis_blurred: axis, blur_score, symmetric })
  }

  if (stage === 'done') {
    return (
      <GlassCard className="p-6">
        <p className="text-sm text-muted-foreground">
          Astigmatism test complete — continue to the next assessment.
        </p>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Astigmatism fan test</h3>
          <p className="text-sm text-muted-foreground">
            Hold the screen ~40 cm away, cover one eye, and focus on the center dot.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">
          {stage === 'chart' ? 'Observe the spokes' : 'Mark the blurriest spokes'}
        </span>
      </div>

      <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-background/40 p-6">
        <canvas
          ref={canvasRef}
          width={CANVAS}
          height={CANVAS}
          className="max-w-full"
          aria-label="Radial sunburst of twelve spokes for the astigmatism fan test"
        />
        <p className="text-sm text-muted-foreground">
          Do some spokes look <strong>darker or blurrier</strong> than the others?
        </p>

        {stage === 'chart' ? (
          <div className="flex gap-3">
            <Button variant="default" onClick={() => setStage('pick')}>
              <Eye /> Yes, some are blurred
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setStage('done')
                onComplete({ axis_blurred: 0, blur_score: 0.1, symmetric: false })
              }}
            >
              No, they look equal
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <div className="relative h-[280px] w-[280px]">
              {ANGLES.map((angle) => {
                const theta = (angle * Math.PI) / 180
                const x = 140 + 112 * Math.cos(theta)
                const y = 140 + 112 * Math.sin(theta)
                const active = selected.includes(angle)
                return (
                  <button
                    key={angle}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggle(angle)}
                    className={`absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[10px] font-semibold transition-colors ${
                      active
                        ? 'bg-emerald-400 text-emerald-950'
                        : 'border border-border bg-background/60 text-muted-foreground hover:border-emerald-400/50'
                    }`}
                    style={{ left: x, top: y }}
                  >
                    {angle}°
                  </button>
                )
              })}
            </div>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={() => setStage('chart')}>
                Back
              </Button>
              <Button variant="default" disabled={selected.length === 0} onClick={finish}>
                Confirm ({selected.length} selected)
              </Button>
            </div>
          </div>
        )}
      </div>
    </GlassCard>
  )
}
