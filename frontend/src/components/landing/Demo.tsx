import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/shared/ui/button'
import { GlassCard } from '@/components/shared/GlassCard'
import { Slider } from '@/components/shared/ui/slider'

const BARS = 42

/**
 * Interactive showcase: dragging the "adaptation" slider remaps a fake waveform,
 * illustrating how processed output differs from the raw signal.
 */
export function Demo() {
  const [strength, setStrength] = useState(0.4)

  return (
    <section id="demo" className="mx-auto max-w-6xl px-4 py-24">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="mb-12 max-w-2xl"
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          See the <span className="text-[#2383e2]">difference</span>
        </h2>
        <p className="mt-3 text-muted-foreground">
          A live preview of how adaptation reshapes an audio signal. Drag the slider.
        </p>
      </motion.div>

      <GlassCard gradient className="mx-auto max-w-3xl p-8">
        <div className="grid gap-8 sm:grid-cols-2">
          <Waveform
            label="Original"
            seed={0}
            strength={0}
            color="rgba(55,53,47,0.35)"
          />
          <Waveform
            label={`Adapted · ${Math.round(strength * 100)}%`}
            seed={0}
            strength={strength}
            color="rgba(35,131,226,0.9)"
          />
        </div>

        <div className="mt-8">
          <div className="mb-2 flex justify-between text-sm">
            <span className="text-muted-foreground">Adaptation strength</span>
            <span>{Math.round(strength * 100)}%</span>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={[strength]}
            onValueChange={([v]) => setStrength(v)}
            aria-label="Adaptation strength"
          />
        </div>

        <div className="mt-8 flex justify-center">
          <Link to="/hearing">
            <Button variant="default" size="lg">
              Try the real thing <ArrowRight className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </GlassCard>
    </section>
  )
}

function Waveform({
  label,
  strength,
  color,
}: {
  label: string
  seed: number
  strength: number
  color: string
}) {
  return (
    <div>
      <p className="mb-3 text-sm font-medium text-muted-foreground">{label}</p>
      <div className="flex h-24 items-center gap-1">
        {Array.from({ length: BARS }, (_, i) => {
          const raw =
            0.25 +
            0.55 * Math.abs(Math.sin(i * 1.3 + (strength * 6) / 1)) +
            0.2 * Math.abs(Math.sin(i * 0.4 + 3))
          // Stronger adaptation → smoother, more uniform bars (as EQ would do).
          const level = strength > 0 ? raw * (1 - strength * 0.4) + strength * 0.25 : raw
          return (
            <motion.span
              key={i}
              animate={{ scaleY: level }}
              transition={{ duration: 0.3 }}
              className="flex-1 rounded-t-sm"
              style={{ height: `${level * 100}%`, background: color, transformOrigin: 'bottom' }}
            />
          )
        })}
      </div>
    </div>
  )
}
