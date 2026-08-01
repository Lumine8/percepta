import { Menu, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'

interface MobileMenuProps {
  /** Menu entries (e.g. NavLinks or anchors). */
  items: React.ReactNode[]
  /** Extra content at the bottom of the menu, e.g. a CTA button. */
  footer?: React.ReactNode
}

/**
 * Mobile-only hamburger menu. Desktop nav is rendered separately; this shows a
 * dropdown under the header on small screens and closes on navigation, Escape,
 * or tapping a link.
 */
export function MobileMenu({ items, footer }: MobileMenuProps) {
  const [open, setOpen] = useState(false)
  const location = useLocation()

  // Close when the route changes (react-router Link navigation).
  useEffect(() => {
    setOpen(false)
  }, [location])

  // Close on Escape.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="relative sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        aria-label="Toggle navigation menu"
        className="grid h-10 w-10 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      {open && (
        <div
          id="mobile-menu"
          onClick={(e) => {
            if (e.target instanceof Element && e.target.closest('a,button')) {
              setOpen(false)
            }
          }}
          className="absolute right-0 top-12 z-50 min-w-56 overflow-hidden rounded-lg border border-border bg-card shadow-lg"
        >
          <nav aria-label="Mobile" className="flex flex-col p-2">
            {items}
          </nav>
          {footer && <div className="border-t border-border p-2">{footer}</div>}
        </div>
      )}
    </div>
  )
}
