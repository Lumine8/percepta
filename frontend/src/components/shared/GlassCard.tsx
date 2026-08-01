import { cn } from '@/lib/utils'

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Enable hover border highlight. */
  interactive?: boolean
  /** Keep for API compat; same flat surface as default. */
  gradient?: boolean
}

/** Flat, bordered card used across the app. */
export function GlassCard({
  className,
  interactive = false,
  gradient = false,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-border bg-card shadow-card',
        interactive && 'glass-hover',
        className,
      )}
      {...props}
    />
  )
}
