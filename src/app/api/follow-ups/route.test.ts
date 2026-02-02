import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleCreateFollowUp, handleGetFollowUps, type Dependencies } from './route'
import type { FollowUp } from '@/lib/db/schema'

function createMockFollowUp(overrides: Partial<FollowUp> = {}): FollowUp {
  return {
    id: 'follow-up-1',
    doctorId: 'doctor-1',
    patientId: 'patient-1',
    status: 'pending',
    message: null,
    requestedAt: new Date(),
    respondedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

describe('POST /api/follow-ups', () => {
  let mockDeps: Dependencies

  beforeEach(() => {
    mockDeps = {
      getSession: vi.fn(),
      followUpService: {
        requestFollowUp: vi.fn(),
        respondToFollowUp: vi.fn(),
        endFollowUp: vi.fn(),
        getPendingForPatient: vi.fn(),
        getActiveForDoctor: vi.fn(),
        getFollowUpById: vi.fn(),
      },
    }
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue(null)

    const response = await handleCreateFollowUp({ patientId: 'patient-1' }, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should return 403 if user is not a doctor', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const response = await handleCreateFollowUp({ patientId: 'patient-1' }, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data.success).toBe(false)
  })

  it('should return 400 if patientId is missing', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    const response = await handleCreateFollowUp({}, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('should create follow-up successfully', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    const mockFollowUp = createMockFollowUp()
    vi.mocked(mockDeps.followUpService.requestFollowUp).mockResolvedValue(mockFollowUp)

    const response = await handleCreateFollowUp(
      { patientId: 'patient-1', message: 'Please schedule' },
      mockDeps
    )
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.success).toBe(true)
    expect(data.data.id).toBe('follow-up-1')
  })
})

describe('GET /api/follow-ups', () => {
  let mockDeps: Dependencies

  beforeEach(() => {
    mockDeps = {
      getSession: vi.fn(),
      followUpService: {
        requestFollowUp: vi.fn(),
        respondToFollowUp: vi.fn(),
        endFollowUp: vi.fn(),
        getPendingForPatient: vi.fn(),
        getActiveForDoctor: vi.fn(),
        getFollowUpById: vi.fn(),
      },
    }
  })

  it('should return 401 if not authenticated', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue(null)

    const response = await handleGetFollowUps(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should return pending follow-ups for patient', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const mockFollowUps = [createMockFollowUp()]
    vi.mocked(mockDeps.followUpService.getPendingForPatient).mockResolvedValue(mockFollowUps)

    const response = await handleGetFollowUps(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
  })

  it('should return active follow-ups for doctor', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    const mockFollowUps = [createMockFollowUp({ status: 'accepted' })]
    vi.mocked(mockDeps.followUpService.getActiveForDoctor).mockResolvedValue(mockFollowUps)

    const response = await handleGetFollowUps(mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data).toHaveLength(1)
  })
})
