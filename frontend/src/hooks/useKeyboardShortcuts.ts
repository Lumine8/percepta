import { useEffect } from 'react'

export interface Shortcut {
  /** Key or combination, e.g. " " (space), "arrowright", "?", "escape". */
  key: string
  /** Short human-readable label shown in the shortcuts dialog. */
  label: string
  action: () => void
  /** Prevent default browser behavior (e.g. space scrolls the page). */
  preventDefault?: boolean
  /** Ignore when the event target is a text input/textarea/select. */
  excludeWhenTyping?: boolean
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

function normalizeKey(event: KeyboardEvent): string {
  if (event.key === ' ') return ' '
  if (event.key === 'ArrowLeft') return 'arrowleft'
  if (event.key === 'ArrowRight') return 'arrowright'
  if (event.key === 'Escape') return 'escape'
  return event.key.toLowerCase()
}

/**
 * Global keyboard-shortcut manager.
 *
 * Handlers receive the current list of shortcuts; the manager matches on the
 * normalized key. Typing in inputs is excluded unless the shortcut opts in.
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[], enabled = true) {
  useEffect(() => {
    if (!enabled) return

    const handler = (event: KeyboardEvent) => {
      const key = normalizeKey(event)
      const shortcut = shortcuts.find((s) => s.key === key)
      if (!shortcut) return
      if (shortcut.excludeWhenTyping !== false && isTypingTarget(event.target)) return
      if (shortcut.preventDefault) event.preventDefault()
      shortcut.action()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [shortcuts, enabled])
}
