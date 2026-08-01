import { Pause, Play, RotateCcw } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/shared/ui/button'

interface AudioPlayerProps {
  /** Audio source (object URL or data URL). */
  src: string
  label?: string
  onProgress?: (ratio: number) => void
  compact?: boolean
}

/** Minimal accessible audio player with progress reporting. */
export function AudioPlayer({ src, label, onProgress, compact }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const rafRef = useRef<number>(0)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)

  const loop = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    setTime(audio.currentTime)
    if (audio.duration) {
      setDuration(audio.duration)
      onProgress?.(audio.currentTime / audio.duration)
    }
    rafRef.current = requestAnimationFrame(loop)
  }, [onProgress])

  const toggle = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) void audio.play()
    else audio.pause()
  }

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    const onEnd = () => setPlaying(false)
    audio.addEventListener('ended', onEnd)
    return () => audio.removeEventListener('ended', onEnd)
  }, [])

  useEffect(() => {
    if (playing) rafRef.current = requestAnimationFrame(loop)
    else cancelAnimationFrame(rafRef.current)
    return () => cancelAnimationFrame(rafRef.current)
  }, [playing, loop])

  const format = (s: number) => {
    const mm = Math.floor(s / 60)
    const ss = Math.floor(s % 60)
    return `${mm}:${ss.toString().padStart(2, '0')}`
  }

  return (
    <div className="flex items-center gap-2">
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
      <Button
        type="button"
        variant="outline"
        size={compact ? 'icon-sm' : 'icon'}
        onClick={toggle}
        aria-label={playing ? `Pause ${label ?? 'audio'}` : `Play ${label ?? 'audio'}`}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
      <span className="text-xs tabular-nums text-muted-foreground">
        {format(time)} / {format(duration || 0)}
      </span>
      {!compact && (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          onClick={() => {
            const audio = audioRef.current
            if (audio) {
              audio.currentTime = 0
              setTime(0)
            }
          }}
          aria-label="Restart playback"
        >
          <RotateCcw className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  )
}
