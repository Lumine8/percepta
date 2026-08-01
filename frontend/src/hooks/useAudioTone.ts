import { useCallback, useRef } from 'react'

/**
 * Web Audio tone synthesis for the hearing assessment.
 *
 * Each tone is a sine with a short exponential attack/decay envelope so playback
 * never clicks. The AudioContext is created lazily on first user interaction
 * (required by browser autoplay policies).
 */
export function useAudioTone() {
  const ctxRef = useRef<AudioContext | null>(null)

  const ensureContext = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      ctxRef.current = new AudioContext()
    }
    if (ctxRef.current.state === 'suspended') {
      void ctxRef.current.resume()
    }
    return ctxRef.current
  }, [])

  /** Play a pure tone. `amplitude` in 0..1, `duration` in seconds. */
  const playTone = useCallback(
    (frequency: number, amplitude: number, duration = 1.0, ramp = 0.02) => {
      const ctx = ensureContext()
      const oscillator = ctx.createOscillator()
      const gain = ctx.createGain()

      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(Math.max(frequency, 20), ctx.currentTime)

      const t0 = ctx.currentTime
      const peak = Math.max(amplitude, 0.0001)
      gain.gain.setValueAtTime(0.0001, t0)
      gain.gain.exponentialRampToValueAtTime(peak, t0 + ramp)
      gain.gain.setValueAtTime(peak, t0 + duration - ramp)
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration)

      oscillator.connect(gain)
      gain.connect(ctx.destination)
      oscillator.start(t0)
      oscillator.stop(t0 + duration + 0.05)
    },
    [ensureContext],
  )

  return { playTone, context: ctxRef }
}
