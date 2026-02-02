import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleGetInsights, type Dependencies } from './route'
import type { InsightsSummary } from '@/lib/services/insights.service'

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

describe('GET /api/patient/insights', () => {
  let mockDeps: Dependencies

  beforeEach(() => {
    mockDeps = {
      getSession: vi.fn(),
      insightsService: {
        generateInsightsSummary: vi.fn(),
      },
    }
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue(null)

    const response = await handleGetInsights(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 401 if session has no user', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({ user: null })

    const response = await handleGetInsights(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should return 403 if user is not a patient', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    const response = await handleGetInsights(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Only patients can access insights')
  })

  it('should return insights summary for authenticated patient', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const mockSummary = createMockInsightsSummary()
    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
      mockSummary
    )

    const response = await handleGetInsights(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.userId).toBe('patient-1')
    expect(data.data.moodTrend).toBe('stable')
    expect(data.data.complianceRate).toBe(75)
  })

  it('should call insightsService with correct userId', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-123', role: 'patient' },
    })

    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockResolvedValue(
      createMockInsightsSummary({ userId: 'patient-123' })
    )

    await handleGetInsights(mockDeps)

    expect(mockDeps.insightsService.generateInsightsSummary).toHaveBeenCalledWith(
      'patient-123'
    )
  })

  it('should return 500 on service error', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockRejectedValue(
      new Error('Database connection failed')
    )

    const response = await handleGetInsights(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })

  it('should handle InsightsServiceError gracefully', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const serviceError = new Error('Failed to fetch daily logs')
    serviceError.name = 'InsightsServiceError'

    vi.mocked(mockDeps.insightsService.generateInsightsSummary).mockRejectedValue(
      serviceError
    )

    const response = await handleGetInsights(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Failed to generate insights')
  })
})
