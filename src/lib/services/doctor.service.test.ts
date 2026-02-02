import { describe, it, expect, vi, beforeEach } from 'vitest'
import { DoctorService } from './doctor.service'
import type { User, DailyLog } from '@/lib/db/schema'

describe('DoctorService', () => {
  let service: DoctorService
  let mockUserRepository: {
    findById: ReturnType<typeof vi.fn>
    findPatientsByDoctorId: ReturnType<typeof vi.fn>
    updateDoctorId: ReturnType<typeof vi.fn>
  }
  let mockDailyLogRepository: {
    getLatestByUserId: ReturnType<typeof vi.fn>
    findByUserId: ReturnType<typeof vi.fn>
  }

  const mockDoctor: User = {
    id: 'doctor-1',
    email: 'doctor@example.com',
    name: 'Dr. Smith',
    passwordHash: 'hash',
    role: 'doctor',
    doctorId: null,
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockPatient: User = {
    id: 'patient-1',
    email: 'patient@example.com',
    name: 'John Doe',
    passwordHash: 'hash',
    role: 'patient',
    doctorId: 'doctor-1',
    emailVerified: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockDailyLog: DailyLog = {
    id: 'log-1',
    userId: 'patient-1',
    moodScore: 5,
    riskFlag: false,
    analysisJson: {
      mood_score: 5,
      risk_flags: {
        suicidality_indicated: false,
        self_harm_indicated: false,
        severe_distress: false,
      },
      biomarkers: {
        speech_latency: 'normal',
        affect_type: 'full_range',
        eye_contact: 'normal',
      },
      clinical_summary: 'Patient appears stable.',
    },
    createdAt: new Date(),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockUserRepository = {
      findById: vi.fn(),
      findPatientsByDoctorId: vi.fn(),
      updateDoctorId: vi.fn(),
    }

    mockDailyLogRepository = {
      getLatestByUserId: vi.fn(),
      findByUserId: vi.fn(),
    }

    service = new DoctorService(
      mockUserRepository as any,
      mockDailyLogRepository as any
    )
  })

  describe('getPatients', () => {
    it('should return patients with their latest status', async () => {
      mockUserRepository.findPatientsByDoctorId.mockResolvedValue([mockPatient])
      mockDailyLogRepository.getLatestByUserId.mockResolvedValue(mockDailyLog)

      const result = await service.getPatients('doctor-1')

      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        id: 'patient-1',
        name: 'John Doe',
        email: 'patient@example.com',
        lastCheckIn: expect.any(Date),
        moodScore: 5,
        riskLevel: 'stable',
      })
    })

    it('should return "alert" risk level for mood < 3', async () => {
      const lowMoodLog = { ...mockDailyLog, moodScore: 2, riskFlag: false }
      mockUserRepository.findPatientsByDoctorId.mockResolvedValue([mockPatient])
      mockDailyLogRepository.getLatestByUserId.mockResolvedValue(lowMoodLog)

      const result = await service.getPatients('doctor-1')

      expect(result[0].riskLevel).toBe('alert')
    })

    it('should return "alert" risk level for risk flag', async () => {
      const riskLog = { ...mockDailyLog, riskFlag: true }
      mockUserRepository.findPatientsByDoctorId.mockResolvedValue([mockPatient])
      mockDailyLogRepository.getLatestByUserId.mockResolvedValue(riskLog)

      const result = await service.getPatients('doctor-1')

      expect(result[0].riskLevel).toBe('alert')
    })

    it('should return "drift" risk level for mood 3-4', async () => {
      const driftLog = { ...mockDailyLog, moodScore: 4 }
      mockUserRepository.findPatientsByDoctorId.mockResolvedValue([mockPatient])
      mockDailyLogRepository.getLatestByUserId.mockResolvedValue(driftLog)

      const result = await service.getPatients('doctor-1')

      expect(result[0].riskLevel).toBe('drift')
    })

    it('should handle patients with no check-ins', async () => {
      mockUserRepository.findPatientsByDoctorId.mockResolvedValue([mockPatient])
      mockDailyLogRepository.getLatestByUserId.mockResolvedValue(null)

      const result = await service.getPatients('doctor-1')

      expect(result[0]).toMatchObject({
        id: 'patient-1',
        lastCheckIn: null,
        moodScore: null,
        riskLevel: 'unknown',
      })
    })
  })

  describe('getPatientDetail', () => {
    it('should return patient with mood history', async () => {
      mockUserRepository.findById.mockResolvedValue(mockPatient)
      mockDailyLogRepository.findByUserId.mockResolvedValue([mockDailyLog])

      const result = await service.getPatientDetail('doctor-1', 'patient-1')

      expect(result).toMatchObject({
        patient: expect.objectContaining({
          id: 'patient-1',
          name: 'John Doe',
        }),
        moodHistory: expect.arrayContaining([
          expect.objectContaining({
            moodScore: 5,
            date: expect.any(Date),
          }),
        ]),
        riskLevel: 'stable',
      })
    })

    it('should throw if patient not found', async () => {
      mockUserRepository.findById.mockResolvedValue(null)

      await expect(
        service.getPatientDetail('doctor-1', 'patient-1')
      ).rejects.toThrow('Patient not found')
    })

    it('should throw if patient belongs to different doctor', async () => {
      const otherDoctorPatient = { ...mockPatient, doctorId: 'other-doctor' }
      mockUserRepository.findById.mockResolvedValue(otherDoctorPatient)

      await expect(
        service.getPatientDetail('doctor-1', 'patient-1')
      ).rejects.toThrow('Unauthorized')
    })
  })

  describe('linkPatientToDoctor', () => {
    it('should update patient doctorId', async () => {
      mockUserRepository.updateDoctorId.mockResolvedValue({ ...mockPatient, doctorId: 'doctor-1' })

      const result = await service.linkPatientToDoctor('patient-1', 'doctor-1')

      expect(mockUserRepository.updateDoctorId).toHaveBeenCalledWith('patient-1', 'doctor-1')
      expect(result.doctorId).toBe('doctor-1')
    })
  })

  describe('verifyPatientBelongsToDoctor', () => {
    it('should return true when patient belongs to doctor', async () => {
      mockUserRepository.findById.mockResolvedValue(mockPatient)

      const result = await service.verifyPatientBelongsToDoctor('doctor-1', 'patient-1')

      expect(result).toBe(true)
    })

    it('should throw NOT_FOUND when patient does not exist', async () => {
      mockUserRepository.findById.mockResolvedValue(null)

      await expect(
        service.verifyPatientBelongsToDoctor('doctor-1', 'nonexistent')
      ).rejects.toThrow('Patient not found')
    })

    it('should throw UNAUTHORIZED when patient belongs to different doctor', async () => {
      const otherDoctorPatient = { ...mockPatient, doctorId: 'other-doctor' }
      mockUserRepository.findById.mockResolvedValue(otherDoctorPatient)

      await expect(
        service.verifyPatientBelongsToDoctor('doctor-1', 'patient-1')
      ).rejects.toThrow('Unauthorized')
    })

    it('should throw UNAUTHORIZED when patient has no doctor', async () => {
      const noDoctor = { ...mockPatient, doctorId: null }
      mockUserRepository.findById.mockResolvedValue(noDoctor)

      await expect(
        service.verifyPatientBelongsToDoctor('doctor-1', 'patient-1')
      ).rejects.toThrow('Unauthorized')
    })
  })
})
