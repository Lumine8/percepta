import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, RotateCcw } from 'lucide-react'

import { Button } from '@/components/shared/ui/button'
import { GlassCard } from '@/components/shared/GlassCard'
import { drawE } from '@/utils/letters'

const ROWS = [
  { snellen: '20/100', size: 340 },
  { snellen: '20/70', size: 240 },
  { snellen: '20/50', size: 170 },
  { snellen: '20/40', size: 135 },
  { snellen: '20/30', size: 105 },
  { snellen: '20/25', size: 85 },
  { snellen: '20/20', size: 70 },
  { snellen: '20/16', size: 56 },
]

const ORIENTATIONS = [
  { rotation: 0, label: 'pointing up', icon: ArrowUp },
  { rotation: 90, label: 'pointing right', icon: ArrowRight },
  { rotation: 180, label: 'pointing down', icon: ArrowDown },
  { rotation: 270, label: 'pointing left', icon: ArrowLeft },
]

interface AcuityTestProps {
  onComplete: (result: { last_readable_row: string; correct: boolean }) => void
}

/** Tumbling-E acuity test (each row shown one at a time, decreasing size). */
export function AcuityTest({ onComplete }: AcuityTestProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [rowIndex, setRowIndex] = useState(0)
  const [rotation, setRotation] = useState(0)
  const [trial, setTrial] = useState(0)
  const [done, setDone] = useState(false)
  const [lastCorrect, setLastCorrect] = useState<{ row: string; size: number } | null>(null)

  const row = ROWS[rowIndex]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const size = row.size
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    drawE(ctx, size, '#37352f', rotation)
  }, [row, rotation, trial])

  const respond = (rotationChoice: number) => {
    const correct = rotationChoice === rotation
    if (correct) {
      setLastCorrect({ row: row.snellen, size: row.size })
      if (rowIndex < ROWS.length - 1) {
        setRowIndex(rowIndex + 1)
        setRotation(Math.floor(Math.random() * 4) * 90)
        setTrial(trial + 1)
      } else {
        setDone(true)
        onComplete({ last_readable_row: row.snellen, correct: true })
      }
    } else {
      const result = lastCorrect ?? { row: ROWS[0].snellen, size: ROWS[0].size }
      setDone(true)
      onComplete({ last_readable_row: result.row, correct: false })
    }
  }

  if (done) {
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
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-semibold">Visual acuity</h3>
        <span className="text-sm text-muted-foreground">
          Row {rowIndex + 1}/{ROWS.length} · {row.snellen}
        </span>
      </div>
      <div className="flex flex-col items-center gap-6 rounded-lg border border-border bg-background/40 p-8">
        <canvas
          ref={canvasRef}
          width={380}
          height={280}
          className="max-w-full"
          aria-label="Tumbling E optotype. Which direction is it facing?"
        />
        <div className="grid grid-cols-4 gap-3">
          {ORIENTATIONS.map((o) => (
            <Button
              key={o.label}
              variant="outline"
              className="flex flex-col items-center gap-1"
              onClick={() => respond(o.rotation)}
              aria-label={`The E is ${o.label}`}
            >
              <o.icon className="h-6 w-6" />
              <span className="text-xs">{o.label}</span>
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Keep your normal reading distance (~40 cm) and one eye closed.
        </p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setRotation(Math.floor(Math.random() * 4) * 90)
            setTrial(trial + 1)
          }}
        >
          <RotateCcw /> Rotate optotype
        </Button>
      </div>
    </GlassCard>
  )
}
