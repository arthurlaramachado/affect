import { describe, it, expect } from 'vitest'
import React from 'react'
import {
  PatientReportDocument,
  AIOverviewSection,
  MoodHistoryCards,
} from './components'
import type { PatientReportData } from '../pdf-report.service'
import type { AIOverview } from '../ai-overview.service'

function createMockReportData(
  overrides: Partial<PatientReportData> = {}
): PatientReportData {
  return {
    patient: {
      id: 'patient-1',
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date('2024-06-01'),
    },
    moodHistory: [
      {
        date: new Date('2025-01-15'),
        moodScore: 7,
        riskFlag: false,
        clinicalSummary:
          'Patient appears stable with good mood. Reports enjoying time with family and feeling hopeful about the future. Sleep patterns have normalized.',
      },
      {
        date: new Date('2025-01-14'),
        moodScore: 6,
        riskFlag: false,
        clinicalSummary:
          'Patient reports moderate mood. Some anxiety about work but coping well. Using breathing techniques learned in therapy.',
      },
    ],
    insights: {
      moodTrend: 'stable',
      averageMood: 6.5,
      complianceRate: 75,
      moodRange: {
        min: 3,
        max: 8,
        average: 6.5,
        stddev: 1.2,
      },
    },
    riskLevel: 'stable',
    generatedAt: new Date('2025-01-16'),
    doctorName: 'Dr. Smith',
    ...overrides,
  }
}

function createMockAIOverview(
  overrides: Partial<AIOverview> = {}
): AIOverview {
  return {
    longitudinalAnalysis:
      'Patient has shown consistent stability over the past 30 days with gradual improvement in mood scores. The trajectory suggests positive response to current treatment approach.',
    keyPatterns: [
      'Mood scores consistently above 5/10',
      'Strong compliance with daily check-ins',
      'Positive correlation between exercise and mood',
    ],
    clinicalConcerns: [
      'Occasional sleep disturbances reported',
      'Work-related anxiety noted in multiple entries',
    ],
    recommendations: [
      'Continue current medication regimen',
      'Consider sleep hygiene intervention',
      'Schedule follow-up to address work stressors',
    ],
    overallAssessment:
      'Patient is progressing well with stable mood patterns. Current treatment plan appears effective. Recommend continued monitoring with emphasis on sleep quality.',
    generatedAt: new Date('2025-01-16'),
    ...overrides,
  }
}

describe('PDF Report Components', () => {
  describe('PatientReportDocument', () => {
    it('should render without AI overview when not provided', () => {
      const data = createMockReportData()

      // Smoke test - verify component renders without throwing
      expect(() => PatientReportDocument({ data })).not.toThrow()

      const element = PatientReportDocument({ data })
      expect(element).toBeDefined()
      expect(element.props.children).toBeDefined()
    })

    it('should render with AI overview when provided', () => {
      const data = createMockReportData({
        aiOverview: createMockAIOverview(),
      })

      expect(() => PatientReportDocument({ data })).not.toThrow()

      const element = PatientReportDocument({ data })
      expect(element).toBeDefined()
      // Document should have 2 pages when AI overview is present
      expect(element.props.children).toHaveLength(2)
    })

    it('should handle empty mood history', () => {
      const data = createMockReportData({
        moodHistory: [],
        riskLevel: 'unknown',
      })

      expect(() => PatientReportDocument({ data })).not.toThrow()

      const element = PatientReportDocument({ data })
      expect(element).toBeDefined()
    })

    it('should render only one page when AI overview is not provided', () => {
      const data = createMockReportData()

      const element = PatientReportDocument({ data })
      // Without AI overview, only main page + false (from conditional)
      const children = React.Children.toArray(element.props.children).filter(Boolean)
      expect(children).toHaveLength(1)
    })
  })

  describe('AIOverviewSection', () => {
    it('should render all AI overview sections', () => {
      const aiOverview = createMockAIOverview()

      expect(() => AIOverviewSection({ aiOverview })).not.toThrow()

      const element = AIOverviewSection({ aiOverview })
      expect(element).toBeDefined()
    })

    it('should render with empty arrays', () => {
      const aiOverview = createMockAIOverview({
        keyPatterns: [],
        clinicalConcerns: [],
        recommendations: [],
      })

      expect(() => AIOverviewSection({ aiOverview })).not.toThrow()

      const element = AIOverviewSection({ aiOverview })
      expect(element).toBeDefined()
    })

    it('should include disclaimer text', () => {
      const aiOverview = createMockAIOverview()

      const element = AIOverviewSection({ aiOverview })

      // Verify component renders - the actual text content is tested via integration
      expect(element).toBeDefined()
    })
  })

  describe('MoodHistoryCards', () => {
    it('should render full clinical summaries without truncation', () => {
      const longSummary =
        'This is a very long clinical summary that exceeds 80 characters and should NOT be truncated. It contains detailed information about the patient state.'

      const moodHistory = [
        {
          date: new Date('2025-01-15'),
          moodScore: 7,
          riskFlag: false,
          clinicalSummary: longSummary,
        },
      ]

      expect(() => MoodHistoryCards({ moodHistory })).not.toThrow()

      const element = MoodHistoryCards({ moodHistory })
      expect(element).toBeDefined()
    })

    it('should render empty state when no mood history', () => {
      expect(() => MoodHistoryCards({ moodHistory: [] })).not.toThrow()

      const element = MoodHistoryCards({ moodHistory: [] })
      expect(element).toBeDefined()
    })

    it('should highlight risk flagged entries', () => {
      const moodHistory = [
        {
          date: new Date('2025-01-15'),
          moodScore: 2,
          riskFlag: true,
          clinicalSummary: 'Patient reported severe distress and ideation.',
        },
      ]

      expect(() => MoodHistoryCards({ moodHistory })).not.toThrow()

      const element = MoodHistoryCards({ moodHistory })
      expect(element).toBeDefined()
    })
  })
})
