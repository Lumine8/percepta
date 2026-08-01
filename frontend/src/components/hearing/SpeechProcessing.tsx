import { motion } from 'framer-motion'
import { AudioLines, Loader2, Mic, Upload, Wand2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { processAudio } from '@/api/hearing'
import { b64ToBytes } from '@/api/client'
import { AudioPlayer } from '@/components/hearing/AudioPlayer'
import { WaveformCanvas } from '@/components/hearing/WaveformCanvas'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import { GlassCard } from '@/components/shared/GlassCard'
import { ErrorState } from '@/components/shared/StateComponents'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'
import { useProfile } from '@/hooks/useProfile'
import type { HearingProcessResponse } from '@/models/hearing'

function formatDuration(s: number | undefined): string {
  if (!s || !Number.isFinite(s)) return '—'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

function fmtMeta(meta: Record<string, unknown>): string[] {
  const lines: string[] = []
  if (meta.noise_floor_db !== undefined) lines.push(`Noise floor ${meta.noise_floor_db} dB`)
  if (meta.peak_db !== undefined) lines.push(`Peak ${meta.peak_db} dBFS`)
  if (meta.target_loudness_db !== undefined) lines.push(`Loudness ${meta.target_loudness_db} dB`)
  if (meta.eq_gains && Array.isArray(meta.eq_gains)) {
    lines.push(`${meta.eq_gains.length} EQ bands applied`)
  }
  if (meta.frequency_compression) lines.push('High-band compressed')
  if (meta.frequency_transposition) lines.push('High-band transposed')
  return lines
}

/**
 * Step 2 of the hearing module: upload or record audio, run it through the
 * backend adaptation pipeline, and compare the original vs processed waveforms.
 */
export function SpeechProcessing() {
  const { profile } = useProfile()
  const recorder = useMediaRecorder()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [source, setSource] = useState<Blob | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<HearingProcessResponse | null>(null)
  const [processedUrl, setProcessedUrl] = useState<string | null>(null)
  const [origProgress, setOrigProgress] = useState(0)
  const [procProgress, setProcProgress] = useState(0)

  // When a recording finishes, promote it to the source.
  useEffect(() => {
    if (recorder.wav) {
      setSource(recorder.wav)
      setResult(null)
    }
  }, [recorder.wav])

  // Maintain an object URL for the source blob, revoking the previous one.
  useEffect(() => {
    if (!source) {
      setSourceUrl(null)
      return
    }
    const url = URL.createObjectURL(source)
    setSourceUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [source])

  useEffect(() => {
    return () => {
      if (processedUrl) URL.revokeObjectURL(processedUrl)
    }
  }, [processedUrl])

  const onFile = (file: File | undefined) => {
    if (!file) return
    setSource(file)
    setResult(null)
    setError(null)
  }

  const runProcessing = useCallback(async () => {
    if (!source) return
    setLoading(true)
    setError(null)
    try {
      const response = await processAudio(source, profile?.hearing)
      setResult(response)
      const bytes = b64ToBytes(response.processed_audio_b64)
      setProcessedUrl(
        URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'audio/wav' })),
      )
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} — is the backend running? (backend/uvicorn, port 8000)`
          : 'Processing failed.',
      )
    } finally {
      setLoading(false)
    }
  }, [source, profile])

  const hasHearingProfile = Boolean(profile?.hearing?.audiogram?.length)

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold">Speech adaptation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload audio or record your voice. Percepta applies equalization, noise
          reduction, frequency compression/transposition, and normalization based on
          your hearing profile.
        </p>

        {!hasHearingProfile && (
          <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            No hearing profile yet — run the assessment in Step 1 first for
            profile-aware processing. You can still process with default settings.
          </div>
        )}

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="group flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-background/30 p-8 transition-colors hover:border-brand-violet/60 hover:bg-secondary/30"
          >
            <Upload className="h-8 w-8 text-brand-violet transition-transform group-hover:-translate-y-1" />
            <span className="text-sm font-medium">Upload audio</span>
            <span className="text-xs text-muted-foreground">WAV · MP3 · FLAC · M4A</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            className="sr-only"
            aria-label="Upload audio file"
            onChange={(e) => onFile(e.target.files?.[0])}
          />

          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-background/30 p-8">
            {recorder.state === 'idle' && (
              <>
                <Mic className="h-8 w-8 text-brand-cyan" />
                <Button variant="outline" onClick={() => void recorder.start()}>
                  Record microphone
                </Button>
              </>
            )}
            {recorder.state === 'recording' && (
              <>
                <motion.div
                  animate={{ scale: [1, 1.15, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2 }}
                  className="h-4 w-4 rounded-full bg-destructive"
                />
                <div className="flex gap-3">
                  <Button variant="destructive" onClick={recorder.stop}>
                    Stop
                  </Button>
                  <Button variant="ghost" onClick={recorder.cancel}>
                    Cancel
                  </Button>
                </div>
              </>
            )}
            {recorder.state === 'converting' && (
              <>
                <Loader2 className="h-8 w-8 animate-spin text-brand-cyan" />
                <span className="text-sm text-muted-foreground">Transcoding to WAV…</span>
              </>
            )}
            {recorder.state === 'done' && (
              <>
                <AudioLines className="h-8 w-8 text-emerald-600" />
                <span className="text-sm font-medium">Recording ready</span>
                <Button variant="ghost" size="sm" onClick={recorder.reset}>
                  Re-record
                </Button>
              </>
            )}
            {recorder.state === 'error' && (
              <p className="text-center text-sm text-destructive">{recorder.error}</p>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorState message={error} onRetry={() => void runProcessing()} />
          </div>
        )}

        {source && (
          <div className="mt-6 flex flex-wrap items-center gap-4 rounded-lg border border-border bg-background/40 p-4">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Source audio</p>
              <p className="truncate text-xs text-muted-foreground">
                {source.type || 'audio'} · {(source.size / 1024).toFixed(0)} KB
              </p>
            </div>
            {sourceUrl && <AudioPlayer src={sourceUrl} label="Source" />}
            <Button
              variant="default"
              disabled={loading}
              onClick={() => void runProcessing()}
            >
              {loading ? <Loader2 className="animate-spin" /> : <Wand2 />}
              {loading ? 'Processing…' : 'Process with my profile'}
            </Button>
          </div>
        )}
      </GlassCard>

      {result && sourceUrl && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard className="p-6">
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <h3 className="text-lg font-semibold">Before / After</h3>
              <Badge variant="secondary">{formatDuration(result.duration_s)}</Badge>
              {result.stages.map((stage) => (
                <Badge key={stage} variant="outline" className="capitalize">
                  {stage.replace('hearing.', '').replaceAll('_', ' ')}
                </Badge>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <div>
                <p className="mb-2 text-sm font-medium text-muted-foreground">
                  Original waveform
                </p>
                <WaveformCanvas
                  peaks={result.original.peaks}
                  color="#a3a19d"
                  progress={origProgress}
                  label="Original waveform"
                />
                <div className="mt-2">
                  <AudioPlayer
                    src={sourceUrl}
                    label="Original"
                    onProgress={setOrigProgress}
                  />
                </div>
              </div>
              <div>
                <p className="mb-2 text-sm font-medium text-brand-violet">
                  Processed waveform
                </p>
                <WaveformCanvas
                  peaks={result.processed.peaks}
                  color="#2383e2"
                  progress={procProgress}
                  label="Processed waveform"
                />
                {processedUrl && (
                  <div className="mt-2">
                    <AudioPlayer
                      src={processedUrl}
                      label="Processed"
                      onProgress={setProcProgress}
                    />
                  </div>
                )}
              </div>
            </div>

            {fmtMeta(result.meta).length > 0 && (
              <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-4">
                {fmtMeta(result.meta).map((line) => (
                  <Badge key={line} variant="secondary">
                    {line}
                  </Badge>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>
      )}
    </div>
  )
}
