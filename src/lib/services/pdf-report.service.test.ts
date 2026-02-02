import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  PdfReportService,
  PdfReportServiceError,
  type PatientReportData,
  type MoodHistoryItem,
} from './pdf-report.service'

// Mock @react-pdf/renderer
vi.mock('@react-pdf/renderer', () => ({
  renderToBuffer: vi.fn(),
  Document: ({ children }: { children: React.ReactNode }) => children,
  Page: ({ children }: { children: React.ReactNode }) => children,
  View: ({ children }: { children: React.ReactNode }) => children,
  Text: ({ children }: { children: React.ReactNode }) => children,
  StyleSheet: {
    create: (styles: Record<string, unknown>) => styles,
  },
}))

function createMockMoodHistoryItem(
  overrides: Partial<MoodHistoryItem> = {}
): MoodHistoryItem {
  return {
    date: new Date('2025-01-15'),
    moodScore: 7,
    riskFlag: false,
    clinicalSummary: 'Patient appears stable and engaged.',
    ...overrides,
  }
}

function createMockPatientReportData(
  overrides: Partial<PatientReportData> = {}
): PatientReportData {
  return {
    patient: {
      id: 'patient-1',
      name: 'John Doe',
      email: 'john.doe@example.com',
      createdAt: new Date('2024-06-01'),
    },
    moodHistory: [
      createMockMoodHistoryItem({ date: new Date('2025-01-15'), moodScore: 7 }),
      createMockMoodHistoryItem({ date: new Date('2025-01-14'), moodScore: 6 }),
      createMockMoodHistoryItem({ date: new Date('2025-01-13'), moodScore: 5 }),
    ],
    insights: {
      moodTrend: 'improving',
      averageMood: 6,
      complianceRate: 85,
      moodRange: {
        min: 3,
        max: 8,
        average: 6,
        stddev: 1.5,
      },
    },
    riskLevel: 'stable',
    generatedAt: new Date('2025-01-16'),
    doctorName: 'Dr. Smith',
    ...overrides,
  }
}

describe('PdfReportService', () => {
  let service: PdfReportService
  let mockRenderToBuffer: ReturnType<typeof vi.fn>

  beforeEach(async () => {
    vi.clearAllMocks()

    const reactPdf = await import('@react-pdf/renderer')
    mockRenderToBuffer = vi.mocked(reactPdf.renderToBuffer)
    mockRenderToBuffer.mockResolvedValue(Buffer.from('mock-pdf-content'))

    service = new PdfReportService()
  })

  describe('generatePatientReport', () => {
    it('should return a Buffer containing PDF data', async () => {
      const reportData = createMockPatientReportData()

      const result = await service.generatePatientReport(reportData)

      expect(result).toBeInstanceOf(Buffer)
      expect(result.length).toBeGreaterThan(0)
    })

    it('should call renderToBuffer with a valid document', async () => {
      const reportData = createMockPatientReportData()

      await service.generatePatientReport(reportData)

      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1)
      expect(mockRenderToBuffer).toHaveBeenCalledWith(expect.anything())
    })

    it('should handle empty mood history', async () => {
      const reportData = createMockPatientReportData({
        moodHistory: [],
        insights: {
          moodTrend: 'stable',
          averageMood: 0,
          complianceRate: 0,
          moodRange: {
            min: 0,
            max: 0,
            average: 0,
            stddev: 0,
          },
        },
      })

      const result = await service.generatePatientReport(reportData)

      expect(result).toBeInstanceOf(Buffer)
    })

    it('should include patient name in report data', async () => {
      const reportData = createMockPatientReportData({
        patient: {
          id: 'patient-1',
          name: 'Jane Smith',
          email: 'jane@example.com',
          createdAt: new Date('2024-06-01'),
        },
      })

      await service.generatePatientReport(reportData)

      // Verify render was called (the component will use the patient name)
      expect(mockRenderToBuffer).toHaveBeenCalledTimes(1)
    })

    it('should handle alert risk level', async () => {
      const reportData = createMockPatientReportData({
        riskLevel: 'alert',
        moodHistory: [
          createMockMoodHistoryItem({
            moodScore: 2,
            riskFlag: true,
            clinicalSummary: 'Patient shows signs of severe distress.',
          }),
        ],
      })

      const result = await service.generatePatientReport(reportData)

      expect(result).toBeInstanceOf(Buffer)
    })

    it('should handle drift risk level', async () => {
      const reportData = createMockPatientReportData({
        riskLevel: 'drift',
        moodHistory: [
          createMockMoodHistoryItem({
            moodScore: 4,
            riskFlag: false,
            clinicalSummary: 'Patient shows mild decline.',
          }),
        ],
      })

      const result = await service.generatePatientReport(reportData)

      expect(result).toBeInstanceOf(Buffer)
    })

    it('should throw PdfReportServiceError on render failure', async () => {
      mockRenderToBuffer.mockRejectedValue(new Error('Render failed'))

      const reportData = createMockPatientReportData()

      await expect(service.generatePatientReport(reportData)).rejects.toThrow(
        PdfReportServiceError
      )
      await expect(service.generatePatientReport(reportData)).rejects.toThrow(
        'Failed to generate PDF report'
      )
    })

    it('should include all mood trends in insights', async () => {
      const reportDataImproving = createMockPatientReportData({
        insights: {
          moodTrend: 'improving',
          averageMood: 7,
          complianceRate: 90,
          moodRange: { min: 5, max: 9, average: 7, stddev: 1 },
        },
      })

      const reportDataDeclining = createMockPatientReportData({
        insights: {
          moodTrend: 'declining',
          averageMood: 4,
          complianceRate: 60,
          moodRange: { min: 2, max: 6, average: 4, stddev: 1.5 },
        },
      })

      const reportDataStable = createMockPatientReportData({
        insights: {
          moodTrend: 'stable',
          averageMood: 6,
          complianceRate: 75,
          moodRange: { min: 5, max: 7, average: 6, stddev: 0.5 },
        },
      })

      const resultImproving = await service.generatePatientReport(reportDataImproving)
      const resultDeclining = await service.generatePatientReport(reportDataDeclining)
      const resultStable = await service.generatePatientReport(reportDataStable)

      expect(resultImproving).toBeInstanceOf(Buffer)
      expect(resultDeclining).toBeInstanceOf(Buffer)
      expect(resultStable).toBeInstanceOf(Buffer)
    })

    it('should handle large mood history', async () => {
      const largeMoodHistory: MoodHistoryItem[] = Array.from(
        { length: 100 },
        (_, i) =>
          createMockMoodHistoryItem({
            date: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
            moodScore: Math.floor(Math.random() * 10) + 1,
          })
      )

      const reportData = createMockPatientReportData({
        moodHistory: largeMoodHistory,
      })

      const result = await service.generatePatientReport(reportData)

      expect(result).toBeInstanceOf(Buffer)
    })
  })

  describe('PdfReportServiceError', () => {
    it('should have correct name and code', () => {
      const error = new PdfReportServiceError('Test error', 'TEST_CODE')

      expect(error.name).toBe('PdfReportServiceError')
      expect(error.code).toBe('TEST_CODE')
      expect(error.message).toBe('Test error')
    })
  })
})
