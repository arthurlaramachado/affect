import { renderToBuffer } from '@react-pdf/renderer'
import { PatientReportDocument } from './pdf-report/components'
import type { RiskLevel } from '@/types/database'
import type { MoodTrend } from './insights.service'
import type { AIOverview } from './ai-overview.service'

export class PdfReportServiceError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'PdfReportServiceError'
  }
}

export interface MoodHistoryItem {
  date: Date
  moodScore: number
  riskFlag: boolean
  clinicalSummary: string
}

export interface PatientInfo {
  id: string
  name: string
  email: string
  createdAt: Date
}

export interface ReportInsights {
  moodTrend: MoodTrend
  averageMood: number
  complianceRate: number
  moodRange: {
    min: number
    max: number
    average: number
    stddev: number
  }
}

export interface PatientReportData {
  patient: PatientInfo
  moodHistory: MoodHistoryItem[]
  insights: ReportInsights
  riskLevel: RiskLevel | 'unknown'
  generatedAt: Date
  doctorName: string
  aiOverview?: AIOverview
}

export class PdfReportService {
  async generatePatientReport(data: PatientReportData): Promise<Buffer> {
    try {
      const document = PatientReportDocument({ data })
      const buffer = await renderToBuffer(document)
      return buffer
    } catch (error) {
      throw new PdfReportServiceError(
        'Failed to generate PDF report',
        'RENDER_FAILED'
      )
    }
  }
}
