import { describe, it, expect, vi, beforeEach } from 'vitest'
import { handleUpdateFollowUp, type Dependencies } from './route'
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

describe('PATCH /api/follow-ups/[id]', () => {
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

    const response = await handleUpdateFollowUp('follow-up-1', { action: 'accept' }, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data.success).toBe(false)
  })

  it('should return 400 if action is invalid', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const response = await handleUpdateFollowUp('follow-up-1', { action: 'invalid' as 'accept' }, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.success).toBe(false)
  })

  it('should accept follow-up as patient', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const mockFollowUp = createMockFollowUp({ status: 'accepted' })
    vi.mocked(mockDeps.followUpService.respondToFollowUp).mockResolvedValue(mockFollowUp)

    const response = await handleUpdateFollowUp('follow-up-1', { action: 'accept' }, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.status).toBe('accepted')
  })

  it('should decline follow-up as patient', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'patient-1', role: 'patient' },
    })

    const mockFollowUp = createMockFollowUp({ status: 'declined' })
    vi.mocked(mockDeps.followUpService.respondToFollowUp).mockResolvedValue(mockFollowUp)

    const response = await handleUpdateFollowUp('follow-up-1', { action: 'decline' }, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.status).toBe('declined')
  })

  it('should end follow-up as doctor', async () => {
    vi.mocked(mockDeps.getSession).mockResolvedValue({
      user: { id: 'doctor-1', role: 'doctor' },
    })

    const mockFollowUp = createMockFollowUp({ status: 'ended' })
    vi.mocked(mockDeps.followUpService.endFollowUp).mockResolvedValue(mockFollowUp)

    const response = await handleUpdateFollowUp('follow-up-1', { action: 'end' }, mockDeps)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.data.status).toBe('ended')
  })
})
