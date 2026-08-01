import { motion } from 'framer-motion'
import { ArrowRight, Ear, Eye, Radio, Wand2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { Badge } from '@/components/shared/ui/badge'
import { GlassCard } from '@/components/shared/GlassCard'
import { useProfile } from '@/hooks/useProfile'
import { testResultsService, type TestResult } from '@/services/testResultsService'

/** Landing pad after assessment: the two large module cards. */
export function Dashboard() {
  const { profile, loaded, offline } = useProfile()
  const [results, setResults] = useState<TestResult[]>([])

  useEffect(() => {
    setResults(testResultsService.getResults())
  }, [])

  const hearing = profile?.hearing
  const vision = profile?.vision

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <header className="mb-8 text-center">
        <h1 className="text-4xl font-bold tracking-tight">
          Your <span className="text-[#34d399]">perception</span>, adapted
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Run an assessment and Percepta will adapt audio and images to how you
          perceive the world.
        </p>
        {!loaded && <p className="mt-2 text-sm text-muted-foreground">Loading profile…</p>}
        {offline && (
          <p className="mt-2 text-sm text-amber-300">
            Offline — working from your saved local profile.
          </p>
        )}
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <ModuleCard
          to="/hearing"
          icon={<Ear className="h-10 w-10" />}
          title="Hearing"
          description="Tone assessment → audiogram → adapt speech and audio with EQ, noise reduction, and frequency remapping."
          status={
            hearing
              ? `Profile: ${hearing.classification}`
              : 'No hearing profile yet'
          }
          complete={Boolean(hearing?.audiogram?.length)}
        />
        <ModuleCard
          to="/vision"
          icon={<Eye className="h-10 w-10" />}
          title="Vision"
          description="Contrast, color, acuity, and blind-spot assessment → enhance images to your perception."
          status={
            vision
              ? `Profile: ${vision.color_perception.deficiency}${
                  vision.acuity ? ` · ${vision.acuity.snellen}` : ''
                }`
              : 'No vision profile yet'
          }
          complete={Boolean(vision)}
        />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <InfoCard icon={<Radio />} title="Screening only" text="dB levels are gain proxies, not clinical measurements." />
        <InfoCard icon={<Wand2 />} title="Real processing" text="librosa + scipy + OpenCV pipelines behind a stable contract." />
        <InfoCard icon={<ArrowRight />} title="Local-first" text="Your profile lives in your browser; synced to the API." />
      </div>

      <SessionResults results={results} />
    </div>
  )
}

function SessionResults({ results }: { results: TestResult[] }) {
  return (
    <section aria-label="Tests completed this session" className="mt-10">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">This session</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Every test you run stays here until you close this tab.
          </p>
        </div>
        {results.length > 0 && (
          <Badge variant="secondary">{results.length} test{results.length === 1 ? '' : 's'}</Badge>
        )}
      </div>

      {results.length === 0 ? (
        <GlassCard className="p-6 text-sm text-muted-foreground">
          No tests completed yet. Run a hearing or vision assessment and the results
          will stay here until you close this tab.
        </GlassCard>
      ) : (
        <div className="grid gap-3">
          {results.map((result) => (
            <GlassCard key={result.id} className="flex items-start gap-3 p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-secondary text-foreground">
                {result.module === 'hearing' ? (
                  <Ear className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="font-medium">{result.label}</p>
                  <time
                    dateTime={result.completedAt}
                    className="text-xs text-muted-foreground"
                  >
                    {relativeTime(result.completedAt)}
                  </time>
                </div>
                <p className="mt-0.5 text-sm capitalize text-muted-foreground">
                  {result.summary}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </section>
  )
}

function relativeTime(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000))
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(iso).toLocaleDateString()
}

interface ModuleCardProps {
  to: string
  icon: React.ReactNode
  title: string
  description: string
  status: string
  complete: boolean
}

function ModuleCard({ to, icon, title, description, status, complete }: ModuleCardProps) {
  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
    >
      <Link to={to} className="group block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-xl">
        <GlassCard interactive className="flex h-full flex-col gap-4 p-8">
          <div className="flex items-start justify-between">
            <div className="grid h-16 w-16 place-items-center rounded-lg bg-primary text-primary-foreground">
              {icon}
            </div>
            <Badge variant={complete ? 'success' : 'secondary'}>
              {complete ? 'Profile ready' : 'Not assessed'}
            </Badge>
          </div>
          <div>
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
          <div className="mt-auto flex items-center justify-between">
            <span className="text-sm text-muted-foreground">{status}</span>
            <ArrowRight className="h-5 w-5 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </div>
        </GlassCard>
      </Link>
    </motion.div>
  )
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <GlassCard className="flex items-start gap-3 p-5">
      <span className="mt-0.5 text-muted-foreground">{icon}</span>
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      </div>
    </GlassCard>
  )
}
