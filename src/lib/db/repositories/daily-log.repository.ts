import { eq, desc } from 'drizzle-orm'
import { dailyLogs, type DailyLog, type NewDailyLog } from '../schema'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { db } from '@/lib/db'

export interface StreakInfo {
  currentStreak: number
  longestStreak: number
  totalCheckIns: number
  lastCheckIn: Date | null
}

export interface DailyLogRepository {
  findById(id: string): Promise<DailyLog | null>
  findByUserId(userId: string, limit?: number): Promise<DailyLog[]>
  findAllByUserId(userId: string): Promise<DailyLog[]>
  create(data: NewDailyLog): Promise<DailyLog>
  getStreak(userId: string): Promise<StreakInfo>
  getLatestByUserId(userId: string): Promise<DailyLog | null>
  getMoodHistory(userId: string, days?: number): Promise<DailyLog[]>
  hasCheckedInToday(userId: string): Promise<boolean>
}

function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

function isConsecutiveDay(current: Date, previous: Date): boolean {
  const diff = new Date(current)
  diff.setDate(diff.getDate() - 1)
  return isSameDay(diff, previous)
}

function calculateStreak(logs: DailyLog[]): StreakInfo {
  if (logs.length === 0) {
    return { currentStreak: 0, longestStreak: 0, totalCheckIns: 0, lastCheckIn: null }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const sortedLogs = [...logs].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  )

  let currentStreak = 0
  let longestStreak = 0
  let tempStreak = 1
  let lastDate = new Date(sortedLogs[0].createdAt)
  lastDate.setHours(0, 0, 0, 0)

  // Check if the most recent log is from today or yesterday
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  if (isSameDay(lastDate, today) || isSameDay(lastDate, yesterday)) {
    currentStreak = 1

    for (let i = 1; i < sortedLogs.length; i++) {
      const currentLogDate = new Date(sortedLogs[i].createdAt)
      currentLogDate.setHours(0, 0, 0, 0)

      if (isSameDay(currentLogDate, lastDate)) {
        // Same day, skip
        continue
      }

      if (isConsecutiveDay(lastDate, currentLogDate)) {
        currentStreak++
        lastDate = currentLogDate
      } else {
        break
      }
    }
  }

  // Calculate longest streak
  lastDate = new Date(sortedLogs[0].createdAt)
  lastDate.setHours(0, 0, 0, 0)

  for (let i = 1; i < sortedLogs.length; i++) {
    const currentLogDate = new Date(sortedLogs[i].createdAt)
    currentLogDate.setHours(0, 0, 0, 0)

    if (isSameDay(currentLogDate, lastDate)) {
      continue
    }

    if (isConsecutiveDay(lastDate, currentLogDate)) {
      tempStreak++
    } else {
      longestStreak = Math.max(longestStreak, tempStreak)
      tempStreak = 1
    }
    lastDate = currentLogDate
  }
  longestStreak = Math.max(longestStreak, tempStreak, currentStreak)

  return {
    currentStreak,
    longestStreak,
    totalCheckIns: logs.length,
    lastCheckIn: sortedLogs[0].createdAt,
  }
}

export function createDailyLogRepository(db: NodePgDatabase): DailyLogRepository {
  return {
    async findById(id: string): Promise<DailyLog | null> {
      const result = await db
        .select()
        .from(dailyLogs)
        .where(eq(dailyLogs.id, id))
        .limit(1)

      return result[0] ?? null
    },

    async findByUserId(userId: string, limit = 30): Promise<DailyLog[]> {
      return db
        .select()
        .from(dailyLogs)
        .where(eq(dailyLogs.userId, userId))
        .orderBy(desc(dailyLogs.createdAt))
        .limit(limit)
    },

    async findAllByUserId(userId: string): Promise<DailyLog[]> {
      return db
        .select()
        .from(dailyLogs)
        .where(eq(dailyLogs.userId, userId))
        .orderBy(desc(dailyLogs.createdAt))
    },

    async create(data: NewDailyLog): Promise<DailyLog> {
      const result = await db.insert(dailyLogs).values(data).returning()

      return result[0]
    },

    async getStreak(userId: string): Promise<StreakInfo> {
      const logs = await db
        .select()
        .from(dailyLogs)
        .where(eq(dailyLogs.userId, userId))
        .orderBy(desc(dailyLogs.createdAt))

      return calculateStreak(logs)
    },

    async getLatestByUserId(userId: string): Promise<DailyLog | null> {
      const result = await db
        .select()
        .from(dailyLogs)
        .where(eq(dailyLogs.userId, userId))
        .orderBy(desc(dailyLogs.createdAt))
        .limit(1)

      return result[0] ?? null
    },

    async getMoodHistory(userId: string, days = 30): Promise<DailyLog[]> {
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - days)

      return db
        .select()
        .from(dailyLogs)
        .where(eq(dailyLogs.userId, userId))
        .orderBy(desc(dailyLogs.createdAt))
        .limit(days)
    },

    async hasCheckedInToday(userId: string): Promise<boolean> {
      const result = await db
        .select()
        .from(dailyLogs)
        .where(eq(dailyLogs.userId, userId))
        .orderBy(desc(dailyLogs.createdAt))
        .limit(1)

      if (result.length === 0) {
        return false
      }

      const lastLogDate = new Date(result[0].createdAt)
      const today = new Date()

      return isSameDay(lastLogDate, today)
    },
  }
}

export const dailyLogRepository = createDailyLogRepository(db as unknown as NodePgDatabase)
