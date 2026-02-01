import { describe, it, expect } from 'vitest'
import { calculateRiskLevel, type RiskLevel } from './database'

describe('calculateRiskLevel', () => {
  describe('returns "alert"', () => {
    it('when riskFlag is true', () => {
      const result = calculateRiskLevel(7, true)
      expect(result).toBe<RiskLevel>('alert')
    })

    it('when moodScore is less than 3', () => {
      const result = calculateRiskLevel(2, false)
      expect(result).toBe<RiskLevel>('alert')
    })

    it('when moodScore is 1 (minimum)', () => {
      const result = calculateRiskLevel(1, false)
      expect(result).toBe<RiskLevel>('alert')
    })

    it('when both riskFlag is true and moodScore is low', () => {
      const result = calculateRiskLevel(1, true)
      expect(result).toBe<RiskLevel>('alert')
    })
  })

  describe('returns "drift"', () => {
    it('when moodScore is 3', () => {
      const result = calculateRiskLevel(3, false)
      expect(result).toBe<RiskLevel>('drift')
    })

    it('when moodScore is 4', () => {
      const result = calculateRiskLevel(4, false)
      expect(result).toBe<RiskLevel>('drift')
    })
  })

  describe('returns "stable"', () => {
    it('when moodScore is 5 (threshold)', () => {
      const result = calculateRiskLevel(5, false)
      expect(result).toBe<RiskLevel>('stable')
    })

    it('when moodScore is high (7)', () => {
      const result = calculateRiskLevel(7, false)
      expect(result).toBe<RiskLevel>('stable')
    })

    it('when moodScore is maximum (10)', () => {
      const result = calculateRiskLevel(10, false)
      expect(result).toBe<RiskLevel>('stable')
    })
  })
})
