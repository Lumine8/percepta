import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'

import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import { KeyboardHelp } from '@/components/shared/KeyboardHelp'

const NAV_ITEMS = [
  { to: '/', label: 'Home', exact: true },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/hearing', label: 'Hearing' },
  { to: '/vision', label: 'Vision' },
]

/**
 * Shared chrome for app pages (dashboard + workspaces): sticky nav bar and an
 * Outlet for the routed page.
 */
export function PageShell() {
  const location = useLocation()
  return (
    <div className="relative min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="grid h-8 w-8 place-items-center rounded-md bg-primary text-sm font-black text-primary-foreground">
              P
            </span>
            <span className="text-lg tracking-tight">
              Percepta
              <Badge variant="secondary" className="ml-2 align-middle">
                MVP
              </Badge>
            </span>
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.exact}
                className={({ isActive }) =>
                  `rounded-md px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-secondary text-foreground'
                      : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/dashboard">
              <Button size="sm">Open Dashboard</Button>
            </Link>
          </div>
        </div>
      </header>

      <main key={location.pathname}>
        <Outlet />
      </main>
      <KeyboardHelp />
    </div>
  )
}
