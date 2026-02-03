import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/auth/session', () => ({
  getSession: vi.fn(),
}))

vi.mock('@/lib/services/check-in-eligibility.service', () => ({
  checkInEligibilityService: {
    getEligibility: vi.fn(),
  },
}))

import { GET } from './route'
import { getSession } from '@/lib/auth/session'
import { checkInEligibilityService } from '@/lib/services/check-in-eligibility.service'

describe('GET /api/patient/eligibility', () => {
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

    const request = new NextRequest('http://localhost/api/patient/eligibility')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should return 403 when user is not a patient', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: mockDoctorUser,
      session: { id: 'session-123', userId: mockDoctorUser.id, expiresAt: new Date() },
    })

    const request = new NextRequest('http://localhost/api/patient/eligibility')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
  })

  it('should return eligibility when patient can check in', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: mockPatientUser,
      session: { id: 'session-123', userId: mockPatientUser.id, expiresAt: new Date() },
    })
    vi.mocked(checkInEligibilityService.getEligibility).mockResolvedValue({
      canCheckIn: true,
      hasActiveFollowUp: true,
      hasCheckedInToday: false,
      message: null,
    })

    const request = new NextRequest('http://localhost/api/patient/eligibility')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.canCheckIn).toBe(true)
    expect(data.data.hasActiveFollowUp).toBe(true)
    expect(data.data.hasCheckedInToday).toBe(false)
  })

  it('should return eligibility when patient cannot check in due to no follow-up', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: mockPatientUser,
      session: { id: 'session-123', userId: mockPatientUser.id, expiresAt: new Date() },
    })
    vi.mocked(checkInEligibilityService.getEligibility).mockResolvedValue({
      canCheckIn: false,
      hasActiveFollowUp: false,
      hasCheckedInToday: false,
      message: 'You need to be under follow-up with a doctor to check in.',
    })

    const request = new NextRequest('http://localhost/api/patient/eligibility')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.canCheckIn).toBe(false)
    expect(data.data.hasActiveFollowUp).toBe(false)
    expect(data.data.message).toBe('You need to be under follow-up with a doctor to check in.')
  })

  it('should return eligibility when patient already checked in today', async () => {
    vi.mocked(getSession).mockResolvedValue({
      user: mockPatientUser,
      session: { id: 'session-123', userId: mockPatientUser.id, expiresAt: new Date() },
    })
    vi.mocked(checkInEligibilityService.getEligibility).mockResolvedValue({
      canCheckIn: false,
      hasActiveFollowUp: true,
      hasCheckedInToday: true,
      message: 'You already checked in today. Come back tomorrow!',
    })

    const request = new NextRequest('http://localhost/api/patient/eligibility')

    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.canCheckIn).toBe(false)
    expect(data.data.hasCheckedInToday).toBe(true)
    expect(data.data.message).toBe('You already checked in today. Come back tomorrow!')
  })
})
