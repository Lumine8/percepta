import { useRef, useState } from 'react'
import { ChevronsLeftRight } from 'lucide-react'

interface CompareSliderProps {
  before: string
  after: string
  labels?: [string, string]
  className?: string
}

/**
 * Before/after image comparison with a draggable reveal slider.
 * Accessible via an invisible range input that drives the split position.
 */
export function CompareSlider({ before, after, labels = ['Original', 'Enhanced'], className }: CompareSliderProps) {
  const [position, setPosition] = useState(50)
  const containerRef = useRef<HTMLDivElement>(null)

  return (
    <div className={className}>
      <div
        ref={containerRef}
        className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-background/40 select-none"
      >
        <img src={before} alt={labels[0]} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <img src={after} alt={labels[1]} className="absolute inset-0 h-full w-full object-contain" draggable={false} />
        </div>

        {/* Divider + handle */}
        <div className="pointer-events-none absolute inset-y-0" style={{ left: `${position}%` }}>
          <div className="h-full w-0.5 bg-primary" />
          <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 grid h-9 w-9 place-items-center rounded-full border border-border bg-background">
            <ChevronsLeftRight className="h-4 w-4 text-primary" />
          </div>
        </div>

        <span className="pointer-events-none absolute left-3 top-3 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white">
          {labels[0]}
        </span>
        <span className="pointer-events-none absolute right-3 top-3 rounded-md bg-black/60 px-2 py-0.5 text-xs text-white">
          {labels[1]}
        </span>

        <input
          type="range"
          min={0}
          max={100}
          value={position}
          aria-label={`Compare ${labels[0]} and ${labels[1]}`}
          onChange={(e) => setPosition(Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
        />
      </div>
    </div>
  )
}
