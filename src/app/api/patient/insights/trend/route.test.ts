import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleGetTrend, type Dependencies } from './route'
import type { MoodTrend, WeeklyAverage } from '@/lib/services/insights.service'
import type { DailyLog } from '@/lib/db/schema'
import type { GeminiAnalysis } from '@/types/database'

function createMockWeeklyAverages(): WeeklyAverage[] {
  return [
    {
      weekStart: new Date('2025-01-05'),
      weekEnd: new Date('2025-01-11'),
      averageMood: 5,
      logCount: 5,
    },
    {
      weekStart: new Date('2025-01-12'),
      weekEnd: new Date('2025-01-18'),
      averageMood: 6,
      logCount: 6,
    },
    {
      weekStart: new Date('2025-01-19'),
      weekEnd: new Date('2025-01-25'),
      averageMood: 7,
      logCount: 4,
    },
  ]
}

function createMockDailyLog(overrides: Partial<DailyLog> = {}): DailyLog {
  const defaultAnalysis: GeminiAnalysis = {
    mood_score: 5,
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
    clinical_summary: 'Test summary',
  }

  return {
    id: crypto.randomUUID(),
    userId: 'patient-1',
    moodScore: 5,
    riskFlag: false,
    analysisJson: defaultAnalysis,
    createdAt: new Date(),
    ...overrides,
  }
}

describe('GET /api/patient/insights/trend', () => {
  let mockDeps: Dependencies

  beforeEach(() => {
    mockDeps = {
      getSession: vi.fn(),
      insightsService: {
        calculateMoodTrend: vi.fn(),
        getWeeklyAverages: vi.fn(),
      },
      dailyLogRepository: {
        findByUserId: vi.fn(),
      },
    }
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue(null)

    const response = await handleGetTrend(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 401 if session has no user', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({ user: null })

    const response = await handleGetTrend(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should return 403 if user is not a patient', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    const response = await handleGetTrend(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Only patients can access trend data')
  })

  it('should return weekly averages and mood trend for authenticated patient', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const mockLogs = [
      createMockDailyLog({ moodScore: 5 }),
      createMockDailyLog({ moodScore: 6 }),
      createMockDailyLog({ moodScore: 7 }),
    ]
    const mockWeeklyAverages = createMockWeeklyAverages()
    const mockMoodTrend: MoodTrend = 'improving'

    vi.mocked(mockDeps.dailyLogRepository.findByUserId).mockResolvedValue(mockLogs)
    vi.mocked(mockDeps.insightsService.getWeeklyAverages).mockReturnValue(
      mockWeeklyAverages
    )
    vi.mocked(mockDeps.insightsService.calculateMoodTrend).mockReturnValue(
      mockMoodTrend
    )

    const response = await handleGetTrend(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.moodTrend).toBe('improving')
    expect(data.data.weeklyAverages).toHaveLength(3)
  })

  it('should call dailyLogRepository with correct userId', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-456', role: 'patient' },
    })

    vi.mocked(mockDeps.dailyLogRepository.findByUserId).mockResolvedValue([])
    vi.mocked(mockDeps.insightsService.getWeeklyAverages).mockReturnValue([])
    vi.mocked(mockDeps.insightsService.calculateMoodTrend).mockReturnValue('stable')

    await handleGetTrend(mockDeps)

    expect(mockDeps.dailyLogRepository.findByUserId).toHaveBeenCalledWith(
      'patient-456'
    )
  })

  it('should return empty data for patient with no logs', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    vi.mocked(mockDeps.dailyLogRepository.findByUserId).mockResolvedValue([])
    vi.mocked(mockDeps.insightsService.getWeeklyAverages).mockReturnValue([])
    vi.mocked(mockDeps.insightsService.calculateMoodTrend).mockReturnValue('stable')

    const response = await handleGetTrend(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.moodTrend).toBe('stable')
    expect(data.data.weeklyAverages).toHaveLength(0)
  })

  it('should return 500 on repository error', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    vi.mocked(mockDeps.dailyLogRepository.findByUserId).mockRejectedValue(
      new Error('Database connection failed')
    )

    const response = await handleGetTrend(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })

  it('should return 500 on service error', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    vi.mocked(mockDeps.dailyLogRepository.findByUserId).mockResolvedValue([
      createMockDailyLog(),
    ])
    vi.mocked(mockDeps.insightsService.getWeeklyAverages).mockImplementation(() => {
      throw new Error('Service error')
    })

    const response = await handleGetTrend(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })

  it('should include generatedAt timestamp in response', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    vi.mocked(mockDeps.dailyLogRepository.findByUserId).mockResolvedValue([])
    vi.mocked(mockDeps.insightsService.getWeeklyAverages).mockReturnValue([])
    vi.mocked(mockDeps.insightsService.calculateMoodTrend).mockReturnValue('stable')

    const response = await handleGetTrend(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.data.generatedAt).toBeDefined()
  })
})
