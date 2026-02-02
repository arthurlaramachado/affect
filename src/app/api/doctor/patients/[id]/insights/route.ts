import { NextRequest, NextResponse } from 'next/server'
import { getSession as defaultGetSession } from '@/lib/auth/session'
import { DoctorServiceError } from '@/lib/services/doctor.service'
import type { InsightsSummary } from '@/lib/services/insights.service'
import {
  doctorService as defaultDoctorService,
  insightsService as defaultInsightsService,
} from '@/lib/services'

export interface DoctorServiceInterface {
  verifyPatientBelongsToDoctor(doctorId: string, patientId: string): Promise<boolean>
}

export interface InsightsServiceInterface {
  generateInsightsSummary(userId: string): Promise<InsightsSummary>
}

export type GetSessionFn = () => Promise<{
  user: { id: string; role?: string } | null
} | null>

export interface Dependencies {
  getSession: GetSessionFn
  doctorService: DoctorServiceInterface
  insightsService: InsightsServiceInterface
}

export async function handleGetPatientInsights(
  patientId: string,
  deps: Dependencies
): Promise<NextResponse> {
  try {
    const session = await deps.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user

    if (user.role !== 'doctor') {
      return NextResponse.json(
        { success: false, error: 'Only doctors can access patient insights' },
        { status: 403 }
      )
    }

    // Verify doctor has access to this patient
    await deps.doctorService.verifyPatientBelongsToDoctor(user.id, patientId)

    // Generate insights for the patient
    const summary = await deps.insightsService.generateInsightsSummary(patientId)

    return NextResponse.json({
      success: true,
      data: summary,
    })
  } catch (error) {
    if (error instanceof DoctorServiceError) {
      const status = error.code === 'NOT_FOUND' ? 404 : 403
      return NextResponse.json(
        { success: false, error: error.message },
        { status }
      )
    }

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

interface RouteParams {
  params: Promise<{ id: string }>
}

const defaultDependencies: Dependencies = {
  getSession: defaultGetSession,
  doctorService: defaultDoctorService,
  insightsService: defaultInsightsService,
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: patientId } = await params
  return handleGetPatientInsights(patientId, defaultDependencies)
}
