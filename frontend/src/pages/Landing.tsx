import { Link } from 'react-router-dom'

import { Accessibility } from '@/components/landing/Accessibility'
import { Demo } from '@/components/landing/Demo'
import { Features } from '@/components/landing/Features'
import { Footer } from '@/components/landing/Footer'
import { Hero } from '@/components/landing/Hero'
import { HowItWorks } from '@/components/landing/HowItWorks'
import { Research } from '@/components/landing/Research'
import { MobileMenu } from '@/components/shared/MobileMenu'
import { Button } from '@/components/shared/ui/button'

const NAV = [
  { href: '#features', label: 'Features' },
  { href: '#how-it-works', label: 'How it works' },
  { href: '#demo', label: 'Demo' },
  { href: '#research', label: 'Research' },
  { href: '#accessibility', label: 'Accessibility' },
]

/** Marketing landing page (7 sections). */
export function Landing() {
  return (
    <div className="relative min-h-dvh">
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <img src="/favicon.svg" alt="" aria-hidden="true" className="h-8 w-8" />
            <span className="text-lg tracking-tight">Percepta</span>
          </Link>
          <nav aria-label="Landing" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <a
                key={n.href}
                href={n.href}
                className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
              >
                {n.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/dashboard" className="hidden md:inline-flex">
              <Button variant="default" size="sm">
                Open the app
              </Button>
            </Link>
            <MobileMenu
              items={[
                ...NAV.map((n) => (
                  <a
                    key={n.href}
                    href={n.href}
                    className="rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
                  >
                    {n.label}
                  </a>
                )),
                <Link
                  key="dashboard"
                  to="/dashboard"
                  className="rounded-md px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
                >
                  Dashboard
                </Link>,
              ]}
              footer={
                <Link to="/dashboard" className="block">
                  <Button variant="default" size="sm" className="w-full">
                    Open the app
                  </Button>
                </Link>
              }
            />
          </div>
        </div>
      </header>

      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <Demo />
        <Research />
        <Accessibility />

        {/* CTA banner */}
        <section className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to <span className="text-[#34d399]">hear and see</span> better?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Two quick assessments. No account. Your profile stays on your device.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-4">
            <Link to="/dashboard">
              <Button size="lg" variant="default">
                Build my perception profile
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
