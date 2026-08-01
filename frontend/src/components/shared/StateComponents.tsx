import { motion } from 'framer-motion'
import { AlertCircle, Loader2 } from 'lucide-react'

import { Button } from '@/components/shared/ui/button'

export function LoadingState({ label = 'Processing…' }: { label?: string }) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground"
    >
      <Loader2 className="h-8 w-8 animate-spin text-brand-violet" />
      <p className="text-sm">{label}</p>
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  compact?: boolean
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, compact }: ErrorStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      role="alert"
      className={
        compact
          ? 'flex items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm'
          : 'flex flex-col items-center gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-8 text-center'
      }
    >
      <AlertCircle className="h-6 w-6 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </motion.div>
  )
}
