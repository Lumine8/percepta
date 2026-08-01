import { motion, useScroll, useTransform } from 'framer-motion'
import { ArrowRight, Ear, Eye, Play } from 'lucide-react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/shared/ui/button'

const EQUALIZER_BARS = 48

export function Hero() {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 500], [0, 120])
  const opacity = useTransform(scrollY, [0, 400], [1, 0.2])

  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-24 pt-20 lg:grid-cols-2 lg:pt-28">
        <motion.div style={{ y, opacity }}>
          <motion.span
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1 text-sm text-muted-foreground"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Personalized accessibility, powered by AI-ready processing
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-6 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
          >
            AI that adapts the digital world to how{' '}
            <span className="text-[#2383e2]">YOU</span> perceive it.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
          >
            Percepta builds a personal hearing &amp; vision profile from short
            assessments, then remaps speech and imagery — so content fits your
            senses, not the average person's.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-8 flex flex-wrap items-center gap-4"
          >
            <Link to="/dashboard">
              <Button size="lg" variant="default">
                <Ear className="h-5 w-5" /> Build my profile
              </Button>
            </Link>
            <Link to="/hearing">
              <Button size="lg" variant="outline">
                <Play className="h-5 w-5" /> Try the hearing test
              </Button>
            </Link>
            <Link to="/vision">
              <Button size="lg" variant="ghost">
                <Eye className="h-5 w-5" /> Explore vision
              </Button>
            </Link>
          </motion.div>
        </motion.div>

        {/* Animated "adaptive audio" visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.35 }}
          className="relative hidden lg:block"
          aria-hidden
        >
          <div className="glass rounded-lg p-8 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-sm font-medium">Speech, adapted</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">
                live
              </span>
            </div>
            <div className="flex h-40 items-end gap-1">
              {Array.from({ length: EQUALIZER_BARS }, (_, i) => {
                const base =
                  0.18 +
                  0.4 * Math.abs(Math.sin(i * 1.7)) +
                  0.3 * Math.abs(Math.sin(i * 0.7 + 2))
                return (
                  <motion.span
                    key={i}
                    className="flex-1 rounded-t-sm bg-primary"
                    animate={{
                      scaleY: [0.35, base, 0.3, base * 0.8, 0.4],
                    }}
                    transition={{
                      duration: 1.4 + (i % 5) * 0.2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    }}
                    style={{ transformOrigin: 'bottom', height: `${base * 100}%` }}
                  />
                )
              })}
            </div>
            <div className="mt-6 flex items-center gap-3">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
                className="grid h-12 w-12 place-items-center rounded-full bg-secondary text-foreground"
              >
                <Ear className="h-6 w-6" />
              </motion.div>
              <div className="text-sm text-muted-foreground">
                <p className="text-foreground">Your audiogram →</p>
                <p>EQ · denoise · freq remap · normalize</p>
              </div>
              <ArrowRight className="ml-auto h-5 w-5 text-primary" />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
