import { NextRequest, NextResponse } from 'next/server'
import { getSession as defaultGetSession } from '@/lib/auth/session'
import { DoctorServiceError } from '@/lib/services/doctor.service'
import {
  PdfReportService,
  PdfReportServiceError,
  type PatientReportData,
} from '@/lib/services/pdf-report.service'
import {
  AIOverviewService,
  type AIOverviewInput,
  type AIOverview,
} from '@/lib/services/ai-overview.service'
import type { PatientDetail } from '@/lib/services/doctor.service'
import type { InsightsSummary } from '@/lib/services/insights.service'
import type { DailyLog } from '@/lib/db/schema'
import {
  doctorService as defaultDoctorService,
  insightsService as defaultInsightsService,
} from '@/lib/services'
import { dailyLogRepository as defaultDailyLogRepository } from '@/lib/db/repositories/daily-log.repository'

export interface DoctorServiceInterface {
  getPatientDetail(doctorId: string, patientId: string): Promise<PatientDetail>
}

export interface InsightsServiceInterface {
  generateInsightsSummary(userId: string): Promise<InsightsSummary>
}

export interface PdfReportServiceInterface {
  generatePatientReport(data: PatientReportData): Promise<Buffer>
}

export interface DailyLogRepositoryInterface {
  findAllByUserId(userId: string): Promise<DailyLog[]>
}

export interface AIOverviewServiceInterface {
  generateOverview(input: AIOverviewInput): Promise<AIOverview>
}

export type GetSessionFn = () => Promise<{
  user: { id: string; name: string; role?: string } | null
} | null>

export interface Dependencies {
  getSession: GetSessionFn
  doctorService: DoctorServiceInterface
  insightsService: InsightsServiceInterface
  pdfReportService: PdfReportServiceInterface
  dailyLogRepository?: DailyLogRepositoryInterface
  aiOverviewService?: AIOverviewServiceInterface
}

function sanitizeFilename(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function formatMoodHistoryForReport(
  logs: DailyLog[]
): PatientReportData['moodHistory'] {
  return logs.map((log) => ({
    date: log.createdAt,
    moodScore: log.moodScore,
    riskFlag: log.riskFlag,
    clinicalSummary: log.analysisJson.clinical_summary,
  }))
}

function formatLogsForAIOverview(
  logs: DailyLog[]
): AIOverviewInput['checkIns'] {
  return logs.map((log) => ({
    date: log.createdAt,
    moodScore: log.moodScore,
    riskFlag: log.riskFlag,
    clinicalSummary: log.analysisJson.clinical_summary,
    biomarkers: log.analysisJson.biomarkers,
    riskFlags: log.analysisJson.risk_flags,
    mse: log.analysisJson.mse,
  }))
}

async function generateAIOverviewSafely(
  deps: Dependencies,
  patientDetail: PatientDetail,
  allLogs: DailyLog[],
  insights: InsightsSummary
): Promise<AIOverview | undefined> {
  if (!deps.aiOverviewService || allLogs.length === 0) {
    return undefined
  }

  try {
    const aiInput: AIOverviewInput = {
      patient: {
        id: patientDetail.patient.id,
        name: patientDetail.patient.name,
        patientSince: patientDetail.patient.createdAt,
      },
      checkIns: formatLogsForAIOverview(allLogs),
      insights: {
        moodTrend: insights.moodTrend,
        averageMood: insights.moodRange.average,
        complianceRate: insights.complianceRate,
      },
    }

    return await deps.aiOverviewService.generateOverview(aiInput)
  } catch {
    // AI generation failed, continue without AI overview
    return undefined
  }
}

export async function handleGetPatientReport(
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
        { success: false, error: 'Only doctors can download patient reports' },
        { status: 403 }
      )
    }

    // Get patient details (this also verifies doctor has access)
    const patientDetail = await deps.doctorService.getPatientDetail(user.id, patientId)

    // Generate insights for the patient
    const insights = await deps.insightsService.generateInsightsSummary(patientId)

    // Fetch ALL daily logs for comprehensive report and AI overview
    const allLogs = deps.dailyLogRepository
      ? await deps.dailyLogRepository.findAllByUserId(patientId)
      : []

    // Generate AI overview (fails gracefully)
    const aiOverview = await generateAIOverviewSafely(
      deps,
      patientDetail,
      allLogs,
      insights
    )

    // Prepare report data with all logs
    const reportData: PatientReportData = {
      patient: patientDetail.patient,
      moodHistory: allLogs.length > 0
        ? formatMoodHistoryForReport(allLogs)
        : formatMoodHistoryForReport([]),
      insights: {
        moodTrend: insights.moodTrend,
        averageMood: insights.moodRange.average,
        complianceRate: insights.complianceRate,
        moodRange: insights.moodRange,
      },
      riskLevel: patientDetail.riskLevel,
      generatedAt: new Date(),
      doctorName: user.name,
      aiOverview,
    }

    // Generate PDF
    const pdfBuffer = await deps.pdfReportService.generatePatientReport(reportData)

    // Generate filename
    const sanitizedName = sanitizeFilename(patientDetail.patient.name)
    const dateStr = new Date().toISOString().split('T')[0]
    const filename = `patient-report-${sanitizedName}-${dateStr}.pdf`

    // Return PDF response - convert Buffer to Uint8Array for NextResponse compatibility
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    })
  } catch (error) {
    if (error instanceof DoctorServiceError) {
      const status = error.code === 'NOT_FOUND' ? 404 : 403
      return NextResponse.json(
        { success: false, error: error.message },
        { status }
      )
    }

    if (error instanceof PdfReportServiceError) {
      return NextResponse.json(
        { success: false, error: error.message },
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

const defaultPdfReportService = new PdfReportService()
const defaultAiOverviewService = new AIOverviewService()

const defaultDependencies: Dependencies = {
  getSession: defaultGetSession,
  doctorService: defaultDoctorService,
  insightsService: defaultInsightsService,
  pdfReportService: defaultPdfReportService,
  dailyLogRepository: defaultDailyLogRepository,
  aiOverviewService: defaultAiOverviewService,
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: patientId } = await params
  return handleGetPatientReport(patientId, defaultDependencies)
}
