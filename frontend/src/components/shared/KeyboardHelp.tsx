import { useState } from 'react'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/shared/ui/dialog'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

const SHORTCUTS = [
  { keys: 'Space', action: 'Respond “I heard it” in the tone test' },
  { keys: '← / →', action: 'Previous / next step in workspaces' },
  { keys: '1', action: 'Switch to the Hearing workspace' },
  { keys: '2', action: 'Switch to the Vision workspace' },
  { keys: '?', action: 'Toggle this help dialog' },
  { keys: 'Esc', action: 'Close dialogs / stop' },
]

/** Global keyboard-shortcut help, toggled with `?`. */
export function KeyboardHelp() {
  const [open, setOpen] = useState(false)

  useKeyboardShortcuts([
    { key: '?', label: 'Toggle keyboard help', action: () => setOpen((o) => !o), excludeWhenTyping: true },
  ])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Keyboard shortcuts</DialogTitle>
          <DialogDescription>
            Percepta is designed to be fully keyboard-usable.
          </DialogDescription>
        </DialogHeader>
        <dl className="space-y-3">
          {SHORTCUTS.map((s) => (
            <div key={s.action} className="flex items-center justify-between gap-3 text-sm">
              <dt className="text-muted-foreground">{s.action}</dt>
              <dd>
                <kbd className="rounded-md border border-border bg-secondary px-2 py-0.5 font-mono text-xs">
                  {s.keys}
                </kbd>
              </dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  )
}
