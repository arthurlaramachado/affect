import { NextResponse } from 'next/server'
import { getSession as defaultGetSession } from '@/lib/auth/session'
import type { MoodTrend, WeeklyAverage } from '@/lib/services/insights.service'
import type { DailyLog } from '@/lib/db/schema'

export interface InsightsServiceInterface {
  calculateMoodTrend(logs: DailyLog[]): MoodTrend
  getWeeklyAverages(logs: DailyLog[]): WeeklyAverage[]
}

export interface DailyLogRepositoryInterface {
  findByUserId(userId: string, limit?: number): Promise<DailyLog[]>
}

export type GetSessionFn = () => Promise<{
  user: { id: string; role?: string } | null
} | null>

export interface Dependencies {
  getSession: GetSessionFn
  insightsService: InsightsServiceInterface
  dailyLogRepository: DailyLogRepositoryInterface
}

export interface TrendResponse {
  moodTrend: MoodTrend
  weeklyAverages: WeeklyAverage[]
  generatedAt: Date
}

export async function handleGetTrend(deps: Dependencies): Promise<NextResponse> {
  try {
    const session = await deps.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user

    if (user.role !== 'patient') {
      return NextResponse.json(
        { success: false, error: 'Only patients can access trend data' },
        { status: 403 }
      )
    }

    const logs = await deps.dailyLogRepository.findByUserId(user.id)
    const weeklyAverages = deps.insightsService.getWeeklyAverages(logs)
    const moodTrend = deps.insightsService.calculateMoodTrend(logs)

    const response: TrendResponse = {
      moodTrend,
      weeklyAverages,
      generatedAt: new Date(),
    }

    return NextResponse.json({
      success: true,
      data: response,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Import real dependencies
import { insightsService } from '@/lib/services'
import { dailyLogRepository } from '@/lib/db/repositories'

const defaultDependencies: Dependencies = {
  getSession: defaultGetSession,
  insightsService,
  dailyLogRepository,
}

export async function GET() {
  return handleGetTrend(defaultDependencies)
}
