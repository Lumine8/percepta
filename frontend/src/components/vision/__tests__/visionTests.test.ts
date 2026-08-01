import { describe, expect, it } from 'vitest'

import { thresholdFromTrials } from '@/components/vision/ContrastTest'
import { circularMean180 } from '@/components/vision/AstigmatismTest'
import { betterEye, logmar } from '@/components/vision/AcuityTest'
import type { EyeAcuityResult } from '@/models/vision'

describe('ContrastTest thresholdFromTrials', () => {
  it('interpolates between the last seen and the missed contrast', () => {
    expect(thresholdFromTrials([100, 30, 10], 3)).toBe(6.5)
  })

  it('floors the threshold at 1%', () => {
    expect(thresholdFromTrials([1], 0.5)).toBe(1)
  })

  it('uses the first step when nothing was seen', () => {
    expect(thresholdFromTrials([], 100)).toBe(100)
  })
})

describe('AstigmatismTest circularMean180', () => {
  it('is periodic on 0–180°', () => {
    expect(circularMean180([0, 180])).toBe(0)
    expect(circularMean180([170, 10])).toBeCloseTo(0, 5)
  })

  it('averages nearby axes', () => {
    expect(circularMean180([30, 60])).toBeCloseTo(45, 5)
  })
})

describe('AcuityTest helpers', () => {
  it('computes logMAR from a Snellen row', () => {
    expect(logmar('20/20')).toBe(0)
    expect(logmar('20/40')).toBeCloseTo(0.3, 1)
  })

  it('picks the better eye by decimal acuity', () => {
    const left: EyeAcuityResult = { snellen: '20/40', logmar: 0.3, correct: true, letters_shown: 5, letters_correct: 5 }
    const right: EyeAcuityResult = { snellen: '20/25', logmar: 0.1, correct: true, letters_shown: 5, letters_correct: 5 }
    expect(betterEye(left, right)?.snellen).toBe('20/25')
    expect(betterEye(left, null)?.snellen).toBe('20/40')
    expect(betterEye(null, null)).toBeNull()
  })
})
