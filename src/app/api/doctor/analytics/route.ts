import { NextResponse } from 'next/server'
import { getSession as defaultGetSession } from '@/lib/auth/session'
import type { PatientSummary } from '@/lib/services/doctor.service'
import type { InsightsSummary } from '@/lib/services/insights.service'
import {
  doctorService as defaultDoctorService,
  insightsService as defaultInsightsService,
} from '@/lib/services'
import type { RiskLevel } from '@/types/database'

export interface DoctorServiceInterface {
  getPatients(doctorId: string): Promise<PatientSummary[]>
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

interface MoodDistribution {
  min: number
  max: number
  average: number
}

interface RiskBreakdown {
  stable: number
  drift: number
  alert: number
  unknown: number
}

interface DoctorAnalytics {
  totalPatients: number
  moodDistribution: MoodDistribution
  riskBreakdown: RiskBreakdown
  averageCompliance: number
  generatedAt: Date
}

function calculateMoodDistribution(patients: PatientSummary[]): MoodDistribution {
  const validScores = patients
    .map((p) => p.moodScore)
    .filter((score): score is number => score !== null)

  if (validScores.length === 0) {
    return { min: 0, max: 0, average: 0 }
  }

  return {
    min: Math.min(...validScores),
    max: Math.max(...validScores),
    average: validScores.reduce((sum, score) => sum + score, 0) / validScores.length,
  }
}

function calculateRiskBreakdown(patients: PatientSummary[]): RiskBreakdown {
  const breakdown: RiskBreakdown = {
    stable: 0,
    drift: 0,
    alert: 0,
    unknown: 0,
  }

  for (const patient of patients) {
    const riskLevel = patient.riskLevel as RiskLevel | 'unknown'
    if (riskLevel in breakdown) {
      breakdown[riskLevel]++
    }
  }

  return breakdown
}

async function calculateAverageCompliance(
  patients: PatientSummary[],
  insightsService: InsightsServiceInterface
): Promise<number> {
  if (patients.length === 0) {
    return 0
  }

  const complianceRates: number[] = []

  for (const patient of patients) {
    try {
      const insights = await insightsService.generateInsightsSummary(patient.id)
      complianceRates.push(insights.complianceRate)
    } catch {
      // Skip patients where insights generation fails
    }
  }

  if (complianceRates.length === 0) {
    return 0
  }

  return complianceRates.reduce((sum, rate) => sum + rate, 0) / complianceRates.length
}

export async function handleGetDoctorAnalytics(
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
        { success: false, error: 'Only doctors can access analytics' },
        { status: 403 }
      )
    }

    const patients = await deps.doctorService.getPatients(user.id)

    const analytics: DoctorAnalytics = {
      totalPatients: patients.length,
      moodDistribution: calculateMoodDistribution(patients),
      riskBreakdown: calculateRiskBreakdown(patients),
      averageCompliance: await calculateAverageCompliance(patients, deps.insightsService),
      generatedAt: new Date(),
    }

    return NextResponse.json({
      success: true,
      data: analytics,
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

const defaultDependencies: Dependencies = {
  getSession: defaultGetSession,
  doctorService: defaultDoctorService,
  insightsService: defaultInsightsService,
}

export async function GET() {
  return handleGetDoctorAnalytics(defaultDependencies)
}
