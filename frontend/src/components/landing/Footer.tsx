import { Link } from 'react-router-dom'

const LINKS = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/hearing', label: 'Hearing' },
  { to: '/vision', label: 'Vision' },
  { to: '/#features', label: 'Features' },
]

export function Footer() {
  return (
    <footer className="border-t border-border/60 bg-background/40">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-8 md:grid-cols-3">
          <div>
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <img src="/favicon.svg" alt="" aria-hidden="true" className="h-8 w-8" />
              Percepta
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              AI that adapts the digital world to how you perceive it. Hearing and
              vision profiles with real signal processing — AI-ready for what's next.
            </p>
          </div>

          <nav aria-label="Footer">
            <p className="mb-3 text-sm font-semibold">Explore</p>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {LINKS.map((l) => (
                <li key={l.label}>
                  <Link to={l.to} className="transition-colors hover:text-foreground">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div>
            <p className="mb-3 text-sm font-semibold">Disclaimer</p>
            <p className="text-xs leading-relaxed text-muted-foreground">
              Percepta is a screening tool and accessibility experiment. Assessments
              use gain proxies, not calibrated clinical equipment. Nothing here is a
              medical diagnosis or treatment. Please consult a professional for
              clinical hearing or vision care.
            </p>
          </div>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} Percepta · MVP</span>
          <span>React · FastAPI · librosa · scipy · OpenCV</span>
        </div>
      </div>
    </footer>
  )
}
