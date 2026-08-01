import { motion } from 'framer-motion'
import { Accessibility as AccessibilityIcon, Keyboard, Monitor, MousePointer2 } from 'lucide-react'

import { GlassCard } from '@/components/shared/GlassCard'

const SHORTCUTS = [
  { keys: ['Space'], action: 'Respond "I heard it" in the tone test' },
  { keys: ['←', '→'], action: 'Previous / next step in workspaces' },
  { keys: ['?'], action: 'Show keyboard help' },
  { keys: ['Esc'], action: 'Stop / close dialogs' },
  { keys: ['R'], action: 'Replay / retry the current audio or trial' },
]

const PRINCIPLES = [
  { icon: Keyboard, title: 'Keyboard-first', text: 'Every interactive control is reachable and operable without a mouse.' },
  { icon: MousePointer2, title: 'Generous targets', text: 'Large hit areas, high contrast, and visible focus rings throughout.' },
  { icon: Monitor, title: 'Screening clarity', text: 'Results are labeled as screening tools — never as clinical diagnoses.' },
  { icon: AccessibilityIcon, title: 'ARIA aware', text: 'Live regions, labelled landmarks, and screen-reader-friendly controls.' },
]

export function Accessibility() {
  return (
    <section id="accessibility" className="mx-auto max-w-6xl px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-12 max-w-2xl"
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Accessible <span className="text-[#2383e2]">by default</span>
        </h2>
        <p className="mt-3 text-muted-foreground">
          The product adapts content for your senses — and the product itself is
          designed to be usable by everyone.
        </p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:col-span-3">
          {PRINCIPLES.map((p) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <GlassCard className="h-full p-5">
                <p.icon className="mb-3 h-6 w-6 text-brand-cyan" />
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.text}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>

        <GlassCard className="p-6 lg:col-span-2">
          <h3 className="mb-4 flex items-center gap-2 font-semibold">
            <Keyboard className="h-5 w-5 text-brand-violet" /> Keyboard shortcuts
          </h3>
          <dl className="space-y-3">
            {SHORTCUTS.map((s) => (
              <div key={s.action} className="flex items-center justify-between gap-3 text-sm">
                <dt className="text-muted-foreground">{s.action}</dt>
                <dd className="flex shrink-0 gap-1">
                  {s.keys.map((k) => (
                    <kbd
                      key={k}
                      className="rounded-md border border-border bg-secondary px-2 py-0.5 font-mono text-xs text-foreground"
                    >
                      {k}
                    </kbd>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </GlassCard>
      </div>
    </section>
  )
}
