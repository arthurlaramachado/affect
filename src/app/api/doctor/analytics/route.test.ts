import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleGetDoctorAnalytics, type Dependencies } from './route'
import type { PatientSummary } from '@/lib/services/doctor.service'
import type { InsightsSummary } from '@/lib/services/insights.service'

function createMockPatientSummary(
  overrides: Partial<PatientSummary> = {}
): PatientSummary {
  return {
    id: 'patient-1',
    name: 'John Doe',
    email: 'john@example.com',
    lastCheckIn: new Date(),
    moodScore: 6,
    riskLevel: 'stable',
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
      average: 5.5,
      stddev: 1.5,
    },
    complianceRate: 75,
    anomalies: [],
    generatedAt: new Date(),
    ...overrides,
  }
}

describe('GET /api/doctor/analytics', () => {
  let mockDeps: Dependencies

  beforeEach(() => {
    vi.clearAllMocks()

    mockDeps = {
      getSession: vi.fn(),
      doctorService: {
        getPatients: vi.fn(),
      },
      insightsService: {
        generateInsightsSummary: vi.fn(),
      },
    }
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue(null)

    const response = await handleGetDoctorAnalytics(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 401 if session has no user', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({ user: null })

    const response = await handleGetDoctorAnalytics(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should return 403 if user is not a doctor', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const response = await handleGetDoctorAnalytics(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Only doctors can access analytics')
  })

  it('should return aggregate analytics for all patients under doctor care', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    const mockPatients = [
      createMockPatientSummary({ id: 'patient-1', moodScore: 7, riskLevel: 'stable' }),
      createMockPatientSummary({ id: 'patient-2', moodScore: 4, riskLevel: 'drift' }),
      createMockPatientSummary({ id: 'patient-3', moodScore: 2, riskLevel: 'alert' }),
    ]

    vi.mocked(mockDeps.doctorService.getPatients).mockResolvedValue(mockPatients)

    vi.mocked(mockDeps.insightsService.generateInsightsSummary)
      .mockResolvedValueOnce(createMockInsightsSummary({ complianceRate: 80 }))
      .mockResolvedValueOnce(createMockInsightsSummary({ complianceRate: 60 }))
      .mockResolvedValueOnce(createMockInsightsSummary({ complianceRate: 90 }))

    const response = await handleGetDoctorAnalytics(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveProperty('totalPatients', 3)
    expect(data.data).toHaveProperty('moodDistribution')
    expect(data.data).toHaveProperty('riskBreakdown')
    expect(data.data).toHaveProperty('averageCompliance')
  })

  it('should return correct mood distribution', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    const mockPatients = [
      createMockPatientSummary({ id: 'patient-1', moodScore: 8, riskLevel: 'stable' }),
      createMockPatientSummary({ id: 'patient-2', moodScore: 6, riskLevel: 'stable' }),
      createMockPatientSummary({ id: 'patient-3', moodScore: 4, riskLevel: 'drift' }),
    ]

    vi.mocked(mockDeps.doctorService.getPatients).mockResolvedValue(mockPatients)

    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
      createMockInsightsSummary({ complianceRate: 70 })
    )

    const response = await handleGetDoctorAnalytics(mockDeps)
    const data = await response.json()

    expect(data.data.moodDistribution.average).toBe(6)
    expect(data.data.moodDistribution.min).toBe(4)
    expect(data.data.moodDistribution.max).toBe(8)
  })

  it('should return correct risk breakdown', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    const mockPatients = [
      createMockPatientSummary({ id: 'patient-1', riskLevel: 'stable' }),
      createMockPatientSummary({ id: 'patient-2', riskLevel: 'stable' }),
      createMockPatientSummary({ id: 'patient-3', riskLevel: 'drift' }),
      createMockPatientSummary({ id: 'patient-4', riskLevel: 'alert' }),
      createMockPatientSummary({ id: 'patient-5', riskLevel: 'unknown' }),
    ]

    vi.mocked(mockDeps.doctorService.getPatients).mockResolvedValue(mockPatients)
    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
      createMockInsightsSummary({ complianceRate: 70 })
    )

    const response = await handleGetDoctorAnalytics(mockDeps)
    const data = await response.json()

    expect(data.data.riskBreakdown).toEqual({
      stable: 2,
      drift: 1,
      alert: 1,
      unknown: 1,
    })
  })

  it('should return correct average compliance', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    const mockPatients = [
      createMockPatientSummary({ id: 'patient-1' }),
      createMockPatientSummary({ id: 'patient-2' }),
    ]

    vi.mocked(mockDeps.doctorService.getPatients).mockResolvedValue(mockPatients)

    vi.mocked(mockDeps.insightsService.generateInsightsSummary)
      .mockResolvedValueOnce(createMockInsightsSummary({ complianceRate: 80 }))
      .mockResolvedValueOnce(createMockInsightsSummary({ complianceRate: 60 }))

    const response = await handleGetDoctorAnalytics(mockDeps)
    const data = await response.json()

    expect(data.data.averageCompliance).toBe(70)
  })

  it('should handle empty patient list', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.getPatients).mockResolvedValue([])

    const response = await handleGetDoctorAnalytics(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.totalPatients).toBe(0)
    expect(data.data.averageCompliance).toBe(0)
    expect(data.data.moodDistribution.average).toBe(0)
    expect(data.data.riskBreakdown).toEqual({
      stable: 0,
      drift: 0,
      alert: 0,
      unknown: 0,
    })
  })

  it('should return 500 on doctor service error', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.getPatients).mockRejectedValue(
      new Error('Database connection failed')
    )

    const response = await handleGetDoctorAnalytics(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })

  it('should handle partial insights service failures gracefully', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    const mockPatients = [
      createMockPatientSummary({ id: 'patient-1' }),
      createMockPatientSummary({ id: 'patient-2' }),
    ]

    vi.mocked(mockDeps.doctorService.getPatients).mockResolvedValue(mockPatients)

    // First patient succeeds, second fails
    vi.mocked(mockDeps.insightsService.generateInsightsSummary)
      .mockResolvedValueOnce(createMockInsightsSummary({ complianceRate: 80 }))
      .mockRejectedValueOnce(new Error('Failed to generate insights'))

    const response = await handleGetDoctorAnalytics(mockDeps)
    const data = await response.json()

    // Should still return partial data with one patient's compliance
    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.averageCompliance).toBe(80) // Only from successful patient
  })

  it('should call doctorService.getPatients with correct doctorId', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-123', role: 'doctor' },
    })

    vi.mocked(mockDeps.doctorService.getPatients).mockResolvedValue([])

    await handleGetDoctorAnalytics(mockDeps)

    expect(mockDeps.doctorService.getPatients).toHaveBeenCalledWith('doctor-123')
  })

  it('should handle patients with null mood scores', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    const mockPatients = [
      createMockPatientSummary({ id: 'patient-1', moodScore: 7, riskLevel: 'stable' }),
      createMockPatientSummary({ id: 'patient-2', moodScore: null, riskLevel: 'unknown' }),
    ]

    vi.mocked(mockDeps.doctorService.getPatients).mockResolvedValue(mockPatients)
    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
      createMockInsightsSummary({ complianceRate: 70 })
    )

    const response = await handleGetDoctorAnalytics(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Average should only consider valid scores
    expect(data.data.moodDistribution.average).toBe(7)
  })
})
