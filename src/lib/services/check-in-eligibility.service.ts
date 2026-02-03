import type { FollowUpRepository } from '@/lib/db/repositories/follow-up.repository'
import type { DailyLogRepository } from '@/lib/db/repositories/daily-log.repository'

export interface CheckInEligibility {
  canCheckIn: boolean
  hasActiveFollowUp: boolean
  hasCheckedInToday: boolean
  message: string | null
}

export interface CheckInEligibilityService {
  getEligibility(patientId: string): Promise<CheckInEligibility>
  canPatientCheckIn(patientId: string): Promise<boolean>
}

interface MinimalFollowUpRepository {
  hasActiveFollowUpByPatientId(patientId: string): Promise<boolean>
}

interface MinimalDailyLogRepository {
  hasCheckedInToday(userId: string): Promise<boolean>
}

export function createCheckInEligibilityService(
  followUpRepository: MinimalFollowUpRepository,
  dailyLogRepository: MinimalDailyLogRepository
): CheckInEligibilityService {
  return {
    async getEligibility(patientId: string): Promise<CheckInEligibility> {
      const [hasActiveFollowUp, hasCheckedInToday] = await Promise.all([
        followUpRepository.hasActiveFollowUpByPatientId(patientId),
        dailyLogRepository.hasCheckedInToday(patientId),
      ])

      const canCheckIn = hasActiveFollowUp && !hasCheckedInToday

      let message: string | null = null
      if (!hasActiveFollowUp) {
        message = 'You need to be under follow-up with a doctor to check in.'
      } else if (hasCheckedInToday) {
        message = 'You already checked in today. Come back tomorrow!'
      }

      return {
        canCheckIn,
        hasActiveFollowUp,
        hasCheckedInToday,
        message,
      }
    },

    async canPatientCheckIn(patientId: string): Promise<boolean> {
      const eligibility = await this.getEligibility(patientId)
      return eligibility.canCheckIn
    },
  }
}

// Create singleton instance
import { followUpRepository } from '@/lib/db/repositories/follow-up.repository'
import { dailyLogRepository } from '@/lib/db/repositories/daily-log.repository'

export const checkInEligibilityService = createCheckInEligibilityService(
  followUpRepository,
  dailyLogRepository
)
