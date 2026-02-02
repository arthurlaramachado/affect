import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  InsightsService,
  InsightsServiceError,
  type DailyLogRepository,
  type MoodTrend,
  type WeeklyAverage,
  type MoodRange,
  type AnomalyLog,
} from './insights.service'
import type { DailyLog } from '@/lib/db/schema'
import type { GeminiAnalysis } from '@/types/database'

// Helper to create mock DailyLog
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
    userId: 'user-1',
    moodScore: 5,
    riskFlag: false,
    analysisJson: defaultAnalysis,
    createdAt: new Date(),
    ...overrides,
  }
}

// Helper to create logs with specific mood scores and dates
function createLogsWithMoods(
  moodsWithDates: Array<{ mood: number; daysAgo: number }>
): DailyLog[] {
  const now = new Date()
  return moodsWithDates.map(({ mood, daysAgo }) => {
    const date = new Date(now)
    date.setDate(date.getDate() - daysAgo)
    return createMockDailyLog({
      moodScore: mood,
      createdAt: date,
    })
  })
}

function createMockDailyLogRepository(): DailyLogRepository {
  return {
    findByUserId: vi.fn(),
  }
}

describe('InsightsService', () => {
  let service: InsightsService
  let mockDailyLogRepo: ReturnType<typeof createMockDailyLogRepository>

  beforeEach(() => {
    mockDailyLogRepo = createMockDailyLogRepository()
    service = new InsightsService(mockDailyLogRepo)
  })

  describe('calculateMoodTrend', () => {
    it('should return "improving" when recent moods are higher than older moods', () => {
      // Older logs have lower scores, recent logs have higher scores
      const logs = createLogsWithMoods([
        { mood: 3, daysAgo: 14 },
        { mood: 4, daysAgo: 10 },
        { mood: 5, daysAgo: 7 },
        { mood: 6, daysAgo: 3 },
        { mood: 7, daysAgo: 1 },
      ])

      const result = service.calculateMoodTrend(logs)

      expect(result).toBe('improving')
    })

    it('should return "declining" when recent moods are lower than older moods', () => {
      // Older logs have higher scores, recent logs have lower scores
      const logs = createLogsWithMoods([
        { mood: 8, daysAgo: 14 },
        { mood: 7, daysAgo: 10 },
        { mood: 5, daysAgo: 7 },
        { mood: 4, daysAgo: 3 },
        { mood: 3, daysAgo: 1 },
      ])

      const result = service.calculateMoodTrend(logs)

      expect(result).toBe('declining')
    })

    it('should return "stable" when moods are relatively consistent', () => {
      // All logs have similar scores (within 1 point)
      const logs = createLogsWithMoods([
        { mood: 5, daysAgo: 14 },
        { mood: 5, daysAgo: 10 },
        { mood: 6, daysAgo: 7 },
        { mood: 5, daysAgo: 3 },
        { mood: 5, daysAgo: 1 },
      ])

      const result = service.calculateMoodTrend(logs)

      expect(result).toBe('stable')
    })

    it('should return "stable" for empty logs array', () => {
      const result = service.calculateMoodTrend([])

      expect(result).toBe('stable')
    })

    it('should return "stable" for single log', () => {
      const logs = [createMockDailyLog({ moodScore: 5 })]

      const result = service.calculateMoodTrend(logs)

      expect(result).toBe('stable')
    })

    it('should handle logs not in chronological order', () => {
      // Logs are not sorted by date - service should handle this
      const logs = createLogsWithMoods([
        { mood: 7, daysAgo: 1 }, // Most recent
        { mood: 3, daysAgo: 14 }, // Oldest
        { mood: 5, daysAgo: 7 },
        { mood: 6, daysAgo: 3 },
        { mood: 4, daysAgo: 10 },
      ])

      const result = service.calculateMoodTrend(logs)

      expect(result).toBe('improving')
    })
  })

  describe('getWeeklyAverages', () => {
    it('should calculate weekly averages correctly', () => {
      // Use fixed dates to ensure logs fall into different weeks
      // Week 1: Jan 8-10 (Wednesday-Friday of week starting Jan 5)
      // Week 2: Jan 1-3 (Wednesday-Friday of week starting Dec 29)
      const week1Logs = [
        createMockDailyLog({ moodScore: 6, createdAt: new Date('2025-01-08T12:00:00Z') }),
        createMockDailyLog({ moodScore: 7, createdAt: new Date('2025-01-09T12:00:00Z') }),
        createMockDailyLog({ moodScore: 8, createdAt: new Date('2025-01-10T12:00:00Z') }),
      ]
      const week2Logs = [
        createMockDailyLog({ moodScore: 4, createdAt: new Date('2025-01-01T12:00:00Z') }),
        createMockDailyLog({ moodScore: 5, createdAt: new Date('2025-01-02T12:00:00Z') }),
        createMockDailyLog({ moodScore: 6, createdAt: new Date('2025-01-03T12:00:00Z') }),
      ]
      const logs = [...week1Logs, ...week2Logs]

      const result = service.getWeeklyAverages(logs)

      expect(result.length).toBe(2)
      // Find the most recent week (Jan 5 start)
      const sortedResult = [...result].sort(
        (a, b) => b.weekStart.getTime() - a.weekStart.getTime()
      )
      expect(sortedResult[0].averageMood).toBe(7) // avg of 6,7,8
      expect(sortedResult[0].logCount).toBe(3)
      expect(sortedResult[1].averageMood).toBe(5) // avg of 4,5,6
      expect(sortedResult[1].logCount).toBe(3)
    })

    it('should return empty array for empty logs', () => {
      const result = service.getWeeklyAverages([])

      expect(result).toEqual([])
    })

    it('should handle single week of logs', () => {
      // Use fixed dates in the same week (Jan 6-7, 2025 are Mon-Tue)
      const logs = [
        createMockDailyLog({ moodScore: 4, createdAt: new Date('2025-01-06T12:00:00Z') }),
        createMockDailyLog({ moodScore: 6, createdAt: new Date('2025-01-07T12:00:00Z') }),
      ]

      const result = service.getWeeklyAverages(logs)

      expect(result.length).toBe(1)
      expect(result[0].averageMood).toBe(5)
      expect(result[0].logCount).toBe(2)
    })

    it('should have correct weekStart and weekEnd dates', () => {
      const logs = createLogsWithMoods([{ mood: 5, daysAgo: 0 }])

      const result = service.getWeeklyAverages(logs)

      expect(result.length).toBe(1)
      expect(result[0].weekStart).toBeInstanceOf(Date)
      expect(result[0].weekEnd).toBeInstanceOf(Date)
      expect(result[0].weekEnd.getTime()).toBeGreaterThan(
        result[0].weekStart.getTime()
      )
    })
  })

  describe('getMoodRange', () => {
    it('should calculate min, max, average and stddev correctly', () => {
      const logs = [
        createMockDailyLog({ moodScore: 2 }),
        createMockDailyLog({ moodScore: 4 }),
        createMockDailyLog({ moodScore: 6 }),
        createMockDailyLog({ moodScore: 8 }),
      ]

      const result = service.getMoodRange(logs)

      expect(result.min).toBe(2)
      expect(result.max).toBe(8)
      expect(result.average).toBe(5)
      // stddev of [2,4,6,8] = sqrt(((2-5)^2 + (4-5)^2 + (6-5)^2 + (8-5)^2)/4) = sqrt(5) = ~2.24
      expect(result.stddev).toBeCloseTo(2.236, 2)
    })

    it('should handle single log', () => {
      const logs = [createMockDailyLog({ moodScore: 5 })]

      const result = service.getMoodRange(logs)

      expect(result.min).toBe(5)
      expect(result.max).toBe(5)
      expect(result.average).toBe(5)
      expect(result.stddev).toBe(0)
    })

    it('should handle empty logs array with default values', () => {
      const result = service.getMoodRange([])

      expect(result.min).toBe(0)
      expect(result.max).toBe(0)
      expect(result.average).toBe(0)
      expect(result.stddev).toBe(0)
    })

    it('should handle all same mood scores', () => {
      const logs = [
        createMockDailyLog({ moodScore: 5 }),
        createMockDailyLog({ moodScore: 5 }),
        createMockDailyLog({ moodScore: 5 }),
      ]

      const result = service.getMoodRange(logs)

      expect(result.min).toBe(5)
      expect(result.max).toBe(5)
      expect(result.average).toBe(5)
      expect(result.stddev).toBe(0)
    })
  })

  describe('getComplianceRate', () => {
    it('should return 100% for daily check-ins over requested period', () => {
      // 7 logs for 7 days
      const logs = createLogsWithMoods([
        { mood: 5, daysAgo: 0 },
        { mood: 5, daysAgo: 1 },
        { mood: 5, daysAgo: 2 },
        { mood: 5, daysAgo: 3 },
        { mood: 5, daysAgo: 4 },
        { mood: 5, daysAgo: 5 },
        { mood: 5, daysAgo: 6 },
      ])

      const result = service.getComplianceRate(logs, 7)

      expect(result).toBe(100)
    })

    it('should return correct percentage for partial compliance', () => {
      // 5 logs for 10 days = 50%
      const logs = createLogsWithMoods([
        { mood: 5, daysAgo: 1 },
        { mood: 5, daysAgo: 3 },
        { mood: 5, daysAgo: 5 },
        { mood: 5, daysAgo: 7 },
        { mood: 5, daysAgo: 9 },
      ])

      const result = service.getComplianceRate(logs, 10)

      expect(result).toBe(50)
    })

    it('should return 0% for no check-ins', () => {
      const result = service.getComplianceRate([], 7)

      expect(result).toBe(0)
    })

    it('should only count logs within the requested period', () => {
      // Logs outside the 7-day window should not count
      const logs = createLogsWithMoods([
        { mood: 5, daysAgo: 0 },
        { mood: 5, daysAgo: 1 },
        { mood: 5, daysAgo: 10 }, // Outside 7-day window
        { mood: 5, daysAgo: 15 }, // Outside 7-day window
      ])

      const result = service.getComplianceRate(logs, 7)

      // Only 2 logs in the 7-day period = ~28.57%
      expect(result).toBeCloseTo(28.57, 1)
    })

    it('should count only unique days (multiple logs per day count as one)', () => {
      // 2 logs on same day should count as 1 day
      const now = new Date()
      const logs = [
        createMockDailyLog({ createdAt: now }),
        createMockDailyLog({ createdAt: now }), // Same day
      ]

      const result = service.getComplianceRate(logs, 7)

      // Only 1 unique day out of 7 = ~14.29%
      expect(result).toBeCloseTo(14.29, 1)
    })

    it('should handle days parameter of 0', () => {
      const logs = createLogsWithMoods([{ mood: 5, daysAgo: 0 }])

      const result = service.getComplianceRate(logs, 0)

      expect(result).toBe(0)
    })
  })

  describe('detectAnomalies', () => {
    it('should detect sudden mood drops greater than 3 points', () => {
      const logs = createLogsWithMoods([
        { mood: 8, daysAgo: 3 },
        { mood: 7, daysAgo: 2 },
        { mood: 3, daysAgo: 1 }, // Drop of 4 points
      ])

      const result = service.detectAnomalies(logs)

      expect(result.length).toBe(1)
      expect(result[0].moodDelta).toBeLessThanOrEqual(-4)
      expect(result[0].log.moodScore).toBe(3)
      expect(result[0].previousLog.moodScore).toBe(7)
    })

    it('should detect sudden mood increases greater than 3 points', () => {
      const logs = createLogsWithMoods([
        { mood: 3, daysAgo: 3 },
        { mood: 4, daysAgo: 2 },
        { mood: 9, daysAgo: 1 }, // Increase of 5 points
      ])

      const result = service.detectAnomalies(logs)

      expect(result.length).toBe(1)
      expect(result[0].moodDelta).toBeGreaterThanOrEqual(4)
      expect(result[0].log.moodScore).toBe(9)
    })

    it('should not flag changes of 3 points or less', () => {
      const logs = createLogsWithMoods([
        { mood: 5, daysAgo: 3 },
        { mood: 8, daysAgo: 2 }, // Change of 3 points - not an anomaly
        { mood: 5, daysAgo: 1 }, // Change of -3 points - not an anomaly
      ])

      const result = service.detectAnomalies(logs)

      expect(result.length).toBe(0)
    })

    it('should return empty array for empty logs', () => {
      const result = service.detectAnomalies([])

      expect(result).toEqual([])
    })

    it('should return empty array for single log', () => {
      const logs = [createMockDailyLog({ moodScore: 5 })]

      const result = service.detectAnomalies(logs)

      expect(result).toEqual([])
    })

    it('should detect multiple anomalies', () => {
      const logs = createLogsWithMoods([
        { mood: 5, daysAgo: 5 },
        { mood: 9, daysAgo: 4 }, // +4 anomaly
        { mood: 8, daysAgo: 3 },
        { mood: 3, daysAgo: 2 }, // -5 anomaly
        { mood: 4, daysAgo: 1 },
      ])

      const result = service.detectAnomalies(logs)

      expect(result.length).toBe(2)
    })

    it('should order anomalies chronologically (most recent first)', () => {
      const logs = createLogsWithMoods([
        { mood: 5, daysAgo: 5 },
        { mood: 9, daysAgo: 4 }, // First anomaly (older)
        { mood: 8, daysAgo: 3 },
        { mood: 3, daysAgo: 2 }, // Second anomaly (newer)
        { mood: 4, daysAgo: 1 },
      ])

      const result = service.detectAnomalies(logs)

      expect(result.length).toBe(2)
      // Most recent anomaly should be first
      expect(result[0].log.moodScore).toBe(3)
      expect(result[1].log.moodScore).toBe(9)
    })
  })

  describe('generateInsightsSummary', () => {
    it('should generate complete insights summary for user', async () => {
      const userId = 'user-1'
      const logs = createLogsWithMoods([
        { mood: 3, daysAgo: 14 },
        { mood: 4, daysAgo: 10 },
        { mood: 5, daysAgo: 7 },
        { mood: 6, daysAgo: 3 },
        { mood: 7, daysAgo: 1 },
      ])

      vi.mocked(mockDailyLogRepo.findByUserId).mockResolvedValue(logs)

      const result = await service.generateInsightsSummary(userId)

      expect(result.userId).toBe(userId)
      expect(result.moodTrend).toBe('improving')
      expect(result.weeklyAverages.length).toBeGreaterThan(0)
      expect(result.moodRange).toBeDefined()
      expect(result.moodRange.min).toBe(3)
      expect(result.moodRange.max).toBe(7)
      expect(typeof result.complianceRate).toBe('number')
      expect(Array.isArray(result.anomalies)).toBe(true)
      expect(result.generatedAt).toBeInstanceOf(Date)
    })

    it('should call repository with correct userId', async () => {
      const userId = 'user-123'
      vi.mocked(mockDailyLogRepo.findByUserId).mockResolvedValue([])

      await service.generateInsightsSummary(userId)

      expect(mockDailyLogRepo.findByUserId).toHaveBeenCalledWith(userId)
    })

    it('should handle user with no logs', async () => {
      vi.mocked(mockDailyLogRepo.findByUserId).mockResolvedValue([])

      const result = await service.generateInsightsSummary('user-1')

      expect(result.moodTrend).toBe('stable')
      expect(result.weeklyAverages).toEqual([])
      expect(result.moodRange.min).toBe(0)
      expect(result.moodRange.max).toBe(0)
      expect(result.complianceRate).toBe(0)
      expect(result.anomalies).toEqual([])
    })

    it('should throw InsightsServiceError on repository failure', async () => {
      vi.mocked(mockDailyLogRepo.findByUserId).mockRejectedValue(
        new Error('Database error')
      )

      await expect(service.generateInsightsSummary('user-1')).rejects.toThrow(
        InsightsServiceError
      )
    })

    it('should calculate compliance rate for last 30 days', async () => {
      // Create logs for exactly 15 out of 30 days
      const logs = createLogsWithMoods(
        Array.from({ length: 15 }, (_, i) => ({
          mood: 5,
          daysAgo: i * 2, // Every other day
        }))
      )

      vi.mocked(mockDailyLogRepo.findByUserId).mockResolvedValue(logs)

      const result = await service.generateInsightsSummary('user-1')

      expect(result.complianceRate).toBe(50)
    })
  })
})
