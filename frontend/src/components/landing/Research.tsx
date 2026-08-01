import { motion } from 'framer-motion'
import { BookOpen, FlaskConical } from 'lucide-react'

import { GlassCard } from '@/components/shared/GlassCard'

const RESEARCH = [
  {
    title: 'Frequency lowering for high-frequency hearing loss',
    note: 'Phase-vocoder time-stretch and spectral compression move fricative energy into residual hearing ranges.',
  },
  {
    title: 'Multiband compression & audiometric EQ',
    note: 'Gain-per-band shaped by individual thresholds underlies the equalization stage.',
  },
  {
    title: 'Spectral gating noise reduction',
    note: 'Wiener-style soft masks estimated from STFT magnitude priors (basis of our denoiser).',
  },
  {
    title: 'CLAHE & adaptive tone mapping',
    note: 'Contrast-limited adaptive histogram equalization underpins the vision pipeline.',
  },
  {
    title: 'Dichromacy simulation & correction',
    note: 'Brettel et al. LMS cone models drive our color remapping for protan/deutan/tritan profiles.',
  },
  {
    title: 'Blind-spot geometry',
    note: 'Angular mapping from a simple dot-grid is the screening basis for the blind-spot profile.',
  },
]

export function Research() {
  return (
    <section id="research" className="mx-auto max-w-6xl px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-12 max-w-2xl"
      >
        <div className="mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-brand-violet">
          <FlaskConical className="h-7 w-7" />
        </div>
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Grounded in <span className="text-[#2383e2]">research</span>
        </h2>
        <p className="mt-3 text-muted-foreground">
          Every processing stage maps to established signal-processing and vision
          science techniques — and each is swappable for a learned model later.
        </p>
      </motion.div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {RESEARCH.map((r, i) => (
          <motion.div
            key={r.title}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: (i % 3) * 0.08 }}
          >
            <GlassCard className="h-full p-5">
              <BookOpen className="mb-3 h-5 w-5 text-brand-cyan" />
              <h3 className="text-sm font-semibold leading-snug">{r.title}</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{r.note}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
