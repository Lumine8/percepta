import { Loader2, Upload, Wand2 } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { enhanceImage } from '@/api/vision'
import { b64ToBytes } from '@/api/client'
import { CompareSlider } from '@/components/vision/CompareSlider'
import { Badge } from '@/components/shared/ui/badge'
import { Button } from '@/components/shared/ui/button'
import { GlassCard } from '@/components/shared/GlassCard'
import { Label } from '@/components/shared/ui/label'
import { Slider } from '@/components/shared/ui/slider'
import { ErrorState } from '@/components/shared/StateComponents'
import { useProfile } from '@/hooks/useProfile'
import type { VisionEnhanceResponse } from '@/models/vision'

/**
 * Image enhancement workspace: upload → tune zoom/edge → run the backend
 * pipeline → side-by-side comparison.
 */
export function ImageEnhancer() {
  const { profile } = useProfile()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [enhancedUrl, setEnhancedUrl] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1.0)
  const [edgeStrength, setEdgeStrength] = useState(0.8)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<VisionEnhanceResponse | null>(null)
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (!file) {
      setOriginalUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setOriginalUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    return () => {
      if (enhancedUrl) URL.revokeObjectURL(enhancedUrl)
    }
  }, [enhancedUrl])

  const runEnhance = useCallback(async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    try {
      const response = await enhanceImage(
        file,
        { zoom, edge_strength: edgeStrength },
        profile?.vision,
      )
      setResult(response)
      const bytes = b64ToBytes(response.enhanced_b64)
      setEnhancedUrl(
        URL.createObjectURL(new Blob([bytes.buffer as ArrayBuffer], { type: 'image/png' })),
      )
    } catch (e) {
      setError(
        e instanceof Error
          ? `${e.message} — is the backend running? (backend/uvicorn, port 8000)`
          : 'Enhancement failed.',
      )
    } finally {
      setLoading(false)
    }
  }, [file, zoom, edgeStrength, profile])

  const hasVisionProfile = Boolean(profile?.vision)

  return (
    <div className="space-y-6">
      <GlassCard className="p-6">
        <h2 className="text-lg font-semibold">Image enhancement</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Contrast, adaptive brightness, edge enhancement, color remapping, and
          magnification — tuned to your vision profile.
        </p>

        {!hasVisionProfile && (
          <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
            No vision profile yet — run the assessment first for profile-aware
            enhancement. You can still enhance with default settings.
          </div>
        )}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="mt-6 flex w-full flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-background/30 p-10 transition-colors hover:border-brand-violet/60 hover:bg-secondary/30"
        >
          <Upload className="h-10 w-10 text-brand-violet" />
          <span className="text-sm font-medium">Upload an image</span>
          <span className="text-xs text-muted-foreground">PNG · JPEG · WEBP</span>
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Upload image"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) {
              setFile(f)
              setResult(null)
              setError(null)
            }
          }}
        />

        {file && (
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <div className="mb-2 flex justify-between">
                  <Label htmlFor="zoom">Magnification</Label>
                  <span className="text-sm text-muted-foreground">{zoom.toFixed(1)}×</span>
                </div>
                <Slider
                  id="zoom"
                  min={1}
                  max={3}
                  step={0.1}
                  value={[zoom]}
                  onValueChange={([v]) => setZoom(v)}
                />
              </div>
              <div>
                <div className="mb-2 flex justify-between">
                  <Label htmlFor="edge">Edge strength</Label>
                  <span className="text-sm text-muted-foreground">{edgeStrength.toFixed(1)}</span>
                </div>
                <Slider
                  id="edge"
                  min={0}
                  max={2}
                  step={0.1}
                  value={[edgeStrength]}
                  onValueChange={([v]) => setEdgeStrength(v)}
                />
              </div>
              <Button variant="default" className="w-full" disabled={loading} onClick={() => void runEnhance()}>
                {loading ? <Loader2 className="animate-spin" /> : <Wand2 />}
                {loading ? 'Enhancing…' : 'Enhance image'}
              </Button>
              {error && <ErrorState message={error} onRetry={() => void runEnhance()} />}
            </div>
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Original</p>
              {originalUrl && (
                <img src={originalUrl} alt="Original upload" className="max-h-72 w-full rounded-lg border border-border object-contain" />
              )}
            </div>
          </div>
        )}
      </GlassCard>

      {result && originalUrl && enhancedUrl && (
        <GlassCard className="p-6">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h3 className="text-lg font-semibold">Comparison</h3>
            <Badge variant="secondary">
              {result.width}×{result.height}
            </Badge>
            {result.stages.map((stage) => (
              <Badge key={stage} variant="outline" className="capitalize">
                {stage.replace('vision.', '').replaceAll('_', ' ')}
              </Badge>
            ))}
          </div>
          <CompareSlider before={originalUrl} after={enhancedUrl} />
        </GlassCard>
      )}
    </div>
  )
}
