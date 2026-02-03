import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the dependencies
vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/db/repositories', () => ({
  dailyLogRepository: {
    create: vi.fn(),
  },
}))

vi.mock('@/lib/services/check-in-eligibility.service', () => ({
  checkInEligibilityService: {
    canPatientCheckIn: vi.fn(),
  },
}))

vi.mock('@/lib/services/gemini/file-handler', () => ({
  FileHandler: vi.fn().mockImplementation(() => ({
    withTempFile: vi.fn(),
  })),
}))

// Import after mocks
import { POST } from './route'
import { getSession } from '@/lib/auth/session'
import { checkInEligibilityService } from '@/lib/services/check-in-eligibility.service'

describe('POST /api/analyze', () => {
  const mockPatientUser = {
    id: 'patient-123',
    email: 'patient@example.com',
    role: 'patient',
  }

  const mockDoctorUser = {
    id: 'doctor-123',
    email: 'doctor@example.com',
    role: 'doctor',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return 401 when user is not authenticated', async () => {
    vi.mocked(getSession).mockResolvedValue(null)

    const request = new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 403 when user is not a patient', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: mockDoctorUser,
      session: { id: 'session-123', userId: mockDoctorUser.id, expiresAt: new Date() },
    })

    const request = new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Only patients can submit check-ins')
  })

  it('should return 403 when patient is not eligible for check-in', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: mockPatientUser,
      session: { id: 'session-123', userId: mockPatientUser.id, expiresAt: new Date() },
    })
    vi.mocked(checkInEligibilityService.canPatientCheckIn).mockResolvedValue(false)

    const formData = new FormData()
    formData.append('video', new Blob(['test'], { type: 'video/mp4' }), 'test.mp4')

    const request = new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toContain('You cannot check in')
  })

  it('should return 400 when no video file is provided', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: mockPatientUser,
      session: { id: 'session-123', userId: mockPatientUser.id, expiresAt: new Date() },
    })
    vi.mocked(checkInEligibilityService.canPatientCheckIn).mockResolvedValue(true)

    const formData = new FormData()

    const request = new NextRequest('http://localhost/api/analyze', {
      method: 'POST',
      body: formData,
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('No video file provided')
  })
})
