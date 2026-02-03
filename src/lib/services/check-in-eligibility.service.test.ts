import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  CheckInEligibilityService,
  createCheckInEligibilityService,
  type CheckInEligibility,
} from './check-in-eligibility.service'

const mockFollowUpRepository = {
  hasActiveFollowUpByPatientId: vi.fn(),
}

const mockDailyLogRepository = {
  hasCheckedInToday: vi.fn(),
}

describe('CheckInEligibilityService', () => {
  let service: CheckInEligibilityService

  beforeEach(() => {
    vi.clearAllMocks()
    service = createCheckInEligibilityService(
      mockFollowUpRepository as never,
      mockDailyLogRepository as never
    )
  })

  describe('getEligibility', () => {
    it('should return canCheckIn=true when patient has active follow-up and has not checked in today', async () => {
      mockFollowUpRepository.hasActiveFollowUpByPatientId.mockResolvedValue(true)
      mockDailyLogRepository.hasCheckedInToday.mockResolvedValue(false)

      const result = await service.getEligibility('patient-123')

      expect(result).toEqual<CheckInEligibility>({
        canCheckIn: true,
        hasActiveFollowUp: true,
        hasCheckedInToday: false,
        message: null,
      })
    })

    it('should return canCheckIn=false with message when patient has no active follow-up', async () => {
      mockFollowUpRepository.hasActiveFollowUpByPatientId.mockResolvedValue(false)
      mockDailyLogRepository.hasCheckedInToday.mockResolvedValue(false)

      const result = await service.getEligibility('patient-123')

      expect(result).toEqual<CheckInEligibility>({
        canCheckIn: false,
        hasActiveFollowUp: false,
        hasCheckedInToday: false,
        message: 'You need to be under follow-up with a doctor to check in.',
      })
    })

    it('should return canCheckIn=false with message when patient has already checked in today', async () => {
      mockFollowUpRepository.hasActiveFollowUpByPatientId.mockResolvedValue(true)
      mockDailyLogRepository.hasCheckedInToday.mockResolvedValue(true)

      const result = await service.getEligibility('patient-123')

      expect(result).toEqual<CheckInEligibility>({
        canCheckIn: false,
        hasActiveFollowUp: true,
        hasCheckedInToday: true,
        message: 'You already checked in today. Come back tomorrow!',
      })
    })

    it('should prioritize no active follow-up message over already checked in', async () => {
      mockFollowUpRepository.hasActiveFollowUpByPatientId.mockResolvedValue(false)
      mockDailyLogRepository.hasCheckedInToday.mockResolvedValue(true)

      const result = await service.getEligibility('patient-123')

      expect(result).toEqual<CheckInEligibility>({
        canCheckIn: false,
        hasActiveFollowUp: false,
        hasCheckedInToday: true,
        message: 'You need to be under follow-up with a doctor to check in.',
      })
    })
  })

  describe('canPatientCheckIn', () => {
    it('should return true when patient is eligible', async () => {
      mockFollowUpRepository.hasActiveFollowUpByPatientId.mockResolvedValue(true)
      mockDailyLogRepository.hasCheckedInToday.mockResolvedValue(false)

      const result = await service.canPatientCheckIn('patient-123')

      expect(result).toBe(true)
    })

    it('should return false when patient has no active follow-up', async () => {
      mockFollowUpRepository.hasActiveFollowUpByPatientId.mockResolvedValue(false)
      mockDailyLogRepository.hasCheckedInToday.mockResolvedValue(false)

      const result = await service.canPatientCheckIn('patient-123')

      expect(result).toBe(false)
    })

    it('should return false when patient has already checked in today', async () => {
      mockFollowUpRepository.hasActiveFollowUpByPatientId.mockResolvedValue(true)
      mockDailyLogRepository.hasCheckedInToday.mockResolvedValue(true)

      const result = await service.canPatientCheckIn('patient-123')

      expect(result).toBe(false)
    })
  })
})
