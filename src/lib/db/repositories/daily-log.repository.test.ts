import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createDailyLogRepository } from './daily-log.repository'
import type { DailyLog, NewDailyLog } from '../schema'
import type { GeminiAnalysis } from '@/types/database'

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
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

describe('DailyLogRepository', () => {
  let dailyLogRepository: ReturnType<typeof createDailyLogRepository>

  beforeEach(() => {
    vi.clearAllMocks()
    dailyLogRepository = createDailyLogRepository(mockDb as never)
  })

  describe('findById', () => {
    it('should return daily log when found', async () => {
      const mockLog: DailyLog = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        userId: 'user-123',
        moodScore: 7,
        riskFlag: false,
        analysisJson: mockAnalysis,
        createdAt: new Date(),
      }

      mockDb.limit.mockResolvedValueOnce([mockLog])

      const result = await dailyLogRepository.findById(mockLog.id)

      expect(result).toEqual(mockLog)
    })

    it('should return null when not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await dailyLogRepository.findById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('findByUserId', () => {
    it('should return all logs for a user ordered by date desc', async () => {
      const logs: DailyLog[] = [
        {
          id: 'log-2',
          userId: 'user-123',
          moodScore: 8,
          riskFlag: false,
          analysisJson: mockAnalysis,
          createdAt: new Date('2024-01-02'),
        },
        {
          id: 'log-1',
          userId: 'user-123',
          moodScore: 7,
          riskFlag: false,
          analysisJson: mockAnalysis,
          createdAt: new Date('2024-01-01'),
        },
      ]

      mockDb.limit.mockResolvedValueOnce(logs)

      const result = await dailyLogRepository.findByUserId('user-123')

      expect(result).toEqual(logs)
      expect(mockDb.orderBy).toHaveBeenCalled()
    })

    it('should respect limit parameter', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      await dailyLogRepository.findByUserId('user-123', 5)

      expect(mockDb.limit).toHaveBeenCalledWith(5)
    })
  })

  describe('create', () => {
    it('should create a new daily log', async () => {
      const newLog: NewDailyLog = {
        userId: 'user-123',
        moodScore: 7,
        riskFlag: false,
        analysisJson: mockAnalysis,
      }

      const createdLog: DailyLog = {
        id: 'new-log-id',
        ...newLog,
        createdAt: new Date(),
      }

      mockDb.returning.mockResolvedValueOnce([createdLog])

      const result = await dailyLogRepository.create(newLog)

      expect(result).toEqual(createdLog)
      expect(mockDb.insert).toHaveBeenCalled()
    })
  })

  describe('getStreak', () => {
    it('should calculate consecutive days streak', async () => {
      const today = new Date()
      const yesterday = new Date(today)
      yesterday.setDate(yesterday.getDate() - 1)
      const dayBefore = new Date(today)
      dayBefore.setDate(dayBefore.getDate() - 2)

      const logs: DailyLog[] = [
        {
          id: 'log-3',
          userId: 'user-123',
          moodScore: 7,
          riskFlag: false,
          analysisJson: mockAnalysis,
          createdAt: today,
        },
        {
          id: 'log-2',
          userId: 'user-123',
          moodScore: 6,
          riskFlag: false,
          analysisJson: mockAnalysis,
          createdAt: yesterday,
        },
        {
          id: 'log-1',
          userId: 'user-123',
          moodScore: 5,
          riskFlag: false,
          analysisJson: mockAnalysis,
          createdAt: dayBefore,
        },
      ]

      mockDb.orderBy.mockResolvedValueOnce(logs)

      const result = await dailyLogRepository.getStreak('user-123')

      expect(result.currentStreak).toBe(3)
    })

    it('should return 0 streak when no logs exist', async () => {
      mockDb.orderBy.mockResolvedValueOnce([])

      const result = await dailyLogRepository.getStreak('user-123')

      expect(result.currentStreak).toBe(0)
    })
  })

  describe('getLatestByUserId', () => {
    it('should return the most recent log for a user', async () => {
      const latestLog: DailyLog = {
        id: 'log-latest',
        userId: 'user-123',
        moodScore: 8,
        riskFlag: false,
        analysisJson: mockAnalysis,
        createdAt: new Date(),
      }

      mockDb.limit.mockResolvedValueOnce([latestLog])

      const result = await dailyLogRepository.getLatestByUserId('user-123')

      expect(result).toEqual(latestLog)
    })

    it('should return null when user has no logs', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await dailyLogRepository.getLatestByUserId('user-123')

      expect(result).toBeNull()
    })
  })
})
