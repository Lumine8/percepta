import { useEffect, useRef } from 'react'

interface WaveformCanvasProps {
  peaks: number[][]
  color?: string
  height?: number
  /** 0..1 playback progress for a highlight overlay. */
  progress?: number
  className?: string
  label?: string
}

/**
 * Custom waveform renderer drawing min/max peak pairs as vertical bars.
 * Dependency-free; intentionally mirrors the shape returned by the backend
 * (`[[min, max], ...]`).
 */
export function WaveformCanvas({
  peaks,
  color = '#34d399',
  height = 72,
  progress = 0,
  className,
  label,
}: WaveformCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.height = `${height}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)

      ctx.clearRect(0, 0, width, height)
      if (peaks.length === 0) return

      const n = peaks.length
      const mid = height / 2
      const barWidth = width / n
      const maxAmp = Math.max(
        0.0001,
        ...peaks.flat().map((v) => Math.abs(v)),
      )
      const playedX = progress * width

      for (let i = 0; i < n; i++) {
        const [min, max] = peaks[i]
        const top = mid - (max / maxAmp) * (mid - 1)
        const bottom = mid + (-min / maxAmp) * (mid - 1)
        const x = i * barWidth
        const played = x < playedX
        ctx.fillStyle = played ? '#6ee7b7' : color
        ctx.fillRect(x + 0.5, top, Math.max(1, barWidth - 1), Math.max(1, bottom - top))
      }
    }

    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [peaks, color, height, progress])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      role="img"
      aria-label={label ?? 'Audio waveform'}
      style={{ width: '100%' }}
    />
  )
}
