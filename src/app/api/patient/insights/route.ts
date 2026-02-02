import { NextResponse } from 'next/server'
import { getSession as defaultGetSession } from '@/lib/auth/session'
import type { InsightsSummary } from '@/lib/services/insights.service'

export interface InsightsServiceInterface {
  generateInsightsSummary(userId: string): Promise<InsightsSummary>
}

export type GetSessionFn = () => Promise<{
  user: { id: string; role?: string } | null
} | null>

export interface Dependencies {
  getSession: GetSessionFn
  insightsService: InsightsServiceInterface
}

export async function handleGetInsights(deps: Dependencies): Promise<NextResponse> {
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
        { success: false, error: 'Only patients can access insights' },
        { status: 403 }
      )
    }

    const summary = await deps.insightsService.generateInsightsSummary(user.id)

    return NextResponse.json({
      success: true,
      data: summary,
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'InsightsServiceError') {
      return NextResponse.json(
        { success: false, error: 'Failed to generate insights' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Import real dependencies
import { insightsService } from '@/lib/services'

const defaultDependencies: Dependencies = {
  getSession: defaultGetSession,
  insightsService,
}

export async function GET() {
  return handleGetInsights(defaultDependencies)
}
