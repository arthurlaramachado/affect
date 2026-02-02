import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleGetPatientInsights, type Dependencies } from './route'
import type { InsightsSummary } from '@/lib/services/insights.service'
import { DoctorServiceError } from '@/lib/services/doctor.service'

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
      average: 5.5,
      stddev: 1.5,
    },
    complianceRate: 75,
    anomalies: [],
    generatedAt: new Date(),
    ...overrides,
  }
}

describe('GET /api/doctor/patients/[id]/insights', () => {
  let mockDeps: Dependencies

  beforeEach(() => {
    vi.clearAllMocks()

    mockDeps = {
      getSession: vi.fn(),
      doctorService: {
        verifyPatientBelongsToDoctor: vi.fn(),
      },
      insightsService: {
        generateInsightsSummary: vi.fn(),
      },
    }
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue(null)

    const response = await handleGetPatientInsights('patient-1', mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 401 if session has no user', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({ user: null })

    const response = await handleGetPatientInsights('patient-1', mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 403 if user is not a doctor', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const response = await handleGetPatientInsights('patient-1', mockDeps)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Only doctors can access patient insights')
  })

  it('should return 404 if patient does not exist', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.verifyPatientBelongsToDoctor).mockRejectedValue(
      new DoctorServiceError('Patient not found', 'NOT_FOUND')
    )

    const response = await handleGetPatientInsights('nonexistent-patient', mockDeps)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Patient not found')
  })

  it('should return 403 if patient does not belong to this doctor', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.verifyPatientBelongsToDoctor).mockRejectedValue(
      new DoctorServiceError('Unauthorized', 'UNAUTHORIZED')
    )

    const response = await handleGetPatientInsights('patient-other-doctor', mockDeps)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return insights for a valid patient under doctor care', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.verifyPatientBelongsToDoctor).mockResolvedValue(true)

    const mockSummary = createMockInsightsSummary()
    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
      mockSummary
    )

    const response = await handleGetPatientInsights('patient-1', mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.userId).toBe('patient-1')
    expect(data.data.moodTrend).toBe('stable')
    expect(data.data.complianceRate).toBe(75)
  })

  it('should call doctorService to verify patient ownership', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.verifyPatientBelongsToDoctor).mockResolvedValue(true)
    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
      createMockInsightsSummary()
    )

    await handleGetPatientInsights('patient-123', mockDeps)

    expect(mockDeps.doctorService.verifyPatientBelongsToDoctor).toHaveBeenCalledWith(
      'doctor-1',
      'patient-123'
    )
  })

  it('should call insightsService with correct patientId', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.verifyPatientBelongsToDoctor).mockResolvedValue(true)
    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
      createMockInsightsSummary({ userId: 'patient-123' })
    )

    await handleGetPatientInsights('patient-123', mockDeps)

    expect(mockDeps.insightsService.generateInsightsSummary).toHaveBeenCalledWith(
      'patient-123'
    )
  })

  it('should return 500 on insights service error', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.verifyPatientBelongsToDoctor).mockResolvedValue(true)
    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockRejectedValue(
      new Error('Database connection failed')
    )

    const response = await handleGetPatientInsights('patient-1', mockDeps)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })

  it('should handle InsightsServiceError gracefully', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.verifyPatientBelongsToDoctor).mockResolvedValue(true)

    const serviceError = new Error('Failed to fetch daily logs')
    serviceError.name = 'InsightsServiceError'

    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockRejectedValue(
      serviceError
    )

    const response = await handleGetPatientInsights('patient-1', mockDeps)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to generate insights')
  })
})
