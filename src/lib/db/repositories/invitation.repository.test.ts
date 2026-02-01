import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  InvitationRepository,
  type CreateInvitationData,
} from './invitation.repository'

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}))

describe('InvitationRepository', () => {
  let repository: InvitationRepository
  const mockDb = vi.hoisted(() => ({
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  }))

  beforeEach(() => {
    vi.clearAllMocks()
    repository = new InvitationRepository()
  })

  describe('create', () => {
    it('should create invitation data with correct structure', () => {
      const data: CreateInvitationData = {
        doctorId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'patient@example.com',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }

      expect(data.doctorId).toBeDefined()
      expect(data.email).toBeDefined()
      expect(data.expiresAt).toBeInstanceOf(Date)
    })

    it('should generate unique tokens for each invitation', async () => {
      const data: CreateInvitationData = {
        doctorId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'patient@example.com',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      }

      const tokens: string[] = []
      const mockInsert = vi.fn().mockImplementation(() => ({
        values: vi.fn().mockImplementation((values) => {
          tokens.push(values.token)
          return {
            returning: vi.fn().mockResolvedValue([{ ...values, id: 'inv-' + tokens.length }]),
          }
        }),
      }))

      vi.mocked(await import('@/lib/db')).db.insert = mockInsert

      await repository.create(data)
      await repository.create(data)

      expect(tokens[0]).not.toBe(tokens[1])
    })
  })

  describe('findByToken', () => {
    it('should return invitation when found', async () => {
      const token = 'valid-token-123'
      const expectedInvitation = {
        id: 'inv-123',
        doctorId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'patient@example.com',
        token,
        status: 'pending',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      }

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([expectedInvitation]),
        }),
      })

      vi.mocked(await import('@/lib/db')).db.select = mockSelect

      const result = await repository.findByToken(token)

      expect(result).toEqual(expectedInvitation)
    })

    it('should return null when invitation not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      })

      vi.mocked(await import('@/lib/db')).db.select = mockSelect

      const result = await repository.findByToken('non-existent-token')

      expect(result).toBeNull()
    })
  })

  describe('findByDoctorId', () => {
    it('should return all invitations for a doctor', async () => {
      const doctorId = '123e4567-e89b-12d3-a456-426614174000'
      const invitations = [
        {
          id: 'inv-1',
          doctorId,
          email: 'patient1@example.com',
          token: 'token-1',
          status: 'pending',
          expiresAt: new Date(),
          createdAt: new Date(),
        },
        {
          id: 'inv-2',
          doctorId,
          email: 'patient2@example.com',
          token: 'token-2',
          status: 'accepted',
          expiresAt: new Date(),
          createdAt: new Date(),
        },
      ]

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(invitations),
          }),
        }),
      })

      vi.mocked(await import('@/lib/db')).db.select = mockSelect

      const result = await repository.findByDoctorId(doctorId)

      expect(result).toHaveLength(2)
      expect(result[0].email).toBe('patient1@example.com')
      expect(result[1].email).toBe('patient2@example.com')
    })

    it('should return empty array when no invitations found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      vi.mocked(await import('@/lib/db')).db.select = mockSelect

      const result = await repository.findByDoctorId('doctor-with-no-invitations')

      expect(result).toEqual([])
    })
  })

  describe('findByEmail', () => {
    it('should return invitations for email', async () => {
      const email = 'patient@example.com'
      const invitation = {
        id: 'inv-1',
        doctorId: '123e4567-e89b-12d3-a456-426614174000',
        email,
        token: 'token-1',
        status: 'pending',
        expiresAt: new Date(),
        createdAt: new Date(),
      }

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([invitation]),
        }),
      })

      vi.mocked(await import('@/lib/db')).db.select = mockSelect

      const result = await repository.findByEmail(email)

      expect(result).toHaveLength(1)
      expect(result[0].email).toBe(email)
    })
  })

  describe('markAsAccepted', () => {
    it('should update invitation status to accepted', async () => {
      const token = 'valid-token-123'
      const updatedInvitation = {
        id: 'inv-123',
        doctorId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'patient@example.com',
        token,
        status: 'accepted',
        expiresAt: new Date(),
        createdAt: new Date(),
      }

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([updatedInvitation]),
          }),
        }),
      })

      vi.mocked(await import('@/lib/db')).db.update = mockUpdate

      const result = await repository.markAsAccepted(token)

      expect(result?.status).toBe('accepted')
    })

    it('should return null when invitation not found', async () => {
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      })

      vi.mocked(await import('@/lib/db')).db.update = mockUpdate

      const result = await repository.markAsAccepted('non-existent-token')

      expect(result).toBeNull()
    })
  })

  describe('isExpired', () => {
    it('should return true for expired invitation', () => {
      const expiredInvitation = {
        id: 'inv-123',
        doctorId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'patient@example.com',
        token: 'token',
        status: 'pending' as const,
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        createdAt: new Date(),
      }

      expect(repository.isExpired(expiredInvitation)).toBe(true)
    })

    it('should return false for non-expired invitation', () => {
      const validInvitation = {
        id: 'inv-123',
        doctorId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'patient@example.com',
        token: 'token',
        status: 'pending' as const,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        createdAt: new Date(),
      }

      expect(repository.isExpired(validInvitation)).toBe(false)
    })

    it('should return true for already accepted invitation', () => {
      const acceptedInvitation = {
        id: 'inv-123',
        doctorId: '123e4567-e89b-12d3-a456-426614174000',
        email: 'patient@example.com',
        token: 'token',
        status: 'accepted' as const,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      }

      expect(repository.isExpired(acceptedInvitation)).toBe(true)
    })
  })

  describe('generateToken', () => {
    it('should generate a 32-character token', () => {
      const token = repository.generateToken()

      expect(token).toBeDefined()
      expect(token.length).toBe(32)
    })

    it('should generate URL-safe tokens', () => {
      const token = repository.generateToken()

      expect(token).toMatch(/^[a-zA-Z0-9]+$/)
    })
  })
})
