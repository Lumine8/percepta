import { useState } from 'react'

import { Button } from '@/components/shared/ui/button'
import { GlassCard } from '@/components/shared/GlassCard'
import type { NearVisionResult } from '@/models/vision'

const SENTENCE = 'Perception begins where sensation ends.'

/** Reading-card rows from largest to smallest; smaller text = better acuity. */
const NEAR_LEVELS = [
  { size: 20, snellen: '20/40' },
  { size: 16, snellen: '20/30' },
  { size: 13, snellen: '20/25' },
  { size: 10, snellen: '20/20' },
]

const WORST_SNELLEN = '20/50'

interface NearVisionTestProps {
  onComplete: (result: NearVisionResult) => void
}

/**
 * Near-vision reading test: four sentences at decreasing sizes. The user selects
 * the smallest line they can still read comfortably at arm's length (~40 cm).
 */
export function NearVisionTest({ onComplete }: NearVisionTestProps) {
  const [selected, setSelected] = useState<number | null>(null)
  const [done, setDone] = useState(false)

  const confirmSelection = () => {
    if (selected == null) return
    const level = NEAR_LEVELS[selected]
    setDone(true)
    onComplete({ snellen: level.snellen, correct: true })
  }

  if (done) {
    return (
      <GlassCard className="p-6">
        <p className="text-sm text-muted-foreground">
          Near vision test complete — generating your profile.
        </p>
      </GlassCard>
    )
  }

  return (
    <GlassCard className="p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Near vision (reading)</h3>
          <p className="text-sm text-muted-foreground">
            Hold the screen about 40 cm away. Click the <strong>smallest line</strong> you
            can still read comfortably.
          </p>
        </div>
        <span className="text-sm text-muted-foreground">Arm’s length ≈ 40 cm</span>
      </div>

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-background/40 p-6">
        {NEAR_LEVELS.map((level, i) => (
          <button
            key={level.snellen}
            type="button"
            aria-pressed={selected === i}
            onClick={() => setSelected(i)}
            className={`rounded-lg border px-4 py-3 text-left transition-colors ${
              selected === i
                ? 'border-emerald-400 bg-emerald-400/10'
                : 'border-border hover:border-emerald-400/50'
            }`}
          >
            <p style={{ fontSize: level.size }} className="leading-snug">
              {SENTENCE}
            </p>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          onClick={() => {
            setDone(true)
            onComplete({ snellen: WORST_SNELLEN, correct: false })
          }}
        >
          I can’t read the largest line
        </Button>
        <Button variant="default" disabled={selected == null} onClick={confirmSelection}>
          Confirm smallest readable line
        </Button>
      </div>
    </GlassCard>
  )
}
