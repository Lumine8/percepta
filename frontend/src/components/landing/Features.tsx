import { motion } from 'framer-motion'
import { AudioWaveform, Eye, HeartPulse, Palette, ScanSearch, Waves } from 'lucide-react'

import { GlassCard } from '@/components/shared/GlassCard'

const FEATURES = [
  {
    icon: AudioWaveform,
    title: 'Personal audiograms',
    text: 'A quick pure-tone test maps your hearing across 125 Hz to 8 kHz — no clinic visit needed.',
  },
  {
    icon: Waves,
    title: 'Adaptive audio',
    text: 'EQ, spectral noise reduction, frequency compression & transposition, and loudness normalization.',
  },
  {
    icon: ScanSearch,
    title: 'Perception profiles',
    text: 'Contrast sensitivity, color perception, acuity, and blind-spot geometry in one portable profile.',
  },
  {
    icon: Palette,
    title: 'Image remapping',
    text: 'CLAHE contrast, adaptive brightness, edge sharpening, and daltonize-style color correction.',
  },
  {
    icon: HeartPulse,
    title: 'Accessibility-first',
    text: 'Keyboard shortcuts, ARIA-aware controls, focus management, and high-contrast light UI.',
  },
  {
    icon: Eye,
    title: 'AI-ready by design',
    text: 'Every processor shares one contract — rule-based today, model-driven tomorrow, no rewrites.',
  },
]

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
}
const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
}

export function Features() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-12 max-w-2xl"
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Built around <span className="text-[#34d399]">your perception</span>
        </h2>
        <p className="mt-3 text-muted-foreground">
          Percepta doesn't ship one-size-fits-all filters. It measures how you sense
          the world, then adapts content to match.
        </p>
      </motion.div>

      <motion.div
        variants={container}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3"
      >
        {FEATURES.map((f) => (
          <motion.div key={f.title} variants={item}>
            <GlassCard interactive className="h-full p-6">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-lg bg-secondary text-foreground">
                <f.icon className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.text}</p>
            </GlassCard>
          </motion.div>
        ))}
      </motion.div>
    </section>
  )
}
