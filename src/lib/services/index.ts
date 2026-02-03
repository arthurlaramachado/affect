// Service exports with real dependencies wired up

import { FollowUpService } from './follow-up.service'
import { NotificationService } from './notification.service'
import { InsightsService } from './insights.service'
import { DoctorService } from './doctor.service'
import {
  dailyLogRepository,
  followUpRepository,
  notificationRepository,
  userRepository,
} from '@/lib/db/repositories'

// Create NotificationService singleton
export const notificationService = new NotificationService(notificationRepository)

// Create FollowUpService singleton with all dependencies
export const followUpService = new FollowUpService(
  followUpRepository,
  userRepository,
  notificationService
)

// Create InsightsService singleton with daily log repository
export const insightsService = new InsightsService(dailyLogRepository)

// Create DoctorService singleton with repositories
export const doctorService = new DoctorService(userRepository, dailyLogRepository)

// Re-export types and classes for testing
export { FollowUpService, FollowUpServiceError } from './follow-up.service'
export { NotificationService, NotificationServiceError } from './notification.service'
export { DoctorService, DoctorServiceError } from './doctor.service'
export {
  InsightsService,
  InsightsServiceError,
  type MoodTrend,
  type WeeklyAverage,
  type MoodRange,
  type AnomalyLog,
  type InsightsSummary,
} from './insights.service'
export {
  PdfReportService,
  PdfReportServiceError,
  type PatientReportData,
  type PatientInfo,
  type MoodHistoryItem,
  type ReportInsights,
} from './pdf-report.service'
export {
  AIOverviewService,
  AIOverviewServiceError,
  generatePrompt,
  parseAIResponse,
  type AIOverviewInput,
  type AIOverview,
  type AIClient,
  type AIClientResponse,
} from './ai-overview.service'
