import { motion } from 'framer-motion'
import { AudioWaveform, BadgeCheck, Eye, Image } from 'lucide-react'

import { GlassCard } from '@/components/shared/GlassCard'

const STEPS = [
  {
    icon: AudioWaveform,
    title: 'Assess',
    text: 'Run short, guided hearing and vision tests in your browser.',
  },
  {
    icon: BadgeCheck,
    title: 'Profile',
    text: 'Results become a personal perception profile — audiogram + vision metrics.',
  },
  {
    icon: Image,
    title: 'Adapt',
    text: 'Upload audio or images; Percepta processes them against your profile.',
  },
  {
    icon: Eye,
    title: 'Compare',
    text: 'See and hear the before/after, tweak settings, and refine.',
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-12 max-w-2xl"
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          How it <span className="text-[#2383e2]">works</span>
        </h2>
        <p className="mt-3 text-muted-foreground">
          Four steps from raw senses to adapted content.
        </p>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-4">
        {STEPS.map((step, i) => (
          <motion.div
            key={step.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.12 }}
          >
            <GlassCard className="relative h-full p-6">
              <span className="absolute right-4 top-4 font-mono text-4xl font-black text-border">
                {String(i + 1).padStart(2, '0')}
              </span>
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-secondary text-brand-violet">
                <step.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.text}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
