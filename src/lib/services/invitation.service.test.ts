import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest'
import { InvitationService, InvitationError } from './invitation.service'
import type { InvitationRepository } from '@/lib/db/repositories/invitation.repository'

interface MockedInvitationRepository {
  create: Mock
  findByToken: Mock
  findByDoctorId: Mock
  findByEmail: Mock
  markAsAccepted: Mock
  isExpired: Mock
  generateToken: Mock
}

interface MockedEmailService {
  sendInvitationEmail: Mock
}

describe('InvitationService', () => {
  let service: InvitationService
  let mockRepository: MockedInvitationRepository
  let mockEmailService: MockedEmailService

  const mockDoctor = {
    id: '123e4567-e89b-12d3-a456-426614174000',
    email: 'doctor@example.com',
    name: 'Dr. Smith',
    role: 'doctor' as const,
    passwordHash: 'hash',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockInvitation = {
    id: 'inv-123',
    doctorId: mockDoctor.id,
    email: 'patient@example.com',
    token: 'valid-token-123',
    status: 'pending' as const,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    createdAt: new Date(),
  }

  beforeEach(() => {
    mockRepository = {
      create: vi.fn(),
      findByToken: vi.fn(),
      findByDoctorId: vi.fn(),
      findByEmail: vi.fn(),
      markAsAccepted: vi.fn(),
      isExpired: vi.fn(),
      generateToken: vi.fn().mockReturnValue('generated-token'),
    }

    mockEmailService = {
      sendInvitationEmail: vi.fn().mockResolvedValue({ success: true }),
    }

    service = new InvitationService(
      mockRepository as unknown as InvitationRepository,
      mockEmailService
    )
  })

  describe('sendInvitation', () => {
    it('should create invitation and send email', async () => {
      mockRepository.create.mockResolvedValue(mockInvitation)

      const result = await service.sendInvitation({
        doctor: mockDoctor,
        patientEmail: 'patient@example.com',
      })

      expect(mockRepository.create).toHaveBeenCalledWith({
        doctorId: mockDoctor.id,
        email: 'patient@example.com',
        expiresAt: expect.any(Date),
      })
      expect(mockEmailService.sendInvitationEmail).toHaveBeenCalledWith({
        to: 'patient@example.com',
        doctorName: mockDoctor.name,
        inviteToken: mockInvitation.token,
      })
      expect(result).toEqual(mockInvitation)
    })

    it('should throw error if doctor is not a doctor role', async () => {
      const patient = { ...mockDoctor, role: 'patient' as const }

      await expect(
        service.sendInvitation({
          doctor: patient,
          patientEmail: 'patient@example.com',
        })
      ).rejects.toThrow(InvitationError)
    })

    it('should throw error if email sending fails', async () => {
      mockRepository.create.mockResolvedValue(mockInvitation)
      mockEmailService.sendInvitationEmail.mockResolvedValue({ success: false, error: 'Failed' })

      await expect(
        service.sendInvitation({
          doctor: mockDoctor,
          patientEmail: 'patient@example.com',
        })
      ).rejects.toThrow(InvitationError)
    })

    it('should normalize email to lowercase', async () => {
      mockRepository.create.mockResolvedValue(mockInvitation)

      await service.sendInvitation({
        doctor: mockDoctor,
        patientEmail: 'Patient@EXAMPLE.com',
      })

      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          email: 'patient@example.com',
        })
      )
    })
  })

  describe('validateToken', () => {
    it('should return valid invitation', async () => {
      mockRepository.findByToken.mockResolvedValue(mockInvitation)
      mockRepository.isExpired.mockReturnValue(false)

      const result = await service.validateToken('valid-token-123')

      expect(result.valid).toBe(true)
      expect(result.invitation).toEqual(mockInvitation)
    })

    it('should return invalid for non-existent token', async () => {
      mockRepository.findByToken.mockResolvedValue(null)

      const result = await service.validateToken('non-existent-token')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invitation not found')
    })

    it('should return invalid for expired invitation', async () => {
      mockRepository.findByToken.mockResolvedValue(mockInvitation)
      mockRepository.isExpired.mockReturnValue(true)

      const result = await service.validateToken('expired-token')

      expect(result.valid).toBe(false)
      expect(result.error).toBe('Invitation has expired')
    })
  })

  describe('acceptInvitation', () => {
    it('should mark invitation as accepted and return doctor info', async () => {
      const acceptedInvitation = { ...mockInvitation, status: 'accepted' as const }
      mockRepository.findByToken.mockResolvedValue(mockInvitation)
      mockRepository.isExpired.mockReturnValue(false)
      mockRepository.markAsAccepted.mockResolvedValue(acceptedInvitation)

      const result = await service.acceptInvitation('valid-token-123')

      expect(result.doctorId).toBe(mockDoctor.id)
      expect(result.patientEmail).toBe(mockInvitation.email)
      expect(mockRepository.markAsAccepted).toHaveBeenCalledWith('valid-token-123')
    })

    it('should throw error for invalid token', async () => {
      mockRepository.findByToken.mockResolvedValue(null)

      await expect(service.acceptInvitation('invalid-token')).rejects.toThrow(
        InvitationError
      )
    })

    it('should throw error for expired invitation', async () => {
      mockRepository.findByToken.mockResolvedValue(mockInvitation)
      mockRepository.isExpired.mockReturnValue(true)

      await expect(service.acceptInvitation('expired-token')).rejects.toThrow(
        InvitationError
      )
    })

    it('should throw error if already accepted', async () => {
      const acceptedInvitation = { ...mockInvitation, status: 'accepted' as const }
      mockRepository.findByToken.mockResolvedValue(acceptedInvitation)
      mockRepository.isExpired.mockReturnValue(true) // isExpired returns true for non-pending

      await expect(service.acceptInvitation('already-accepted-token')).rejects.toThrow(
        InvitationError
      )
    })
  })

  describe('getInvitationsForDoctor', () => {
    it('should return all invitations for doctor', async () => {
      const invitations = [mockInvitation, { ...mockInvitation, id: 'inv-456' }]
      mockRepository.findByDoctorId.mockResolvedValue(invitations)

      const result = await service.getInvitationsForDoctor(mockDoctor.id)

      expect(result).toHaveLength(2)
      expect(mockRepository.findByDoctorId).toHaveBeenCalledWith(mockDoctor.id)
    })
  })
})
