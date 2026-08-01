import { Check } from 'lucide-react'

import { cn } from '@/lib/utils'

export interface Step {
  id: string
  title: string
  description?: string
}

interface StepIndicatorProps {
  steps: Step[]
  current: string
  onSelect?: (id: string) => void
  /** Mark steps before the current one as complete. */
  allowNavigate?: boolean
}

/** Accessible, keyboard-operable step indicator. */
export function StepIndicator({
  steps,
  current,
  onSelect,
  allowNavigate = true,
}: StepIndicatorProps) {
  const currentIndex = steps.findIndex((s) => s.id === current)

  return (
    <ol className="flex flex-wrap items-center gap-2" aria-label="Progress">
      {steps.map((step, index) => {
        const isCurrent = step.id === current
        const isComplete = index < currentIndex
        const clickable = allowNavigate && (isCurrent || isComplete || onSelect)
        return (
          <li key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => clickable && onSelect?.(step.id)}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isCurrent
                  ? 'border-primary/40 bg-secondary text-foreground'
                  : isComplete
                    ? 'border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground'
                    : 'cursor-default border-border bg-card/50 text-muted-foreground/70',
              )}
            >
              <span
                className={cn(
                  'grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold',
                  isComplete || isCurrent
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {isComplete ? <Check className="h-3 w-3" /> : index + 1}
              </span>
              <span className="hidden sm:inline">
                {step.title}
                {step.description && (
                  <span className="ml-1 hidden text-muted-foreground md:inline">
                    — {step.description}
                  </span>
                )}
              </span>
            </button>
            {index < steps.length - 1 && (
              <span className="h-px w-4 bg-border" aria-hidden />
            )}
          </li>
        )
      })}
    </ol>
  )
}
