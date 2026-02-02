import type { User } from '@/lib/db/schema'
import type { NotificationService } from './notification.service'

export class RemindersServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'RemindersServiceError'
  }
}

// Types for reminder settings
export interface ReminderSettings {
  enabled: boolean
  time: string | null
}

export interface UpdateReminderSettingsParams {
  enabled: boolean
  time: string | null
}

export interface CheckMissedCheckInsResult {
  processedCount: number
  notifiedCount: number
}

// Extended User type with reminder fields (to be added to schema later)
export interface UserWithReminders extends User {
  reminderEnabled: boolean
  reminderTime: string | null
  lastCheckInDate: Date | null
}

// Repository interface for dependency injection
export interface RemindersUserRepository {
  findById(id: string): Promise<UserWithReminders | null>
  findAllPatientsWithRemindersEnabled(): Promise<UserWithReminders[]>
  updateReminderSettings(
    userId: string,
    enabled: boolean,
    time: string | null
  ): Promise<UserWithReminders>
}

// Constants
const TIME_FORMAT_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/

const NOTIFICATION_MESSAGES = {
  MISSED_CHECK_IN: {
    title: 'Missed Check-in',
    message: 'You missed your check-in yesterday. How are you feeling today?',
  },
  DAILY_REMINDER: {
    title: 'Daily Check-in Reminder',
    message: 'Time for your daily mental health check-in!',
  },
} as const

const ERROR_CODES = {
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  TIME_REQUIRED: 'TIME_REQUIRED',
  INVALID_TIME_FORMAT: 'INVALID_TIME_FORMAT',
  REMINDERS_DISABLED: 'REMINDERS_DISABLED',
} as const

// Helper to check if date is yesterday
function isYesterday(date: Date): boolean {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  yesterday.setHours(0, 0, 0, 0)

  const checkDate = new Date(date)
  checkDate.setHours(0, 0, 0, 0)

  return checkDate.getTime() === yesterday.getTime()
}

// Helper to check if current time matches reminder time (within the same minute)
function isCurrentTimeMatching(reminderTime: string): boolean {
  const now = new Date()
  const currentHour = now.getHours().toString().padStart(2, '0')
  const currentMinute = now.getMinutes().toString().padStart(2, '0')
  const currentTime = `${currentHour}:${currentMinute}`

  return currentTime === reminderTime
}

export class RemindersService {
  constructor(
    private userRepository: RemindersUserRepository,
    private notificationService: NotificationService
  ) {}

  static validateTimeFormat(time: string): boolean {
    if (!time) {
      return false
    }
    return TIME_FORMAT_REGEX.test(time)
  }

  private async getUserOrThrow(userId: string): Promise<UserWithReminders> {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      throw new RemindersServiceError('User not found', ERROR_CODES.USER_NOT_FOUND)
    }

    return user
  }

  async getReminderSettings(userId: string): Promise<ReminderSettings> {
    const user = await this.getUserOrThrow(userId)

    return {
      enabled: user.reminderEnabled,
      time: user.reminderTime,
    }
  }

  async updateReminderSettings(
    userId: string,
    settings: UpdateReminderSettingsParams
  ): Promise<ReminderSettings> {
    await this.getUserOrThrow(userId)

    // Validate: time is required when enabling reminders
    if (settings.enabled && !settings.time) {
      throw new RemindersServiceError(
        'Time is required when enabling reminders',
        ERROR_CODES.TIME_REQUIRED
      )
    }

    // Validate time format when provided
    if (settings.time && !RemindersService.validateTimeFormat(settings.time)) {
      throw new RemindersServiceError(
        'Invalid time format. Use HH:MM (24-hour format)',
        ERROR_CODES.INVALID_TIME_FORMAT
      )
    }

    const updatedUser = await this.userRepository.updateReminderSettings(
      userId,
      settings.enabled,
      settings.time
    )

    return {
      enabled: updatedUser.reminderEnabled,
      time: updatedUser.reminderTime,
    }
  }

  async checkMissedCheckIns(): Promise<CheckMissedCheckInsResult> {
    const patientsWithReminders =
      await this.userRepository.findAllPatientsWithRemindersEnabled()

    let notifiedCount = 0

    for (const patient of patientsWithReminders) {
      const hasCheckInYesterday =
        patient.lastCheckInDate && isYesterday(patient.lastCheckInDate)

      if (!hasCheckInYesterday) {
        await this.notificationService.create({
          userId: patient.id,
          type: 'follow_up_request',
          title: NOTIFICATION_MESSAGES.MISSED_CHECK_IN.title,
          message: NOTIFICATION_MESSAGES.MISSED_CHECK_IN.message,
        })
        notifiedCount++
      }
    }

    return {
      processedCount: patientsWithReminders.length,
      notifiedCount,
    }
  }

  async shouldSendReminder(userId: string): Promise<boolean> {
    const user = await this.userRepository.findById(userId)

    if (!user) {
      return false
    }

    if (!user.reminderEnabled || !user.reminderTime) {
      return false
    }

    return isCurrentTimeMatching(user.reminderTime)
  }

  async createReminderNotification(userId: string): Promise<void> {
    const user = await this.getUserOrThrow(userId)

    if (!user.reminderEnabled) {
      throw new RemindersServiceError(
        'Reminders are disabled for this user',
        ERROR_CODES.REMINDERS_DISABLED
      )
    }

    await this.notificationService.create({
      userId,
      type: 'follow_up_request',
      title: NOTIFICATION_MESSAGES.DAILY_REMINDER.title,
      message: NOTIFICATION_MESSAGES.DAILY_REMINDER.message,
    })
  }
}
