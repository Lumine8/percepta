/** Browser audio utilities: WAV encoding and tone playback helpers. */

/** Encode a Float32Array (mono, [-1, 1]) to a 16-bit PCM WAV blob. */
export function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // byte rate
  view.setUint16(32, 2, true) // block align
  view.setUint16(34, 16, true) // bits per sample
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }
  return new Blob([buffer], { type: 'audio/wav' })
}

/**
 * Convert any decodable audio blob (e.g. WebM from MediaRecorder) to a 16-bit
 * PCM WAV blob via the Web Audio API. The backend expects WAV for processing.
 */
export async function blobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer()
  const AudioCtx =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
  const ctx = new AudioCtx()
  try {
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
    const sampleRate = audioBuffer.sampleRate
    const channel = audioBuffer.getChannelData(0)
    const mono = new Float32Array(channel.length)
    mono.set(channel)
    return encodeWav(mono, sampleRate)
  } finally {
    void ctx.close()
  }
}

/** Map a dB-HL-proxy presentation level to a Web Audio gain (0..1). */
export function levelToAmplitude(db: number): number {
  const clamped = Math.max(0, Math.min(90, db))
  return Math.max(0.02, clamped / 90)
}
