import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { WaveformCanvas } from '@/components/hearing/WaveformCanvas'

describe('WaveformCanvas', () => {
  it('renders a canvas with the provided peaks', () => {
    const { container } = render(
      <WaveformCanvas peaks={[[0, 0.5], [-0.3, 0.2], [0, 0.9]]} height={64} />,
    )
    const canvas = container.querySelector('canvas')
    expect(canvas).not.toBeNull()
  })

  it('renders an accessible label', () => {
    const { getByLabelText } = render(
      <WaveformCanvas
        peaks={[]}
        label="Processed waveform"
      />,
    )
    expect(getByLabelText('Processed waveform')).not.toBeNull()
  })

  it('handles empty peaks without crashing', () => {
    const { container } = render(<WaveformCanvas peaks={[]} />)
    expect(container.querySelector('canvas')).not.toBeNull()
  })
})
