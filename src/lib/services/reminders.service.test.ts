import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  RemindersService,
  RemindersServiceError,
  type RemindersUserRepository,
  type ReminderSettings,
} from './reminders.service'
import type { NotificationService } from './notification.service'
import type { User, DailyLog } from '@/lib/db/schema'

// Mock factories
function createMockUserRepository(): RemindersUserRepository {
  return {
    findById: vi.fn(),
    findAllPatientsWithRemindersEnabled: vi.fn(),
    updateReminderSettings: vi.fn(),
  }
}

function createMockNotificationService(): Partial<NotificationService> {
  return {
    create: vi.fn(),
  }
}

function createMockUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    email: 'patient@example.com',
    name: 'John Doe',
    emailVerified: true,
    image: null,
    role: 'patient',
    doctorId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    reminderEnabled: true,
    reminderTime: '09:00',
    ...overrides,
  }
}

function createMockDailyLog(overrides: Partial<DailyLog> = {}): DailyLog {
  return {
    id: 'log-1',
    userId: 'user-1',
    moodScore: 7,
    riskFlag: false,
    analysisJson: {
      summary: 'Good day',
      emotions: ['happy'],
      stressors: [],
      copingStrategies: [],
      riskLevel: 'low',
      recommendations: [],
    },
    createdAt: new Date(),
    ...overrides,
  }
}

describe('RemindersService', () => {
  let service: RemindersService
  let mockUserRepo: ReturnType<typeof createMockUserRepository>
  let mockNotificationService: ReturnType<typeof createMockNotificationService>

  beforeEach(() => {
    mockUserRepo = createMockUserRepository()
    mockNotificationService = createMockNotificationService()
    service = new RemindersService(
      mockUserRepo,
      mockNotificationService as NotificationService
    )
  })

  describe('getReminderSettings', () => {
    it('should return reminder settings for a user', async () => {
      const mockUser = createMockUser({
        reminderEnabled: true,
        reminderTime: '09:00',
      })
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)

      const result = await service.getReminderSettings('user-1')

      expect(result).toEqual({
        enabled: true,
        time: '09:00',
      })
      expect(mockUserRepo.findById).toHaveBeenCalledWith('user-1')
    })

    it('should return disabled settings when reminders are off', async () => {
      const mockUser = createMockUser({
        reminderEnabled: false,
        reminderTime: null,
      })
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)

      const result = await service.getReminderSettings('user-1')

      expect(result).toEqual({
        enabled: false,
        time: null,
      })
    })

    it('should throw error if user not found', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null)

      await expect(service.getReminderSettings('non-existent')).rejects.toThrow(
        RemindersServiceError
      )
      await expect(service.getReminderSettings('non-existent')).rejects.toThrow(
        'User not found'
      )
    })
  })

  describe('updateReminderSettings', () => {
    it('should update reminder settings', async () => {
      const mockUser = createMockUser()
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)
      vi.mocked(mockUserRepo.updateReminderSettings).mockResolvedValue({
        ...mockUser,
        reminderEnabled: true,
        reminderTime: '08:30',
      })

      const result = await service.updateReminderSettings('user-1', {
        enabled: true,
        time: '08:30',
      })

      expect(result).toEqual({
        enabled: true,
        time: '08:30',
      })
      expect(mockUserRepo.updateReminderSettings).toHaveBeenCalledWith(
        'user-1',
        true,
        '08:30'
      )
    })

    it('should allow disabling reminders', async () => {
      const mockUser = createMockUser()
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)
      vi.mocked(mockUserRepo.updateReminderSettings).mockResolvedValue({
        ...mockUser,
        reminderEnabled: false,
        reminderTime: null,
      })

      const result = await service.updateReminderSettings('user-1', {
        enabled: false,
        time: null,
      })

      expect(result).toEqual({
        enabled: false,
        time: null,
      })
    })

    it('should throw error if user not found', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null)

      await expect(
        service.updateReminderSettings('non-existent', { enabled: true, time: '09:00' })
      ).rejects.toThrow(RemindersServiceError)
    })

    it('should throw error for invalid time format', async () => {
      const mockUser = createMockUser()
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)

      await expect(
        service.updateReminderSettings('user-1', { enabled: true, time: 'invalid' })
      ).rejects.toThrow(RemindersServiceError)
      await expect(
        service.updateReminderSettings('user-1', { enabled: true, time: 'invalid' })
      ).rejects.toThrow('Invalid time format')
    })

    it('should require time when enabling reminders', async () => {
      const mockUser = createMockUser()
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)

      await expect(
        service.updateReminderSettings('user-1', { enabled: true, time: null })
      ).rejects.toThrow(RemindersServiceError)
      await expect(
        service.updateReminderSettings('user-1', { enabled: true, time: null })
      ).rejects.toThrow('Time is required when enabling reminders')
    })
  })

  describe('checkMissedCheckIns', () => {
    it('should find patients who missed check-in yesterday and create notifications', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)
      yesterday.setHours(0, 0, 0, 0)

      const patientsWithReminders = [
        createMockUser({ id: 'patient-1', name: 'Alice', lastCheckInDate: null }),
        createMockUser({ id: 'patient-2', name: 'Bob', lastCheckInDate: yesterday }),
        createMockUser({ id: 'patient-3', name: 'Charlie', lastCheckInDate: null }),
      ]

      vi.mocked(mockUserRepo.findAllPatientsWithRemindersEnabled).mockResolvedValue(
        patientsWithReminders
      )
      vi.mocked(mockNotificationService.create).mockResolvedValue({
        id: 'notif-1',
        userId: 'patient-1',
        type: 'follow_up_request',
        title: 'Missed Check-in',
        message: 'You missed your check-in yesterday',
        metadata: null,
        read: false,
        createdAt: new Date(),
      })

      const result = await service.checkMissedCheckIns()

      // Patient-2 has a check-in yesterday, so should not get notification
      // Patient-1 and Patient-3 missed check-in
      expect(result.notifiedCount).toBe(2)
      expect(result.processedCount).toBe(3)
      expect(mockNotificationService.create).toHaveBeenCalledTimes(2)
    })

    it('should return 0 when no patients have reminders enabled', async () => {
      vi.mocked(mockUserRepo.findAllPatientsWithRemindersEnabled).mockResolvedValue([])

      const result = await service.checkMissedCheckIns()

      expect(result.notifiedCount).toBe(0)
      expect(result.processedCount).toBe(0)
    })

    it('should not notify patients who checked in yesterday', async () => {
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const patientsWithReminders = [
        createMockUser({ id: 'patient-1', lastCheckInDate: yesterday }),
      ]

      vi.mocked(mockUserRepo.findAllPatientsWithRemindersEnabled).mockResolvedValue(
        patientsWithReminders
      )

      const result = await service.checkMissedCheckIns()

      expect(result.notifiedCount).toBe(0)
      expect(mockNotificationService.create).not.toHaveBeenCalled()
    })
  })

  describe('shouldSendReminder', () => {
    it('should return true if current time matches reminder time', async () => {
      const now = new Date()
      const currentHour = now.getHours().toString().padStart(2, '0')
      const currentMinute = now.getMinutes().toString().padStart(2, '0')
      const reminderTime = `${currentHour}:${currentMinute}`

      const mockUser = createMockUser({
        reminderEnabled: true,
        reminderTime,
      })
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)

      const result = await service.shouldSendReminder('user-1')

      expect(result).toBe(true)
    })

    it('should return false if current time does not match reminder time', async () => {
      const mockUser = createMockUser({
        reminderEnabled: true,
        reminderTime: '03:00', // unlikely to match during tests
      })
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)

      const result = await service.shouldSendReminder('user-1')

      // Only true if test happens to run at 03:00
      const now = new Date()
      const expectedResult =
        now.getHours() === 3 && now.getMinutes() === 0

      expect(result).toBe(expectedResult)
    })

    it('should return false if reminders are disabled', async () => {
      const mockUser = createMockUser({
        reminderEnabled: false,
        reminderTime: null,
      })
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)

      const result = await service.shouldSendReminder('user-1')

      expect(result).toBe(false)
    })

    it('should return false if user not found', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null)

      const result = await service.shouldSendReminder('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('createReminderNotification', () => {
    it('should create a reminder notification', async () => {
      const mockUser = createMockUser({ name: 'John Doe' })
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)
      vi.mocked(mockNotificationService.create).mockResolvedValue({
        id: 'notif-1',
        userId: 'user-1',
        type: 'follow_up_request',
        title: 'Daily Check-in Reminder',
        message: 'Time for your daily mental health check-in!',
        metadata: null,
        read: false,
        createdAt: new Date(),
      })

      await service.createReminderNotification('user-1')

      expect(mockNotificationService.create).toHaveBeenCalledWith({
        userId: 'user-1',
        type: 'follow_up_request',
        title: 'Daily Check-in Reminder',
        message: 'Time for your daily mental health check-in!',
      })
    })

    it('should throw error if user not found', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null)

      await expect(
        service.createReminderNotification('non-existent')
      ).rejects.toThrow(RemindersServiceError)
    })

    it('should throw error if reminders are disabled for user', async () => {
      const mockUser = createMockUser({
        reminderEnabled: false,
      })
      vi.mocked(mockUserRepo.findById).mockResolvedValue(mockUser)

      await expect(
        service.createReminderNotification('user-1')
      ).rejects.toThrow(RemindersServiceError)
      await expect(
        service.createReminderNotification('user-1')
      ).rejects.toThrow('Reminders are disabled for this user')
    })
  })

  describe('validateTimeFormat', () => {
    it('should accept valid 24-hour time formats', () => {
      expect(RemindersService.validateTimeFormat('00:00')).toBe(true)
      expect(RemindersService.validateTimeFormat('09:30')).toBe(true)
      expect(RemindersService.validateTimeFormat('12:00')).toBe(true)
      expect(RemindersService.validateTimeFormat('23:59')).toBe(true)
    })

    it('should reject invalid time formats', () => {
      expect(RemindersService.validateTimeFormat('9:00')).toBe(false)
      expect(RemindersService.validateTimeFormat('25:00')).toBe(false)
      expect(RemindersService.validateTimeFormat('12:60')).toBe(false)
      expect(RemindersService.validateTimeFormat('12')).toBe(false)
      expect(RemindersService.validateTimeFormat('invalid')).toBe(false)
      expect(RemindersService.validateTimeFormat('')).toBe(false)
    })
  })
})
