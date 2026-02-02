import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleLinkDoctor, type LinkDoctorInput, type GetSessionFn } from './route'
import type { UserRepository } from '@/lib/db/repositories'
import type { User } from '@/lib/db/schema'

function createMockUserRepository(): UserRepository {
  return {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    searchPatients: vi.fn(),
    findPatientsByDoctorId: vi.fn(),
    updateDoctorId: vi.fn(),
  }
}

describe('POST /api/patient/link-doctor', () => {
  let mockUserRepository: ReturnType<typeof createMockUserRepository>
  let mockGetSession: GetSessionFn

  beforeEach(() => {
    mockUserRepository = createMockUserRepository()
    mockGetSession = vi.fn()
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(mockGetSession).mockResolvedValue(null)

    const body: LinkDoctorInput = { doctorId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }
    const response = await handleLinkDoctor(body, {
      userRepository: mockUserRepository,
      getSession: mockGetSession,
    })
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Unauthorized')
  })

  it('should return 403 if user is not a patient', async () => {
    vi.mocked(mockGetSession).mockResolvedValue({
      user: { id: 'user-123', role: 'doctor' },
      session: { id: 'session-123' },
    })

    const body: LinkDoctorInput = { doctorId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }
    const response = await handleLinkDoctor(body, {
      userRepository: mockUserRepository,
      getSession: mockGetSession,
    })
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Only patients can link to a doctor')
  })

  it('should return 400 if doctorId is missing', async () => {
    vi.mocked(mockGetSession).mockResolvedValue({
      user: { id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', role: 'patient' },
      session: { id: 'session-123' },
    })

    const body: LinkDoctorInput = {}
    const response = await handleLinkDoctor(body, {
      userRepository: mockUserRepository,
      getSession: mockGetSession,
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Doctor ID is required')
  })

  it('should return 404 if doctor not found', async () => {
    vi.mocked(mockGetSession).mockResolvedValue({
      user: { id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', role: 'patient' },
      session: { id: 'session-123' },
    })

    vi.mocked(mockUserRepository.findById).mockResolvedValue(null)

    const body: LinkDoctorInput = { doctorId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }
    const response = await handleLinkDoctor(body, {
      userRepository: mockUserRepository,
      getSession: mockGetSession,
    })
    const data = await response.json()

    expect(response.status).toBe(404)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Doctor not found')
  })

  it('should return 400 if target user is not a doctor', async () => {
    vi.mocked(mockGetSession).mockResolvedValue({
      user: { id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', role: 'patient' },
      session: { id: 'session-123' },
    })

    vi.mocked(mockUserRepository.findById).mockResolvedValue({
      id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      role: 'patient',
      name: 'Not A Doctor',
      email: 'notdoctor@test.com',
    } as User)

    const body: LinkDoctorInput = { doctorId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }
    const response = await handleLinkDoctor(body, {
      userRepository: mockUserRepository,
      getSession: mockGetSession,
    })
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Target user is not a doctor')
  })

  it('should link patient to doctor successfully', async () => {
    vi.mocked(mockGetSession).mockResolvedValue({
      user: { id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', role: 'patient' },
      session: { id: 'session-123' },
    })

    vi.mocked(mockUserRepository.findById).mockResolvedValue({
      id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      role: 'doctor',
      name: 'Dr. Smith',
      email: 'doctor@test.com',
    } as User)

    const updatedPatient = {
      id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
      role: 'patient',
      doctorId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
      name: 'Patient Name',
      email: 'patient@test.com',
    } as User

    vi.mocked(mockUserRepository.updateDoctorId).mockResolvedValue(updatedPatient)

    const body: LinkDoctorInput = { doctorId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }
    const response = await handleLinkDoctor(body, {
      userRepository: mockUserRepository,
      getSession: mockGetSession,
    })
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.doctorId).toBe('a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d')
    expect(mockUserRepository.updateDoctorId).toHaveBeenCalledWith(
      'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
      'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d'
    )
  })

  it('should return 500 on internal error', async () => {
    vi.mocked(mockGetSession).mockResolvedValue({
      user: { id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e', role: 'patient' },
      session: { id: 'session-123' },
    })

    vi.mocked(mockUserRepository.findById).mockRejectedValue(new Error('Database error'))

    const body: LinkDoctorInput = { doctorId: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' }
    const response = await handleLinkDoctor(body, {
      userRepository: mockUserRepository,
      getSession: mockGetSession,
    })
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.success).toBe(false)
    expect(data.error).toBe('Internal server error')
  })
})
