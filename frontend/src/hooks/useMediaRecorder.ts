import { useCallback, useEffect, useRef, useState } from 'react'

import { blobToWav } from '@/utils/audio'

export type RecorderState = 'idle' | 'recording' | 'converting' | 'done' | 'error'

export interface UseMediaRecorder {
  state: RecorderState
  /** Final audio as a WAV blob (after transcoding). */
  wav: Blob | null
  /** Raw recorded blob (browser codec). */
  raw: Blob | null
  error: string | null
  start: () => Promise<void>
  stop: () => void
  cancel: () => void
  reset: () => void
}

/**
 * Microphone recorder that transcodes the browser's default codec (usually
 * WebM/Opus) to 16-bit PCM WAV via the Web Audio API — the format the Percepta
 * backend expects for processing.
 */
export function useMediaRecorder(): UseMediaRecorder {
  const [state, setState] = useState<RecorderState>('idle')
  const [wav, setWav] = useState<Blob | null>(null)
  const [raw, setRaw] = useState<Blob | null>(null)
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])

  const start = useCallback(async () => {
    setError(null)
    chunksRef.current = []
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const recorder = new MediaRecorder(stream)
      recorderRef.current = recorder
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorder.onstop = () => {
        const rawBlob = new Blob(chunksRef.current, { type: recorder.mimeType })
        setRaw(rawBlob)
        setState('converting')
        blobToWav(rawBlob)
          .then((wavBlob) => {
            setWav(wavBlob)
            setState('done')
          })
          .catch((e: unknown) => {
            setError(`Could not transcode recording: ${(e as Error).message}`)
            setState('error')
          })
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
      recorder.start()
      setState('recording')
    } catch (e) {
      const message =
        (e as Error).name === 'NotAllowedError'
          ? 'Microphone access denied. Use file upload instead.'
          : `Recording unavailable: ${(e as Error).message}`
      setError(message)
      setState('error')
    }
  }, [])

  const stop = useCallback(() => {
    recorderRef.current?.state === 'recording' && recorderRef.current.stop()
  }, [])

  const cancel = useCallback(() => {
    recorderRef.current?.state === 'recording' && recorderRef.current.stop()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    chunksRef.current = []
    setState('idle')
    setWav(null)
    setRaw(null)
  }, [])

  const reset = useCallback(() => {
    setState('idle')
    setWav(null)
    setRaw(null)
    setError(null)
    chunksRef.current = []
  }, [])

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  return { state, wav, raw, error, start, stop, cancel, reset }
}
