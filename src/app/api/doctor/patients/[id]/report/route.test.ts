import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleGetPatientReport, type Dependencies } from './route'
import { DoctorServiceError } from '@/lib/services/doctor.service'
import { PdfReportServiceError } from '@/lib/services/pdf-report.service'
import { AIOverviewServiceError } from '@/lib/services/ai-overview.service'
import type { PatientDetail } from '@/lib/services/doctor.service'
import type { InsightsSummary } from '@/lib/services/insights.service'
import type { AIOverview } from '@/lib/services/ai-overview.service'
import type { DailyLog } from '@/lib/db/schema'
import type { GeminiAnalysis } from '@/types/database'

function createMockPatientDetail(
  overrides: Partial<PatientDetail> = {}
): PatientDetail {
  return {
    patient: {
      id: 'patient-1',
      name: 'John Doe',
      email: 'john@example.com',
      createdAt: new Date('2024-06-01'),
    },
    moodHistory: [
      {
        id: 'log-1',
        moodScore: 7,
        riskFlag: false,
        date: new Date('2025-01-15'),
        clinicalSummary: 'Patient appears stable.',
      },
      {
        id: 'log-2',
        moodScore: 6,
        riskFlag: false,
        date: new Date('2025-01-14'),
        clinicalSummary: 'Patient reports good day.',
      },
    ],
    riskLevel: 'stable',
    currentMoodScore: 7,
    ...overrides,
  }
}

function createMockInsightsSummary(
  overrides: Partial<InsightsSummary> = {}
): InsightsSummary {
  return {
    userId: 'patient-1',
    moodTrend: 'stable',
    weeklyAverages: [
      {
        weekStart: new Date('2025-01-05'),
        weekEnd: new Date('2025-01-11'),
        averageMood: 6,
        logCount: 5,
      },
    ],
    moodRange: {
      min: 3,
      max: 8,
      average: 6,
      stddev: 1.5,
    },
    complianceRate: 75,
    anomalies: [],
    generatedAt: new Date(),
    ...overrides,
  }
}

function createMockAIOverview(overrides: Partial<AIOverview> = {}): AIOverview {
  return {
    longitudinalAnalysis:
      'Patient has shown consistent stability over the past 30 days.',
    keyPatterns: ['Mood scores consistently above 5/10', 'Strong compliance'],
    clinicalConcerns: ['Occasional sleep disturbances reported'],
    recommendations: ['Continue current medication regimen'],
    overallAssessment: 'Patient is progressing well with stable mood patterns.',
    generatedAt: new Date(),
    ...overrides,
  }
}

const mockAnalysis: GeminiAnalysis = {
  mood_score: 7,
  risk_flags: {
    suicidality_indicated: false,
    self_harm_indicated: false,
    severe_distress: false,
  },
  biomarkers: {
    speech_latency: 'normal',
    affect_type: 'full_range',
    eye_contact: 'normal',
  },
  clinical_summary: 'Patient appears stable with normal affect.',
}

function createMockDailyLogs(count: number): DailyLog[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `log-${i + 1}`,
    userId: 'patient-1',
    moodScore: 5 + (i % 5),
    riskFlag: false,
    analysisJson: mockAnalysis,
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
  }))
}

describe('GET /api/doctor/patients/[id]/report', () => {
  let mockDeps: Dependencies

  beforeEach(() => {
    vi.clearAllMocks()

    mockDeps = {
      getSession: vi.fn(),
      doctorService: {
        getPatientDetail: vi.fn(),
      },
      insightsService: {
        generateInsightsSummary: vi.fn(),
      },
      pdfReportService: {
        generatePatientReport: vi.fn(),
      },
      dailyLogRepository: {
        findAllByUserId: vi.fn(),
      },
      aiOverviewService: {
        generateOverview: vi.fn(),
      },
    }
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue(null)

    const response = await handleGetPatientReport('patient-1', mockDeps)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 401 if session has no user', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({ user: null })

    const response = await handleGetPatientReport('patient-1', mockDeps)

    expect(response.status).toBe(401)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 403 if user is not a doctor', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', name: 'Patient User', role: 'patient' },
    })

    const response = await handleGetPatientReport('patient-1', mockDeps)

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Only doctors can download patient reports')
  })

  it('should return 404 if patient does not exist', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.getPatientDetail).mockRejectedValue(
      new DoctorServiceError('Patient not found', 'NOT_FOUND')
    )

    const response = await handleGetPatientReport('nonexistent-patient', mockDeps)

    expect(response.status).toBe(404)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Patient not found')
  })

  it('should return 403 if patient does not belong to this doctor', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.getPatientDetail).mockRejectedValue(
      new DoctorServiceError('Unauthorized', 'UNAUTHORIZED')
    )

    const response = await handleGetPatientReport('patient-other-doctor', mockDeps)

    expect(response.status).toBe(403)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return PDF with correct headers for valid request', async () => {
    const mockPdfBuffer = Buffer.from('mock-pdf-content')
    const mockLogs = createMockDailyLogs(2)

    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.getPatientDetail).mockResolvedValue(
      createMockPatientDetail()
    )

    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
      createMockInsightsSummary()
    )

    vi.mocked(mockDeps.dailyLogRepository!.findAllByUserId).mockResolvedValue(
      mockLogs
    )

    vi.mocked(mockDeps.aiOverviewService!.generateOverview).mockResolvedValue(
      createMockAIOverview()
    )

    vi.mocked(mockDeps.pdfReportService.generatePatientReport).mockResolvedValue(
      mockPdfBuffer
    )

    const response = await handleGetPatientReport('patient-1', mockDeps)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('Content-Disposition')).toContain('attachment')
    expect(response.headers.get('Content-Disposition')).toContain('john-doe')
    expect(response.headers.get('Content-Disposition')).toContain('.pdf')
  })

  it('should call doctorService.getPatientDetail with correct params', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.getPatientDetail).mockResolvedValue(
      createMockPatientDetail()
    )

    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
      createMockInsightsSummary()
    )

    vi.mocked(mockDeps.dailyLogRepository!.findAllByUserId).mockResolvedValue(
      createMockDailyLogs(2)
    )

    vi.mocked(mockDeps.aiOverviewService!.generateOverview).mockResolvedValue(
      createMockAIOverview()
    )

    vi.mocked(mockDeps.pdfReportService.generatePatientReport).mockResolvedValue(
      Buffer.from('mock-pdf')
    )

    await handleGetPatientReport('patient-123', mockDeps)

    expect(mockDeps.doctorService.getPatientDetail).toHaveBeenCalledWith(
      'doctor-1',
      'patient-123'
    )
  })

  it('should call insightsService.generateInsightsSummary with patient ID', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.getPatientDetail).mockResolvedValue(
      createMockPatientDetail()
    )

    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
      createMockInsightsSummary()
    )

    vi.mocked(mockDeps.dailyLogRepository!.findAllByUserId).mockResolvedValue(
      createMockDailyLogs(2)
    )

    vi.mocked(mockDeps.aiOverviewService!.generateOverview).mockResolvedValue(
      createMockAIOverview()
    )

    vi.mocked(mockDeps.pdfReportService.generatePatientReport).mockResolvedValue(
      Buffer.from('mock-pdf')
    )

    await handleGetPatientReport('patient-123', mockDeps)

    expect(mockDeps.insightsService.generateInsightsSummary).toHaveBeenCalledWith(
      'patient-123'
    )
  })

  it('should call pdfReportService.generatePatientReport with correct data', async () => {
    const mockPatientDetail = createMockPatientDetail()
    const mockInsights = createMockInsightsSummary()

    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.getPatientDetail).mockResolvedValue(
      mockPatientDetail
    )

    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
      mockInsights
    )

    vi.mocked(mockDeps.dailyLogRepository!.findAllByUserId).mockResolvedValue(
      createMockDailyLogs(2)
    )

    vi.mocked(mockDeps.aiOverviewService!.generateOverview).mockResolvedValue(
      createMockAIOverview()
    )

    vi.mocked(mockDeps.pdfReportService.generatePatientReport).mockResolvedValue(
      Buffer.from('mock-pdf')
    )

    await handleGetPatientReport('patient-1', mockDeps)

    expect(mockDeps.pdfReportService.generatePatientReport).toHaveBeenCalledWith(
      expect.objectContaining({
        patient: mockPatientDetail.patient,
        riskLevel: mockPatientDetail.riskLevel,
        doctorName: 'Dr. Smith',
      })
    )
  })

  it('should return 500 if PDF generation fails', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.getPatientDetail).mockResolvedValue(
      createMockPatientDetail()
    )

    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
      createMockInsightsSummary()
    )

    vi.mocked(mockDeps.dailyLogRepository!.findAllByUserId).mockResolvedValue(
      createMockDailyLogs(2)
    )

    vi.mocked(mockDeps.aiOverviewService!.generateOverview).mockResolvedValue(
      createMockAIOverview()
    )

    vi.mocked(mockDeps.pdfReportService.generatePatientReport).mockRejectedValue(
      new PdfReportServiceError('Failed to generate PDF report', 'RENDER_FAILED')
    )

    const response = await handleGetPatientReport('patient-1', mockDeps)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to generate PDF report')
  })

  it('should return 500 on unexpected error', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.getPatientDetail).mockRejectedValue(
      new Error('Database connection failed')
    )

    const response = await handleGetPatientReport('patient-1', mockDeps)

    expect(response.status).toBe(500)
    const data = await response.json()
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })

  it('should handle patient with empty mood history', async () => {
    const mockPatientDetail = createMockPatientDetail({
      moodHistory: [],
      currentMoodScore: null,
      riskLevel: 'unknown',
    })

    const mockInsights = createMockInsightsSummary({
      moodTrend: 'stable',
      complianceRate: 0,
      moodRange: { min: 0, max: 0, average: 0, stddev: 0 },
    })

    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.getPatientDetail).mockResolvedValue(
      mockPatientDetail
    )

    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
      mockInsights
    )

    vi.mocked(mockDeps.dailyLogRepository!.findAllByUserId).mockResolvedValue([])

    vi.mocked(mockDeps.pdfReportService.generatePatientReport).mockResolvedValue(
      Buffer.from('mock-pdf')
    )

    const response = await handleGetPatientReport('patient-1', mockDeps)

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
  })

  it('should include patient name in filename sanitized', async () => {
    const mockPatientDetail = createMockPatientDetail({
      patient: {
        id: 'patient-1',
        name: 'John O\'Brien-Smith',
        email: 'john@example.com',
        createdAt: new Date('2024-06-01'),
      },
    })

    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.getPatientDetail).mockResolvedValue(
      mockPatientDetail
    )

    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
      createMockInsightsSummary()
    )

    vi.mocked(mockDeps.dailyLogRepository!.findAllByUserId).mockResolvedValue(
      createMockDailyLogs(2)
    )

    vi.mocked(mockDeps.aiOverviewService!.generateOverview).mockResolvedValue(
      createMockAIOverview()
    )

    vi.mocked(mockDeps.pdfReportService.generatePatientReport).mockResolvedValue(
      Buffer.from('mock-pdf')
    )

    const response = await handleGetPatientReport('patient-1', mockDeps)

    const disposition = response.headers.get('Content-Disposition')
    expect(disposition).toContain('attachment')
    // Should not contain special characters
    expect(disposition).not.toContain("'")
  })

  describe('AI Overview Integration', () => {
    it('should fetch all daily logs for AI overview', async () => {
      const mockLogs = createMockDailyLogs(50)

      vi.mocked(mockDeps.getSession).mockResolvedValue({
        user: { id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' },
      })

      vi.mocked(mockDeps.doctorService.getPatientDetail).mockResolvedValue(
        createMockPatientDetail()
      )

      vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
        createMockInsightsSummary()
      )

      vi.mocked(mockDeps.dailyLogRepository!.findAllByUserId).mockResolvedValue(
        mockLogs
      )

      vi.mocked(mockDeps.aiOverviewService!.generateOverview).mockResolvedValue(
        createMockAIOverview()
      )

      vi.mocked(mockDeps.pdfReportService.generatePatientReport).mockResolvedValue(
        Buffer.from('mock-pdf')
      )

      await handleGetPatientReport('patient-1', mockDeps)

      expect(mockDeps.dailyLogRepository!.findAllByUserId).toHaveBeenCalledWith(
        'patient-1'
      )
    })

    it('should include AI overview in report data when generation succeeds', async () => {
      const mockLogs = createMockDailyLogs(10)
      const mockAiOverview = createMockAIOverview()

      vi.mocked(mockDeps.getSession).mockResolvedValue({
        user: { id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' },
      })

      vi.mocked(mockDeps.doctorService.getPatientDetail).mockResolvedValue(
        createMockPatientDetail()
      )

      vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
        createMockInsightsSummary()
      )

      vi.mocked(mockDeps.dailyLogRepository!.findAllByUserId).mockResolvedValue(
        mockLogs
      )

      vi.mocked(mockDeps.aiOverviewService!.generateOverview).mockResolvedValue(
        mockAiOverview
      )

      vi.mocked(mockDeps.pdfReportService.generatePatientReport).mockResolvedValue(
        Buffer.from('mock-pdf')
      )

      await handleGetPatientReport('patient-1', mockDeps)

      expect(mockDeps.pdfReportService.generatePatientReport).toHaveBeenCalledWith(
        expect.objectContaining({
          aiOverview: mockAiOverview,
        })
      )
    })

    it('should generate PDF without AI overview when AI service fails', async () => {
      const mockLogs = createMockDailyLogs(10)

      vi.mocked(mockDeps.getSession).mockResolvedValue({
        user: { id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' },
      })

      vi.mocked(mockDeps.doctorService.getPatientDetail).mockResolvedValue(
        createMockPatientDetail()
      )

      vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
        createMockInsightsSummary()
      )

      vi.mocked(mockDeps.dailyLogRepository!.findAllByUserId).mockResolvedValue(
        mockLogs
      )

      vi.mocked(mockDeps.aiOverviewService!.generateOverview).mockRejectedValue(
        new AIOverviewServiceError('AI generation failed', 'GENERATION_FAILED')
      )

      vi.mocked(mockDeps.pdfReportService.generatePatientReport).mockResolvedValue(
        Buffer.from('mock-pdf')
      )

      const response = await handleGetPatientReport('patient-1', mockDeps)

      expect(response.status).toBe(200)
      expect(mockDeps.pdfReportService.generatePatientReport).toHaveBeenCalledWith(
        expect.objectContaining({
          aiOverview: undefined,
        })
      )
    })

    it('should generate PDF without AI overview when no daily logs exist', async () => {
      vi.mocked(mockDeps.getSession).mockResolvedValue({
        user: { id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' },
      })

      vi.mocked(mockDeps.doctorService.getPatientDetail).mockResolvedValue(
        createMockPatientDetail({ moodHistory: [] })
      )

      vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
        createMockInsightsSummary()
      )

      vi.mocked(mockDeps.dailyLogRepository!.findAllByUserId).mockResolvedValue([])

      vi.mocked(mockDeps.pdfReportService.generatePatientReport).mockResolvedValue(
        Buffer.from('mock-pdf')
      )

      const response = await handleGetPatientReport('patient-1', mockDeps)

      expect(response.status).toBe(200)
      // AI overview service should not be called when no logs exist
      expect(mockDeps.aiOverviewService!.generateOverview).not.toHaveBeenCalled()
    })

    it('should call AI overview service with correct input', async () => {
      const mockPatientDetail = createMockPatientDetail()
      const mockLogs = createMockDailyLogs(5)
      const mockInsights = createMockInsightsSummary()

      vi.mocked(mockDeps.getSession).mockResolvedValue({
        user: { id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' },
      })

      vi.mocked(mockDeps.doctorService.getPatientDetail).mockResolvedValue(
        mockPatientDetail
      )

      vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
        mockInsights
      )

      vi.mocked(mockDeps.dailyLogRepository!.findAllByUserId).mockResolvedValue(
        mockLogs
      )

      vi.mocked(mockDeps.aiOverviewService!.generateOverview).mockResolvedValue(
        createMockAIOverview()
      )

      vi.mocked(mockDeps.pdfReportService.generatePatientReport).mockResolvedValue(
        Buffer.from('mock-pdf')
      )

      await handleGetPatientReport('patient-1', mockDeps)

      expect(mockDeps.aiOverviewService!.generateOverview).toHaveBeenCalledWith(
        expect.objectContaining({
          patient: expect.objectContaining({
            id: mockPatientDetail.patient.id,
            name: mockPatientDetail.patient.name,
          }),
          checkIns: expect.any(Array),
          insights: expect.objectContaining({
            moodTrend: mockInsights.moodTrend,
            averageMood: mockInsights.moodRange.average,
            complianceRate: mockInsights.complianceRate,
          }),
        })
      )
    })

    it('should use all logs from repository for mood history', async () => {
      const mockLogs = createMockDailyLogs(100) // More than the original 30 limit

      vi.mocked(mockDeps.getSession).mockResolvedValue({
        user: { id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' },
      })

      vi.mocked(mockDeps.doctorService.getPatientDetail).mockResolvedValue(
        createMockPatientDetail()
      )

      vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
        createMockInsightsSummary()
      )

      vi.mocked(mockDeps.dailyLogRepository!.findAllByUserId).mockResolvedValue(
        mockLogs
      )

      vi.mocked(mockDeps.aiOverviewService!.generateOverview).mockResolvedValue(
        createMockAIOverview()
      )

      vi.mocked(mockDeps.pdfReportService.generatePatientReport).mockResolvedValue(
        Buffer.from('mock-pdf')
      )

      await handleGetPatientReport('patient-1', mockDeps)

      // Verify that all 100 logs are passed to the PDF report
      expect(mockDeps.pdfReportService.generatePatientReport).toHaveBeenCalledWith(
        expect.objectContaining({
          moodHistory: expect.arrayContaining([
            expect.objectContaining({ moodScore: expect.any(Number) }),
          ]),
        })
      )

      // The moodHistory should contain all 100 logs
      const callArgs = vi.mocked(mockDeps.pdfReportService.generatePatientReport).mock.calls[0][0]
      expect(callArgs.moodHistory.length).toBe(100)
    })
  })
})
