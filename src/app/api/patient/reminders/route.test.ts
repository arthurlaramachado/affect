import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import {
  handleGetReminders,
  handleUpdateReminders,
  type Dependencies,
} from './route'
import type { ReminderSettings } from '@/lib/services/reminders.service'

function createMockReminderSettings(
  overrides: Partial<ReminderSettings> = {}
): ReminderSettings {
  return {
    enabled: true,
    time: '09:00',
    ...overrides,
  }
}

describe('GET /api/patient/reminders', () => {
  let mockDeps: Dependencies

  beforeEach(() => {
    mockDeps = {
      getSession: vi.fn(),
      remindersService: {
        getReminderSettings: vi.fn(),
        updateReminderSettings: vi.fn(),
      },
    }
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue(null)

    const response = await handleGetReminders(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 401 if session has no user', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({ user: null })

    const response = await handleGetReminders(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 403 if user is not a patient', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    const response = await handleGetReminders(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Only patients can access reminder settings')
  })

  it('should return reminder settings for authenticated patient', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const mockSettings = createMockReminderSettings()
    vi.mocked(mockDeps.remindersService.getReminderSettings).mockResolvedValue(
      mockSettings
    )

    const response = await handleGetReminders(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.enabled).toBe(true)
    expect(data.data.time).toBe('09:00')
  })

  it('should call remindersService with correct userId', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-123', role: 'patient' },
    })

    vi.mocked(mockDeps.remindersService.getReminderSettings).mockResolvedValue(
      createMockReminderSettings()
    )

    await handleGetReminders(mockDeps)

    expect(mockDeps.remindersService.getReminderSettings).toHaveBeenCalledWith(
      'patient-123'
    )
  })

  it('should return 500 on service error', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    vi.mocked(mockDeps.remindersService.getReminderSettings).mockRejectedValue(
      new Error('Database connection failed')
    )

    const response = await handleGetReminders(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })

  it('should handle RemindersServiceError with USER_NOT_FOUND', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const serviceError = new Error('User not found')
    serviceError.name = 'RemindersServiceError'
    ;(serviceError as Error & { code: string }).code = 'USER_NOT_FOUND'

    vi.mocked(mockDeps.remindersService.getReminderSettings).mockRejectedValue(
      serviceError
    )

    const response = await handleGetReminders(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('User not found')
  })
})

describe('PATCH /api/patient/reminders', () => {
  let mockDeps: Dependencies

  beforeEach(() => {
    mockDeps = {
      getSession: vi.fn(),
      remindersService: {
        getReminderSettings: vi.fn(),
        updateReminderSettings: vi.fn(),
      },
    }
  })

  function createRequest(body: object): NextRequest {
    return new NextRequest('http://localhost/api/patient/reminders', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
  }

  it('should return 401 if not authenticated', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue(null)

    const request = createRequest({ enabled: true, time: '09:00' })
    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 401 if session has no user', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({ user: null })

    const request = createRequest({ enabled: true, time: '09:00' })
    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 403 if user is not a patient', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    const request = createRequest({ enabled: true, time: '09:00' })
    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Only patients can update reminder settings')
  })

  it('should update reminder settings successfully', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const updatedSettings = createMockReminderSettings({
      enabled: true,
      time: '10:30',
    })
    vi.mocked(mockDeps.remindersService.updateReminderSettings).mockResolvedValue(
      updatedSettings
    )

    const request = createRequest({ enabled: true, time: '10:30' })
    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.enabled).toBe(true)
    expect(data.data.time).toBe('10:30')
  })

  it('should call remindersService with correct parameters', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-123', role: 'patient' },
    })

    vi.mocked(mockDeps.remindersService.updateReminderSettings).mockResolvedValue(
      createMockReminderSettings()
    )

    const request = createRequest({ enabled: true, time: '08:00' })
    await handleUpdateReminders(request, mockDeps)

    expect(mockDeps.remindersService.updateReminderSettings).toHaveBeenCalledWith(
      'patient-123',
      { enabled: true, time: '08:00' }
    )
  })

  it('should validate time format - reject invalid format', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const request = createRequest({ enabled: true, time: 'invalid-time' })
    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Invalid time format')
  })

  it('should validate time format - reject time without leading zero', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const request = createRequest({ enabled: true, time: '9:00' })
    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Invalid time format')
  })

  it('should validate time format - reject invalid hour', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const request = createRequest({ enabled: true, time: '25:00' })
    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Invalid time format')
  })

  it('should validate time format - reject invalid minute', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const request = createRequest({ enabled: true, time: '12:60' })
    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('Invalid time format')
  })

  it('should accept valid time format HH:MM', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    vi.mocked(mockDeps.remindersService.updateReminderSettings).mockResolvedValue(
      createMockReminderSettings({ enabled: true, time: '23:59' })
    )

    const request = createRequest({ enabled: true, time: '23:59' })
    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })

  it('should handle missing enabled field gracefully - return 400', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    // When enabled is not provided, we expect a 400 error
    const request = createRequest({ time: '09:00' })
    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('boolean')
  })

  it('should allow disabling reminders without time', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    vi.mocked(mockDeps.remindersService.updateReminderSettings).mockResolvedValue(
      createMockReminderSettings({ enabled: false, time: null })
    )

    const request = createRequest({ enabled: false })
    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.enabled).toBe(false)
  })

  it('should return 400 when enabling reminders without time', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const request = createRequest({ enabled: true })
    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toContain('time is required')
  })

  it('should return 500 on service error', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    vi.mocked(mockDeps.remindersService.updateReminderSettings).mockRejectedValue(
      new Error('Database connection failed')
    )

    const request = createRequest({ enabled: true, time: '09:00' })
    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })

  it('should handle RemindersServiceError with INVALID_TIME_FORMAT', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const serviceError = new Error('Invalid time format')
    serviceError.name = 'RemindersServiceError'
    ;(serviceError as Error & { code: string }).code = 'INVALID_TIME_FORMAT'

    vi.mocked(mockDeps.remindersService.updateReminderSettings).mockRejectedValue(
      serviceError
    )

    const request = createRequest({ enabled: true, time: '09:00' })
    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid time format')
  })

  it('should handle RemindersServiceError with TIME_REQUIRED', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const serviceError = new Error('Time is required when enabling reminders')
    serviceError.name = 'RemindersServiceError'
    ;(serviceError as Error & { code: string }).code = 'TIME_REQUIRED'

    vi.mocked(mockDeps.remindersService.updateReminderSettings).mockRejectedValue(
      serviceError
    )

    const request = createRequest({ enabled: true, time: '09:00' })
    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Time is required when enabling reminders')
  })

  it('should return 400 for invalid JSON body', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const request = new NextRequest('http://localhost/api/patient/reminders', {
      method: 'PATCH',
      body: 'invalid-json',
      headers: { 'Content-Type': 'application/json' },
    })

    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Invalid request body')
  })

  it('should return 400 when enabled is not a boolean', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const request = createRequest({ enabled: 'yes', time: '09:00' })
    const response = await handleUpdateReminders(request, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })
})
