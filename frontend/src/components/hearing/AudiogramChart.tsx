import { useEffect, useRef } from 'react'

import type { AudiogramPoint } from '@/models/profile'

const FREQ_AXIS = [125, 250, 500, 1000, 2000, 4000, 8000]

function logX(frequency: number, width: number, pad: number): number {
  const min = Math.log10(125)
  const max = Math.log10(8000)
  const t = (Math.log10(frequency) - min) / (max - min)
  return pad + t * (width - 2 * pad)
}

interface AudiogramChartProps {
  audiogram: AudiogramPoint[]
  ear: string
  className?: string
}

/** Audiogram rendered on canvas: log-frequency x-axis, dB HL y-axis (inverted). */
export function AudiogramChart({ audiogram, ear, className }: AudiogramChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const draw = () => {
      const dpr = window.devicePixelRatio || 1
      const rect = canvas.getBoundingClientRect()
      const width = rect.width
      const height = 260
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.height = `${height}px`
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.scale(dpr, dpr)

      const padL = 44
      const padR = 16
      const padT = 20
      const padB = 30
      const plotW = width - padL - padR
      const plotH = height - padT - padB
      const maxDb = 100

      const y = (db: number) => padT + (db / maxDb) * plotH

      // Normal-hearing zone
      ctx.fillStyle = 'rgba(52, 211, 153, 0.10)'
      ctx.fillRect(padL, y(20), plotW, y(0) - y(20))

      // Grid
      ctx.strokeStyle = 'rgba(15,15,15,0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (const db of [0, 20, 40, 60, 80, 100]) {
        ctx.moveTo(padL, y(db))
        ctx.lineTo(width - padR, y(db))
      }
      for (const f of FREQ_AXIS) {
        const x = logX(f, width, padL)
        ctx.moveTo(x, padT)
        ctx.lineTo(x, height - padB)
      }
      ctx.stroke()

      // Axis labels
      ctx.fillStyle = 'rgba(55,53,47,0.8)'
      ctx.font = '10px system-ui, sans-serif'
      ctx.textAlign = 'right'
      ctx.textBaseline = 'middle'
      for (const db of [0, 20, 40, 60, 80, 100]) {
        ctx.fillText(String(db), padL - 6, y(db))
      }
      ctx.textAlign = 'center'
      ctx.textBaseline = 'top'
      for (const f of FREQ_AXIS) {
        const label = f >= 1000 ? `${f / 1000}k` : String(f)
        ctx.fillText(label, logX(f, width, padL), height - padB + 8)
      }

      // Plot data
      const points = [...audiogram].sort((a, b) => a.frequency - b.frequency)
      if (points.length === 0) return

      ctx.strokeStyle = 'rgba(52,211,153,0.9)'
      ctx.lineWidth = 2
      ctx.beginPath()
      points.forEach((p, i) => {
        const x = logX(p.frequency, width, padL)
        const py = y(p.threshold_db)
        if (i === 0) ctx.moveTo(x, py)
        else ctx.lineTo(x, py)
      })
      ctx.stroke()

      for (const p of points) {
        const x = logX(p.frequency, width, padL)
        const py = y(p.threshold_db)
        ctx.fillStyle = '#34d399'
        ctx.beginPath()
        ctx.arc(x, py, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    draw()
    const observer = new ResizeObserver(draw)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [audiogram, ear])

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Audiogram — {ear} ear</span>
        <span>dB HL proxy · screening</span>
      </div>
      <canvas ref={canvasRef} className="w-full" aria-label={`Audiogram for the ${ear} ear`} />
    </div>
  )
}
