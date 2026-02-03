import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createFollowUpRepository } from './follow-up.repository'
import type { FollowUp, NewFollowUp } from '../schema'

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  orderBy: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
}

describe('FollowUpRepository', () => {
  let followUpRepository: ReturnType<typeof createFollowUpRepository>

  beforeEach(() => {
    vi.clearAllMocks()
    followUpRepository = createFollowUpRepository(mockDb as never)
  })

  describe('findById', () => {
    it('should return follow-up when found', async () => {
      const mockFollowUp: FollowUp = {
        id: 'followup-123',
        doctorId: 'doctor-123',
        patientId: 'patient-123',
        status: 'pending',
        message: 'Hello',
        requestedAt: new Date(),
        respondedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.limit.mockResolvedValueOnce([mockFollowUp])

      const result = await followUpRepository.findById('followup-123')

      expect(result).toEqual(mockFollowUp)
    })

    it('should return null when not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await followUpRepository.findById('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('findByDoctorAndPatient', () => {
    it('should return active follow-up between doctor and patient', async () => {
      const mockFollowUp: FollowUp = {
        id: 'followup-123',
        doctorId: 'doctor-123',
        patientId: 'patient-123',
        status: 'accepted',
        message: null,
        requestedAt: new Date(),
        respondedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.limit.mockResolvedValueOnce([mockFollowUp])

      const result = await followUpRepository.findByDoctorAndPatient(
        'doctor-123',
        'patient-123'
      )

      expect(result).toEqual(mockFollowUp)
    })
  })

  describe('findByDoctorId', () => {
    it('should return all follow-ups for a doctor', async () => {
      const followUps: FollowUp[] = [
        {
          id: 'followup-1',
          doctorId: 'doctor-123',
          patientId: 'patient-1',
          status: 'accepted',
          message: null,
          requestedAt: new Date(),
          respondedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'followup-2',
          doctorId: 'doctor-123',
          patientId: 'patient-2',
          status: 'pending',
          message: 'Requesting follow-up',
          requestedAt: new Date(),
          respondedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockDb.orderBy.mockResolvedValueOnce(followUps)

      const result = await followUpRepository.findByDoctorId('doctor-123')

      expect(result).toEqual(followUps)
    })
  })

  describe('findByPatientId', () => {
    it('should return all follow-ups for a patient', async () => {
      const followUps: FollowUp[] = [
        {
          id: 'followup-1',
          doctorId: 'doctor-1',
          patientId: 'patient-123',
          status: 'accepted',
          message: null,
          requestedAt: new Date(),
          respondedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockDb.orderBy.mockResolvedValueOnce(followUps)

      const result = await followUpRepository.findByPatientId('patient-123')

      expect(result).toEqual(followUps)
    })
  })

  describe('findPendingByPatientId', () => {
    it('should return only pending follow-ups for a patient', async () => {
      const pendingFollowUps: FollowUp[] = [
        {
          id: 'followup-1',
          doctorId: 'doctor-1',
          patientId: 'patient-123',
          status: 'pending',
          message: 'Please join my practice',
          requestedAt: new Date(),
          respondedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockDb.orderBy.mockResolvedValueOnce(pendingFollowUps)

      const result = await followUpRepository.findPendingByPatientId('patient-123')

      expect(result).toEqual(pendingFollowUps)
    })
  })

  describe('getPendingCountByPatientId', () => {
    it('should return the count of pending follow-ups', async () => {
      const pendingFollowUps: FollowUp[] = [
        {
          id: 'followup-1',
          doctorId: 'doctor-1',
          patientId: 'patient-123',
          status: 'pending',
          message: 'Request 1',
          requestedAt: new Date(),
          respondedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'followup-2',
          doctorId: 'doctor-2',
          patientId: 'patient-123',
          status: 'pending',
          message: 'Request 2',
          requestedAt: new Date(),
          respondedAt: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockDb.where.mockResolvedValueOnce(pendingFollowUps)

      const result = await followUpRepository.getPendingCountByPatientId('patient-123')

      expect(result).toBe(2)
    })

    it('should return 0 when no pending follow-ups', async () => {
      mockDb.where.mockResolvedValueOnce([])

      const result = await followUpRepository.getPendingCountByPatientId('patient-123')

      expect(result).toBe(0)
    })
  })

  describe('create', () => {
    it('should create a new follow-up request', async () => {
      const newFollowUp: NewFollowUp = {
        doctorId: 'doctor-123',
        patientId: 'patient-123',
        message: 'Please join my practice',
      }

      const createdFollowUp: FollowUp = {
        id: 'new-followup-id',
        ...newFollowUp,
        status: 'pending',
        requestedAt: new Date(),
        respondedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.returning.mockResolvedValueOnce([createdFollowUp])

      const result = await followUpRepository.create(newFollowUp)

      expect(result).toEqual(createdFollowUp)
    })
  })

  describe('updateStatus', () => {
    it('should update follow-up status to accepted', async () => {
      const updatedFollowUp: FollowUp = {
        id: 'followup-123',
        doctorId: 'doctor-123',
        patientId: 'patient-123',
        status: 'accepted',
        message: null,
        requestedAt: new Date(),
        respondedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.returning.mockResolvedValueOnce([updatedFollowUp])

      const result = await followUpRepository.updateStatus('followup-123', 'accepted')

      expect(result).toEqual(updatedFollowUp)
      expect(result?.status).toBe('accepted')
    })

    it('should update follow-up status to declined', async () => {
      const updatedFollowUp: FollowUp = {
        id: 'followup-123',
        doctorId: 'doctor-123',
        patientId: 'patient-123',
        status: 'declined',
        message: null,
        requestedAt: new Date(),
        respondedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.returning.mockResolvedValueOnce([updatedFollowUp])

      const result = await followUpRepository.updateStatus('followup-123', 'declined')

      expect(result).toEqual(updatedFollowUp)
      expect(result?.status).toBe('declined')
    })

    it('should return null when follow-up not found', async () => {
      mockDb.returning.mockResolvedValueOnce([])

      const result = await followUpRepository.updateStatus('non-existent', 'accepted')

      expect(result).toBeNull()
    })
  })

  describe('getAcceptedPatientsByDoctorId', () => {
    it('should return only accepted follow-ups', async () => {
      const acceptedFollowUps: FollowUp[] = [
        {
          id: 'followup-1',
          doctorId: 'doctor-123',
          patientId: 'patient-1',
          status: 'accepted',
          message: null,
          requestedAt: new Date(),
          respondedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockDb.orderBy.mockResolvedValueOnce(acceptedFollowUps)

      const result = await followUpRepository.getAcceptedPatientsByDoctorId('doctor-123')

      expect(result).toEqual(acceptedFollowUps)
    })
  })

  describe('hasActiveFollowUpByPatientId', () => {
    it('should return true when patient has an accepted follow-up', async () => {
      const acceptedFollowUp: FollowUp = {
        id: 'followup-1',
        doctorId: 'doctor-123',
        patientId: 'patient-123',
        status: 'accepted',
        message: null,
        requestedAt: new Date(),
        respondedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.limit.mockResolvedValueOnce([acceptedFollowUp])

      const result = await followUpRepository.hasActiveFollowUpByPatientId('patient-123')

      expect(result).toBe(true)
    })

    it('should return false when patient has no accepted follow-up', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await followUpRepository.hasActiveFollowUpByPatientId('patient-123')

      expect(result).toBe(false)
    })

    it('should return false when patient only has pending follow-ups', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await followUpRepository.hasActiveFollowUpByPatientId('patient-456')

      expect(result).toBe(false)
    })
  })
})
