import { useEffect, useRef, useState } from 'react'
import { Plus, RefreshCw } from 'lucide-react'

import { Button } from '@/components/shared/ui/button'
import { GlassCard } from '@/components/shared/GlassCard'
import { Label } from '@/components/shared/ui/label'
import { Input } from '@/components/shared/ui/input'

interface BlindSpotTestProps {
  onComplete: (result: {
    eye: string
    dots_missing: Array<{ x: number; y: number }>
    viewing_distance_cm: number
  }) => void
}

// Grid geometry (in "visual angle cm" units, where 57 cm distance ≈ 1°/cm).
const STEP_CM = 8
const RADIUS_STEPS = 2
const TEMPORAL_BIAS_CM = 16 // blind spot is ~15° temporal from fixation

// Canvas scale: pixels per cm on the 400×400 canvas.
const SCALE = 6
const CENTER = 200

interface Dot {
  x: number // cm
  y: number // cm
}

function buildDots(eye: 'left' | 'right'): Dot[] {
  const dots: Dot[] = []
  // Blind spot is temporal — toward the right for the left eye, left for right eye.
  const bias = eye === 'left' ? TEMPORAL_BIAS_CM : -TEMPORAL_BIAS_CM
  for (let gy = -RADIUS_STEPS; gy <= RADIUS_STEPS; gy++) {
    for (let gx = -RADIUS_STEPS; gx <= RADIUS_STEPS; gx++) {
      if (gx === 0 && gy === 0) continue
      const dist = Math.hypot(gx * STEP_CM, gy * STEP_CM)
      if (dist > RADIUS_STEPS * STEP_CM) continue
      dots.push({ x: gx * STEP_CM + bias, y: gy * STEP_CM })
    }
  }
  return dots
}

/**
 * Blind-spot mapping: fixate the center cross with one eye closed, then click
 * every dot that disappears from view. Dot positions are reported in
 * centimeters relative to fixation.
 */
export function BlindSpotTest({ onComplete }: BlindSpotTestProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [eye, setEye] = useState<'left' | 'right'>('left')
  const [distance, setDistance] = useState(57)
  const [missing, setMissing] = useState<Dot[]>([])

  const dots = buildDots(eye)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#0b0d1f'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    ctx.strokeStyle = '#22d3ee'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(CENTER - 14, CENTER)
    ctx.lineTo(CENTER + 14, CENTER)
    ctx.moveTo(CENTER, CENTER - 14)
    ctx.lineTo(CENTER, CENTER + 14)
    ctx.stroke()

    ctx.fillStyle = '#e7e9f5'
    for (const dot of dots) {
      if (missing.some((m) => m.x === dot.x && m.y === dot.y)) continue
      ctx.beginPath()
      ctx.arc(CENTER + dot.x * SCALE, CENTER + dot.y * SCALE, 4, 0, Math.PI * 2)
      ctx.fill()
    }
  }, [dots, missing, eye])

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const pxX = ((e.clientX - rect.left) / rect.width) * 400 - CENTER
    const pxY = ((e.clientY - rect.top) / rect.height) * 400 - CENTER
    const nearest = dots.find(
      (d) =>
        Math.abs(d.x * SCALE - pxX) < SCALE * 0.6 &&
        Math.abs(d.y * SCALE - pxY) < SCALE * 0.6,
    )
    if (nearest && !missing.some((m) => m.x === nearest.x && m.y === nearest.y)) {
      setMissing((prev) => [...prev, nearest])
    }
  }

  const finish = () => {
    onComplete({ eye, dots_missing: missing, viewing_distance_cm: distance })
  }

  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-semibold">Blind-spot mapping</h3>
        <div role="group" aria-label="Eye under test" className="flex gap-1 rounded-md border border-border p-1">
          {(['left', 'right'] as const).map((e) => (
            <button
              key={e}
              type="button"
              aria-pressed={eye === e}
              onClick={() => {
                setEye(e)
                setMissing([])
              }}
              className={`rounded px-2.5 py-1 text-sm ${eye === e ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
            >
              {e} eye
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Label htmlFor="viewing-distance">Viewing distance</Label>
        <Input
          id="viewing-distance"
          type="number"
          min={20}
          max={100}
          value={distance}
          onChange={(e) => setDistance(Number(e.target.value) || 57)}
          className="w-24"
        />
        <span className="text-sm text-muted-foreground">cm (57 ≈ 1° per cm)</span>
      </div>

      <div className="mt-4">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          onClick={handleClick}
          className="w-full rounded-lg border border-border"
          aria-label="Dot grid for blind spot mapping. Click any dot that disappears."
        />
        <p className="mt-3 text-sm text-muted-foreground">
          Cover your {eye === 'left' ? 'right' : 'left'} eye, fixate the cyan cross,
          and <strong>click every dot that disappears</strong>. Keep your head still.
        </p>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setMissing([])}>
          <RefreshCw /> Clear
        </Button>
        <Button variant="default" onClick={finish}>
          <Plus /> Finish mapping ({missing.length} dots)
        </Button>
      </div>
    </GlassCard>
  )
}
