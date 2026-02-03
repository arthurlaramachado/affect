import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  FollowUpService,
  FollowUpServiceError,
  type FollowUpRepository,
  type UserRepository,
  type NotificationService,
} from './follow-up.service'
import type { FollowUp } from '@/lib/db/schema'

function createMockFollowUpRepository(): FollowUpRepository {
  return {
    findById: vi.fn(),
    findByDoctorAndPatient: vi.fn(),
    findByDoctorId: vi.fn(),
    findByPatientId: vi.fn(),
    findPendingByPatientId: vi.fn(),
    create: vi.fn(),
    updateStatus: vi.fn(),
    getAcceptedPatientsByDoctorId: vi.fn(),
  }
}

function createMockUserRepository(): UserRepository {
  return {
    findById: vi.fn(),
    updateDoctorId: vi.fn(),
  }
}

function createMockNotificationService(): NotificationService {
  return {
    createFollowUpRequestNotification: vi.fn(),
    createFollowUpAcceptedNotification: vi.fn(),
    createFollowUpDeclinedNotification: vi.fn(),
  }
}

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

describe('FollowUpService', () => {
  let service: FollowUpService
  let mockFollowUpRepo: ReturnType<typeof createMockFollowUpRepository>
  let mockUserRepo: ReturnType<typeof createMockUserRepository>
  let mockNotificationService: ReturnType<typeof createMockNotificationService>

  beforeEach(() => {
    mockFollowUpRepo = createMockFollowUpRepository()
    mockUserRepo = createMockUserRepository()
    mockNotificationService = createMockNotificationService()
    service = new FollowUpService(mockFollowUpRepo, mockUserRepo, mockNotificationService)
  })

  describe('requestFollowUp', () => {
    it('should create a follow-up request and notify patient', async () => {
      vi.mocked(mockUserRepo.findById)
        .mockResolvedValueOnce({ id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' })
        .mockResolvedValueOnce({ id: 'patient-1', name: 'John Doe', role: 'patient' })

      vi.mocked(mockFollowUpRepo.findByDoctorAndPatient).mockResolvedValue(null)

      const mockFollowUp = createMockFollowUp()
      vi.mocked(mockFollowUpRepo.create).mockResolvedValue(mockFollowUp)

      const result = await service.requestFollowUp({
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        message: 'Please schedule a follow-up',
      })

      expect(result).toEqual(mockFollowUp)
      expect(mockFollowUpRepo.create).toHaveBeenCalledWith({
        doctorId: 'doctor-1',
        patientId: 'patient-1',
        message: 'Please schedule a follow-up',
      })
      expect(mockNotificationService.createFollowUpRequestNotification).toHaveBeenCalledWith(
        'patient-1',
        'Dr. Smith'
      )
    })

    it('should throw if doctor not found', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue(null)

      await expect(
        service.requestFollowUp({
          doctorId: 'invalid-doctor',
          patientId: 'patient-1',
        })
      ).rejects.toThrow(FollowUpServiceError)
    })

    it('should throw if patient not found', async () => {
      vi.mocked(mockUserRepo.findById)
        .mockResolvedValueOnce({ id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' })
        .mockResolvedValueOnce(null)

      await expect(
        service.requestFollowUp({
          doctorId: 'doctor-1',
          patientId: 'invalid-patient',
        })
      ).rejects.toThrow(FollowUpServiceError)
    })

    it('should throw if user is not a doctor', async () => {
      vi.mocked(mockUserRepo.findById).mockResolvedValue({
        id: 'patient-1',
        name: 'John',
        role: 'patient',
      })

      await expect(
        service.requestFollowUp({
          doctorId: 'patient-1',
          patientId: 'patient-2',
        })
      ).rejects.toThrow(FollowUpServiceError)
    })

    it('should throw if pending follow-up already exists', async () => {
      vi.mocked(mockUserRepo.findById)
        .mockResolvedValueOnce({ id: 'doctor-1', name: 'Dr. Smith', role: 'doctor' })
        .mockResolvedValueOnce({ id: 'patient-1', name: 'John Doe', role: 'patient' })

      vi.mocked(mockFollowUpRepo.findByDoctorAndPatient).mockResolvedValue(
        createMockFollowUp({ status: 'pending' })
      )

      await expect(
        service.requestFollowUp({
          doctorId: 'doctor-1',
          patientId: 'patient-1',
        })
      ).rejects.toThrow(FollowUpServiceError)
    })
  })

  describe('respondToFollowUp', () => {
    it('should accept a follow-up, link patient to doctor, and notify doctor', async () => {
      const mockFollowUp = createMockFollowUp({ status: 'pending', doctorId: 'doctor-1', patientId: 'patient-1' })
      vi.mocked(mockFollowUpRepo.findById).mockResolvedValue(mockFollowUp)

      vi.mocked(mockUserRepo.findById).mockResolvedValue({
        id: 'patient-1',
        name: 'John Doe',
        role: 'patient',
      })

      const acceptedFollowUp = createMockFollowUp({ status: 'accepted' })
      vi.mocked(mockFollowUpRepo.updateStatus).mockResolvedValue(acceptedFollowUp)

      const result = await service.respondToFollowUp({
        followUpId: 'follow-up-1',
        userId: 'patient-1',
        action: 'accept',
      })

      expect(result.status).toBe('accepted')
      expect(mockFollowUpRepo.updateStatus).toHaveBeenCalledWith('follow-up-1', 'accepted')
      expect(mockUserRepo.updateDoctorId).toHaveBeenCalledWith('patient-1', 'doctor-1')
      expect(mockNotificationService.createFollowUpAcceptedNotification).toHaveBeenCalledWith(
        'doctor-1',
        'John Doe'
      )
    })

    it('should decline a follow-up and notify doctor', async () => {
      const mockFollowUp = createMockFollowUp({ status: 'pending' })
      vi.mocked(mockFollowUpRepo.findById).mockResolvedValue(mockFollowUp)

      vi.mocked(mockUserRepo.findById).mockResolvedValue({
        id: 'patient-1',
        name: 'John Doe',
        role: 'patient',
      })

      const declinedFollowUp = createMockFollowUp({ status: 'declined' })
      vi.mocked(mockFollowUpRepo.updateStatus).mockResolvedValue(declinedFollowUp)

      const result = await service.respondToFollowUp({
        followUpId: 'follow-up-1',
        userId: 'patient-1',
        action: 'decline',
      })

      expect(result.status).toBe('declined')
      expect(mockNotificationService.createFollowUpDeclinedNotification).toHaveBeenCalledWith(
        'doctor-1',
        'John Doe'
      )
    })

    it('should throw if follow-up not found', async () => {
      vi.mocked(mockFollowUpRepo.findById).mockResolvedValue(null)

      await expect(
        service.respondToFollowUp({
          followUpId: 'invalid-id',
          userId: 'patient-1',
          action: 'accept',
        })
      ).rejects.toThrow(FollowUpServiceError)
    })

    it('should throw if user is not the patient', async () => {
      const mockFollowUp = createMockFollowUp({ patientId: 'patient-1' })
      vi.mocked(mockFollowUpRepo.findById).mockResolvedValue(mockFollowUp)

      await expect(
        service.respondToFollowUp({
          followUpId: 'follow-up-1',
          userId: 'patient-2',
          action: 'accept',
        })
      ).rejects.toThrow(FollowUpServiceError)
    })

    it('should throw if follow-up is not pending', async () => {
      const mockFollowUp = createMockFollowUp({ status: 'accepted' })
      vi.mocked(mockFollowUpRepo.findById).mockResolvedValue(mockFollowUp)

      await expect(
        service.respondToFollowUp({
          followUpId: 'follow-up-1',
          userId: 'patient-1',
          action: 'accept',
        })
      ).rejects.toThrow(FollowUpServiceError)
    })
  })

  describe('endFollowUp', () => {
    it('should end an active follow-up', async () => {
      const mockFollowUp = createMockFollowUp({ status: 'accepted' })
      vi.mocked(mockFollowUpRepo.findById).mockResolvedValue(mockFollowUp)

      const endedFollowUp = createMockFollowUp({ status: 'ended' })
      vi.mocked(mockFollowUpRepo.updateStatus).mockResolvedValue(endedFollowUp)

      const result = await service.endFollowUp({
        followUpId: 'follow-up-1',
        doctorId: 'doctor-1',
      })

      expect(result.status).toBe('ended')
      expect(mockFollowUpRepo.updateStatus).toHaveBeenCalledWith('follow-up-1', 'ended')
    })

    it('should throw if follow-up not found', async () => {
      vi.mocked(mockFollowUpRepo.findById).mockResolvedValue(null)

      await expect(
        service.endFollowUp({
          followUpId: 'invalid-id',
          doctorId: 'doctor-1',
        })
      ).rejects.toThrow(FollowUpServiceError)
    })

    it('should throw if user is not the doctor', async () => {
      const mockFollowUp = createMockFollowUp({ doctorId: 'doctor-1' })
      vi.mocked(mockFollowUpRepo.findById).mockResolvedValue(mockFollowUp)

      await expect(
        service.endFollowUp({
          followUpId: 'follow-up-1',
          doctorId: 'doctor-2',
        })
      ).rejects.toThrow(FollowUpServiceError)
    })

    it('should throw if follow-up is not active', async () => {
      const mockFollowUp = createMockFollowUp({ status: 'pending' })
      vi.mocked(mockFollowUpRepo.findById).mockResolvedValue(mockFollowUp)

      await expect(
        service.endFollowUp({
          followUpId: 'follow-up-1',
          doctorId: 'doctor-1',
        })
      ).rejects.toThrow(FollowUpServiceError)
    })
  })

  describe('getPendingForPatient', () => {
    it('should return pending follow-ups for patient', async () => {
      const mockFollowUps = [
        createMockFollowUp({ id: '1', status: 'pending' }),
        createMockFollowUp({ id: '2', status: 'pending' }),
      ]
      vi.mocked(mockFollowUpRepo.findPendingByPatientId).mockResolvedValue(mockFollowUps)

      const result = await service.getPendingForPatient('patient-1')

      expect(result).toHaveLength(2)
      expect(mockFollowUpRepo.findPendingByPatientId).toHaveBeenCalledWith('patient-1')
    })
  })

  describe('getActiveForDoctor', () => {
    it('should return active follow-ups for doctor', async () => {
      const mockFollowUps = [
        createMockFollowUp({ id: '1', status: 'accepted' }),
        createMockFollowUp({ id: '2', status: 'accepted' }),
      ]
      vi.mocked(mockFollowUpRepo.getAcceptedPatientsByDoctorId).mockResolvedValue(mockFollowUps)

      const result = await service.getActiveForDoctor('doctor-1')

      expect(result).toHaveLength(2)
      expect(mockFollowUpRepo.getAcceptedPatientsByDoctorId).toHaveBeenCalledWith('doctor-1')
    })
  })

  describe('getFollowUpById', () => {
    it('should return follow-up by id', async () => {
      const mockFollowUp = createMockFollowUp()
      vi.mocked(mockFollowUpRepo.findById).mockResolvedValue(mockFollowUp)

      const result = await service.getFollowUpById('follow-up-1')

      expect(result).toEqual(mockFollowUp)
    })

    it('should return null if not found', async () => {
      vi.mocked(mockFollowUpRepo.findById).mockResolvedValue(null)

      const result = await service.getFollowUpById('invalid-id')

      expect(result).toBeNull()
    })
  })
})
