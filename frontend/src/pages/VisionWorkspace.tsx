import { motion } from 'framer-motion'
import { Loader2, ShieldCheck } from 'lucide-react'
import { useState } from 'react'

import { analyzeVision } from '@/api/vision'
import { AcuityTest } from '@/components/vision/AcuityTest'
import { AstigmatismTest } from '@/components/vision/AstigmatismTest'
import { BlindSpotTest } from '@/components/vision/BlindSpotTest'
import { ColorTest } from '@/components/vision/ColorTest'
import { ContrastTest } from '@/components/vision/ContrastTest'
import { ImageEnhancer } from '@/components/vision/ImageEnhancer'
import { NearVisionTest } from '@/components/vision/NearVisionTest'
import { Badge } from '@/components/shared/ui/badge'
import { GlassCard } from '@/components/shared/GlassCard'
import { StepIndicator } from '@/components/shared/StepIndicator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/shared/ui/tabs'
import { ErrorState } from '@/components/shared/StateComponents'
import { useProfile } from '@/hooks/useProfile'
import type {
  AstigmatismResult,
  BlindSpotResult,
  ColorPlateResult,
  NearVisionResult,
  VisionAnalyzeRequest,
} from '@/models/vision'
import type { VisionProfile } from '@/models/profile'
import { testResultsService } from '@/services/testResultsService'

const ASSESSMENT_STEPS = [
  { id: 'contrast', title: 'Contrast' },
  { id: 'color', title: 'Color' },
  { id: 'acuity', title: 'Acuity' },
  { id: 'blindspot', title: 'Blind Spot' },
  { id: 'astigmatism', title: 'Astigmatism' },
  { id: 'near', title: 'Near Vision' },
  { id: 'results', title: 'Results' },
]

/** Vision module workspace: assessment battery + image enhancement. */
export function VisionWorkspace() {
  const { setVision } = useProfile()
  const [tab, setTab] = useState('assessment')
  const [step, setStep] = useState('contrast')
  const [results, setResults] = useState<VisionAnalyzeRequest>({})
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [profileResult, setProfileResult] = useState<VisionProfile | null>(null)

  const finishAssessment = async (payload: VisionAnalyzeRequest) => {
    setAnalyzing(true)
    setError(null)
    try {
      const profile = await analyzeVision({
        ...payload,
        completed_at: new Date().toISOString(),
      })
      setProfileResult(profile)
      setVision(profile)
      setStep('results')
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Assessment could not be processed.',
      )
    } finally {
      setAnalyzing(false)
    }
  }

  const onContrast = (contrast: VisionAnalyzeRequest['contrast']) => {
    setResults((r) => ({ ...r, contrast }))
    if (contrast) {
      testResultsService.addResult({
        module: 'vision',
        test: 'contrast',
        label: 'Contrast test',
        summary: `${contrast.threshold_percent}% threshold`,
        completedAt: new Date().toISOString(),
        data: contrast as unknown as Record<string, unknown>,
      })
    }
    setStep('color')
  }
  const onColor = (plates: ColorPlateResult[]) => {
    setResults((r) => ({ ...r, color: { plates } }))
    const answered = plates.filter((p) => p.reported != null && p.expected != null)
    const correct = answered.filter((p) => p.reported === p.expected).length
    testResultsService.addResult({
      module: 'vision',
      test: 'color',
      label: 'Color perception test',
      summary:
        answered.length > 0
          ? `${correct}/${answered.length} plates correct`
          : `${plates.length} plates reported`,
      completedAt: new Date().toISOString(),
      data: { plates },
    })
    setStep('acuity')
  }
  const onAcuity = (acuity: VisionAnalyzeRequest['acuity']) => {
    setResults((r) => ({ ...r, acuity }))
    if (acuity) {
      testResultsService.addResult({
        module: 'vision',
        test: 'acuity',
        label: 'Acuity test',
        summary: acuity.last_readable_row ?? 'Not readable',
        completedAt: new Date().toISOString(),
        data: acuity as unknown as Record<string, unknown>,
      })
    }
    setStep('blindspot')
  }
  const onBlindSpot = (blind_spot: BlindSpotResult) => {
    setResults((r) => ({ ...r, blind_spot }))
    testResultsService.addResult({
      module: 'vision',
      test: 'blindspot',
      label: 'Blind spot test',
      summary: `${blind_spot.eye} eye · ${blind_spot.dots_missing.length} missing dots`,
      completedAt: new Date().toISOString(),
      data: blind_spot as unknown as Record<string, unknown>,
    })
    setStep('astigmatism')
  }
  const onAstigmatism = (astigmatism: AstigmatismResult) => {
    setResults((r) => ({ ...r, astigmatism }))
    testResultsService.addResult({
      module: 'vision',
      test: 'astigmatism',
      label: 'Astigmatism fan test',
      summary:
        astigmatism.symmetric || astigmatism.blur_score < 0.3
          ? 'No directional blur'
          : `Blur near ${astigmatism.axis_blurred}°`,
      completedAt: new Date().toISOString(),
      data: astigmatism as unknown as Record<string, unknown>,
    })
    setStep('near')
  }
  const onNearVision = (near_vision: NearVisionResult) => {
    setResults((r) => ({ ...r, near_vision }))
    testResultsService.addResult({
      module: 'vision',
      test: 'near',
      label: 'Near vision test',
      summary: `${near_vision.snellen} at reading distance`,
      completedAt: new Date().toISOString(),
      data: near_vision as unknown as Record<string, unknown>,
    })
    void finishAssessment({ ...results, near_vision })
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-[#34d399]">Vision</span> workspace
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Assess how your eyes perceive the world, then enhance images to match.
        </p>
      </header>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="assessment">Assessment</TabsTrigger>
          <TabsTrigger value="enhance">Image Enhancement</TabsTrigger>
        </TabsList>

        <TabsContent value="assessment">
          {profileResult ? (
            <ProfileSummary profile={profileResult} />
          ) : (
            <div className="space-y-6">
              <StepIndicator steps={ASSESSMENT_STEPS} current={step} allowNavigate={false} />

              {error && <ErrorState message={error} onRetry={() => setError(null)} />}

              {step === 'contrast' && <ContrastTest onComplete={onContrast} />}
              {step === 'color' && <ColorTest onComplete={onColor} />}
              {step === 'acuity' && <AcuityTest onComplete={onAcuity} />}
              {step === 'blindspot' && <BlindSpotTest onComplete={onBlindSpot} />}
              {step === 'astigmatism' && <AstigmatismTest onComplete={onAstigmatism} />}
              {step === 'near' && <NearVisionTest onComplete={onNearVision} />}

              {analyzing && (
                <GlassCard className="p-8">
                  <div className="flex items-center justify-center gap-3 text-muted-foreground">
                    <Loader2 className="animate-spin text-brand-violet" />
                    Building your vision profile…
                  </div>
                </GlassCard>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="enhance">
          <ImageEnhancer />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ProfileSummary({ profile }: { profile: VisionProfile }) {
  const items: Array<{ label: string; value: string }> = []
  if (profile.contrast_sensitivity) {
    items.push({
      label: 'Contrast threshold',
      value: `${profile.contrast_sensitivity.threshold_percent}%`,
    })
  }
  if (profile.color_perception) {
    items.push({ label: 'Color perception', value: profile.color_perception.deficiency })
  }
  if (profile.acuity) {
    const perEye = [profile.acuity.left, profile.acuity.right]
      .filter((e): e is NonNullable<typeof e> => e != null)
      .map((e) => `${e.snellen}`)
    items.push({
      label: 'Acuity (best eye)',
      value: perEye.length > 0 ? `${profile.acuity.snellen} · ${perEye.join(' / ')}` : profile.acuity.snellen,
    })
  }
  if (profile.blind_spot) {
    items.push({
      label: 'Blind spot',
      value: `${profile.blind_spot.radius_deg}° radius`,
    })
  }
  if (profile.astigmatism) {
    items.push({
      label: 'Astigmatism',
      value:
        profile.astigmatism.symmetric || profile.astigmatism.blur_score < 0.3
          ? 'No directional blur'
          : `Blur near ${profile.astigmatism.axis_blurred}°`,
    })
  }
  if (profile.near_vision) {
    items.push({ label: 'Near vision', value: profile.near_vision.snellen })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <GlassCard gradient className="p-6">
        <div className="mb-4 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-emerald-400" />
          <h2 className="text-lg font-semibold">Your vision profile</h2>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <div key={item.label} className="rounded-lg border border-border bg-background/40 p-4">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
              <p className="mt-1 text-xl font-semibold capitalize">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Badge variant="success">Profile saved</Badge>
          <Badge variant="secondary">Screening tool</Badge>
        </div>
      </GlassCard>
    </motion.div>
  )
}
