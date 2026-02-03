import type { FollowUp } from '@/lib/db/schema'
import type { FollowUpStatus } from '@/types/database'

export class FollowUpServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'FollowUpServiceError'
  }
}

export interface FollowUpRepository {
  findById(id: string): Promise<FollowUp | null>
  findByDoctorAndPatient(doctorId: string, patientId: string): Promise<FollowUp | null>
  findByDoctorId(doctorId: string): Promise<FollowUp[]>
  findByPatientId(patientId: string): Promise<FollowUp[]>
  findPendingByPatientId(patientId: string): Promise<FollowUp[]>
  create(data: { doctorId: string; patientId: string; message?: string }): Promise<FollowUp>
  updateStatus(id: string, status: FollowUpStatus): Promise<FollowUp | null>
  getAcceptedPatientsByDoctorId(doctorId: string): Promise<FollowUp[]>
}

export interface NotificationService {
  createFollowUpRequestNotification(patientId: string, doctorName: string): Promise<void>
  createFollowUpAcceptedNotification(doctorId: string, patientName: string): Promise<void>
  createFollowUpDeclinedNotification(doctorId: string, patientName: string): Promise<void>
}

export interface UserRepository {
  findById(id: string): Promise<{ id: string; name: string; role: string } | null>
  updateDoctorId(userId: string, doctorId: string): Promise<unknown>
}

export interface RequestFollowUpParams {
  doctorId: string
  patientId: string
  message?: string
}

export interface RespondFollowUpParams {
  followUpId: string
  userId: string
  action: 'accept' | 'decline'
}

export interface EndFollowUpParams {
  followUpId: string
  doctorId: string
}

export class FollowUpService {
  constructor(
    private followUpRepository: FollowUpRepository,
    private userRepository: UserRepository,
    private notificationService: NotificationService
  ) {}

  async requestFollowUp(params: RequestFollowUpParams): Promise<FollowUp> {
    const { doctorId, patientId, message } = params

    const doctor = await this.userRepository.findById(doctorId)
    if (!doctor) {
      throw new FollowUpServiceError('Doctor not found', 'DOCTOR_NOT_FOUND')
    }

    if (doctor.role !== 'doctor') {
      throw new FollowUpServiceError('User is not a doctor', 'INVALID_ROLE')
    }

    const patient = await this.userRepository.findById(patientId)
    if (!patient) {
      throw new FollowUpServiceError('Patient not found', 'PATIENT_NOT_FOUND')
    }

    const existingFollowUp = await this.followUpRepository.findByDoctorAndPatient(doctorId, patientId)
    if (existingFollowUp && existingFollowUp.status === 'pending') {
      throw new FollowUpServiceError('Pending follow-up already exists', 'ALREADY_EXISTS')
    }

    const followUp = await this.followUpRepository.create({
      doctorId,
      patientId,
      message,
    })

    await this.notificationService.createFollowUpRequestNotification(patientId, doctor.name)

    return followUp
  }

  async respondToFollowUp(params: RespondFollowUpParams): Promise<FollowUp> {
    const { followUpId, userId, action } = params

    const followUp = await this.followUpRepository.findById(followUpId)
    if (!followUp) {
      throw new FollowUpServiceError('Follow-up not found', 'NOT_FOUND')
    }

    if (followUp.patientId !== userId) {
      throw new FollowUpServiceError('Unauthorized', 'UNAUTHORIZED')
    }

    if (followUp.status !== 'pending') {
      throw new FollowUpServiceError('Follow-up is not pending', 'INVALID_STATUS')
    }

    const patient = await this.userRepository.findById(userId)
    if (!patient) {
      throw new FollowUpServiceError('Patient not found', 'PATIENT_NOT_FOUND')
    }

    const newStatus: FollowUpStatus = action === 'accept' ? 'accepted' : 'declined'
    const updatedFollowUp = await this.followUpRepository.updateStatus(followUpId, newStatus)

    if (!updatedFollowUp) {
      throw new FollowUpServiceError('Failed to update follow-up', 'UPDATE_FAILED')
    }

    if (action === 'accept') {
      await this.userRepository.updateDoctorId(followUp.patientId, followUp.doctorId)
      await this.notificationService.createFollowUpAcceptedNotification(
        followUp.doctorId,
        patient.name
      )
    } else {
      await this.notificationService.createFollowUpDeclinedNotification(
        followUp.doctorId,
        patient.name
      )
    }

    return updatedFollowUp
  }

  async endFollowUp(params: EndFollowUpParams): Promise<FollowUp> {
    const { followUpId, doctorId } = params

    const followUp = await this.followUpRepository.findById(followUpId)
    if (!followUp) {
      throw new FollowUpServiceError('Follow-up not found', 'NOT_FOUND')
    }

    if (followUp.doctorId !== doctorId) {
      throw new FollowUpServiceError('Unauthorized', 'UNAUTHORIZED')
    }

    if (followUp.status !== 'accepted') {
      throw new FollowUpServiceError('Follow-up is not active', 'INVALID_STATUS')
    }

    const updatedFollowUp = await this.followUpRepository.updateStatus(followUpId, 'ended')

    if (!updatedFollowUp) {
      throw new FollowUpServiceError('Failed to update follow-up', 'UPDATE_FAILED')
    }

    return updatedFollowUp
  }

  async getPendingForPatient(patientId: string): Promise<FollowUp[]> {
    return this.followUpRepository.findPendingByPatientId(patientId)
  }

  async getActiveForDoctor(doctorId: string): Promise<FollowUp[]> {
    return this.followUpRepository.getAcceptedPatientsByDoctorId(doctorId)
  }

  async getFollowUpById(id: string): Promise<FollowUp | null> {
    return this.followUpRepository.findById(id)
  }
}
