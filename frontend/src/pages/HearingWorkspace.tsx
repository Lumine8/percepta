import { useState } from 'react'

import { SpeechProcessing } from '@/components/hearing/SpeechProcessing'
import { ToneTest } from '@/components/hearing/ToneTest'
import { StepIndicator } from '@/components/shared/StepIndicator'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

const STEPS = [
  { id: 'assessment', title: 'Assessment', description: 'tone test' },
  { id: 'speech', title: 'Speech Processing', description: 'adapt audio' },
]

/** Hearing module workspace: Step 1 assessment, Step 2 speech processing. */
export function HearingWorkspace() {
  const [step, setStep] = useState('assessment')

  useKeyboardShortcuts([
    { key: 'arrowleft', label: 'Previous step', action: () => setStep('assessment') },
    { key: 'arrowright', label: 'Next step', action: () => setStep('speech') },
  ])

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">
          <span className="text-[#2383e2]">Hearing</span> workspace
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Build a personalized hearing profile, then adapt speech and audio to how
          you actually hear. Press{' '}
          <kbd className="rounded bg-secondary px-1">←</kbd>{' '}
          <kbd className="rounded bg-secondary px-1">→</kbd> to switch steps.
        </p>
      </header>

      <StepIndicator steps={STEPS} current={step} onSelect={setStep} />

      <div className="mt-6">
        {step === 'assessment' && <ToneTest />}
        {step === 'speech' && <SpeechProcessing />}
      </div>
    </div>
  )
}
