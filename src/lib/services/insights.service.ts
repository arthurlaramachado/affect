import type { DailyLog } from '@/lib/db/schema'

export class InsightsServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'InsightsServiceError'
  }
}

// Types for insights calculations
export type MoodTrend = 'improving' | 'stable' | 'declining'

export interface WeeklyAverage {
  weekStart: Date
  weekEnd: Date
  averageMood: number
  logCount: number
}

export interface MoodRange {
  min: number
  max: number
  average: number
  stddev: number
}

export interface AnomalyLog {
  log: DailyLog
  previousLog: DailyLog
  moodDelta: number
}

export interface InsightsSummary {
  userId: string
  moodTrend: MoodTrend
  weeklyAverages: WeeklyAverage[]
  moodRange: MoodRange
  complianceRate: number
  anomalies: AnomalyLog[]
  generatedAt: Date
}

// Repository interface for dependency injection
// This matches the existing DailyLogRepository from @/lib/db/repositories
export interface DailyLogRepository {
  findByUserId(userId: string, limit?: number): Promise<DailyLog[]>
}

// Constants
const COMPLIANCE_PERIOD_DAYS = 30
const ANOMALY_THRESHOLD = 3
const TREND_THRESHOLD = 1

// Helper function to sort logs by date (oldest first)
function sortLogsByDate(logs: DailyLog[]): DailyLog[] {
  return [...logs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
}

// Helper function to calculate average mood score from logs
function calculateAverageMood(logs: DailyLog[]): number {
  if (logs.length === 0) return 0
  return logs.reduce((sum, log) => sum + log.moodScore, 0) / logs.length
}

// Helper to get start of week (Sunday)
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() - day)
  d.setHours(0, 0, 0, 0)
  return d
}

// Helper to get end of week (Saturday)
function getWeekEnd(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (6 - day))
  d.setHours(23, 59, 59, 999)
  return d
}

export class InsightsService {
  constructor(private dailyLogRepository: DailyLogRepository) {}

  calculateMoodTrend(logs: DailyLog[]): MoodTrend {
    if (logs.length <= 1) {
      return 'stable'
    }

    const sortedLogs = sortLogsByDate(logs)
    const midpoint = Math.floor(sortedLogs.length / 2)

    // Split into older and newer halves
    const olderHalf = sortedLogs.slice(0, midpoint)
    const newerHalf = sortedLogs.slice(midpoint)

    // Calculate average mood for each half
    const olderAvg = calculateAverageMood(olderHalf)
    const newerAvg = calculateAverageMood(newerHalf)
    const difference = newerAvg - olderAvg

    if (difference > TREND_THRESHOLD) {
      return 'improving'
    } else if (difference < -TREND_THRESHOLD) {
      return 'declining'
    }

    return 'stable'
  }

  getWeeklyAverages(logs: DailyLog[]): WeeklyAverage[] {
    if (logs.length === 0) {
      return []
    }

    // Group logs by week
    const weekMap = new Map<string, DailyLog[]>()

    for (const log of logs) {
      const weekStart = getWeekStart(new Date(log.createdAt))
      const key = weekStart.toISOString()

      const existing = weekMap.get(key) || []
      weekMap.set(key, [...existing, log])
    }

    // Calculate averages for each week
    const weeklyAverages: WeeklyAverage[] = []

    for (const [weekStartKey, weekLogs] of weekMap.entries()) {
      const weekStart = new Date(weekStartKey)
      const weekEnd = getWeekEnd(weekStart)
      const averageMood = calculateAverageMood(weekLogs)

      weeklyAverages.push({
        weekStart,
        weekEnd,
        averageMood,
        logCount: weekLogs.length,
      })
    }

    // Sort by week start date (oldest first)
    return weeklyAverages.sort(
      (a, b) => a.weekStart.getTime() - b.weekStart.getTime()
    )
  }

  getMoodRange(logs: DailyLog[]): MoodRange {
    if (logs.length === 0) {
      return {
        min: 0,
        max: 0,
        average: 0,
        stddev: 0,
      }
    }

    const scores = logs.map((log) => log.moodScore)
    const min = Math.min(...scores)
    const max = Math.max(...scores)
    const average = scores.reduce((sum, score) => sum + score, 0) / scores.length

    // Calculate standard deviation
    const squaredDiffs = scores.map((score) => Math.pow(score - average, 2))
    const avgSquaredDiff =
      squaredDiffs.reduce((sum, diff) => sum + diff, 0) / scores.length
    const stddev = Math.sqrt(avgSquaredDiff)

    return {
      min,
      max,
      average,
      stddev,
    }
  }

  getComplianceRate(logs: DailyLog[], days: number): number {
    if (days <= 0) {
      return 0
    }

    const now = new Date()
    const startDate = new Date(now)
    startDate.setDate(startDate.getDate() - days + 1)
    startDate.setHours(0, 0, 0, 0)

    // Filter logs within the date range
    const logsInRange = logs.filter((log) => {
      const logDate = new Date(log.createdAt)
      return logDate >= startDate && logDate <= now
    })

    // Count unique days with check-ins
    const uniqueDays = new Set<string>()
    for (const log of logsInRange) {
      const logDate = new Date(log.createdAt)
      const dateKey = `${logDate.getFullYear()}-${logDate.getMonth()}-${logDate.getDate()}`
      uniqueDays.add(dateKey)
    }

    return (uniqueDays.size / days) * 100
  }

  detectAnomalies(logs: DailyLog[]): AnomalyLog[] {
    if (logs.length <= 1) {
      return []
    }

    const sortedLogs = sortLogsByDate(logs)
    const anomalies: AnomalyLog[] = []

    for (let i = 1; i < sortedLogs.length; i++) {
      const previousLog = sortedLogs[i - 1]
      const currentLog = sortedLogs[i]
      const moodDelta = currentLog.moodScore - previousLog.moodScore

      // Detect changes greater than threshold (more than 3 points)
      if (Math.abs(moodDelta) > ANOMALY_THRESHOLD) {
        anomalies.push({
          log: currentLog,
          previousLog,
          moodDelta,
        })
      }
    }

    // Sort by date descending (most recent first)
    return anomalies.sort(
      (a, b) =>
        new Date(b.log.createdAt).getTime() -
        new Date(a.log.createdAt).getTime()
    )
  }

  async generateInsightsSummary(userId: string): Promise<InsightsSummary> {
    let logs: DailyLog[]

    try {
      logs = await this.dailyLogRepository.findByUserId(userId)
    } catch (error) {
      throw new InsightsServiceError(
        'Failed to fetch daily logs',
        'FETCH_LOGS_FAILED'
      )
    }

    return {
      userId,
      moodTrend: this.calculateMoodTrend(logs),
      weeklyAverages: this.getWeeklyAverages(logs),
      moodRange: this.getMoodRange(logs),
      complianceRate: this.getComplianceRate(logs, COMPLIANCE_PERIOD_DAYS),
      anomalies: this.detectAnomalies(logs),
      generatedAt: new Date(),
    }
  }
}
