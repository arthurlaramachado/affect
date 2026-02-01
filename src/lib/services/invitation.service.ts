import type { User, Invitation } from '@/lib/db/schema'
import type { InvitationRepository } from '@/lib/db/repositories/invitation.repository'

export class InvitationError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'InvitationError'
  }
}

interface EmailService {
  sendInvitationEmail(params: {
    to: string
    doctorName: string
    inviteToken: string
  }): Promise<{ success: boolean; error?: string }>
}

interface SendInvitationParams {
  doctor: User
  patientEmail: string
}

interface ValidationResult {
  valid: boolean
  invitation?: Invitation
  error?: string
}

interface AcceptResult {
  doctorId: string
  patientEmail: string
}

const INVITATION_EXPIRY_DAYS = 7

export class InvitationService {
  constructor(
    private repository: InvitationRepository,
    private emailService: EmailService
  ) {}

  async sendInvitation(params: SendInvitationParams): Promise<Invitation> {
    const { doctor, patientEmail } = params

    if (doctor.role !== 'doctor') {
      throw new InvitationError(
        'Only doctors can send invitations',
        'INVALID_ROLE'
      )
    }

    const normalizedEmail = patientEmail.toLowerCase()
    const expiresAt = new Date(
      Date.now() + INVITATION_EXPIRY_DAYS * 24 * 60 * 60 * 1000
    )

    const invitation = await this.repository.create({
      doctorId: doctor.id,
      email: normalizedEmail,
      expiresAt,
    })

    const emailResult = await this.emailService.sendInvitationEmail({
      to: normalizedEmail,
      doctorName: doctor.name,
      inviteToken: invitation.token,
    })

    if (!emailResult.success) {
      throw new InvitationError(
        emailResult.error || 'Failed to send invitation email',
        'EMAIL_FAILED'
      )
    }

    return invitation
  }

  async validateToken(token: string): Promise<ValidationResult> {
    const invitation = await this.repository.findByToken(token)

    if (!invitation) {
      return { valid: false, error: 'Invitation not found' }
    }

    if (this.repository.isExpired(invitation)) {
      return { valid: false, error: 'Invitation has expired' }
    }

    return { valid: true, invitation }
  }

  async acceptInvitation(token: string): Promise<AcceptResult> {
    const validation = await this.validateToken(token)

    if (!validation.valid || !validation.invitation) {
      throw new InvitationError(
        validation.error || 'Invalid invitation',
        'INVALID_INVITATION'
      )
    }

    await this.repository.markAsAccepted(token)

    return {
      doctorId: validation.invitation.doctorId,
      patientEmail: validation.invitation.email,
    }
  }

  async getInvitationsForDoctor(doctorId: string): Promise<Invitation[]> {
    return this.repository.findByDoctorId(doctorId)
  }
}
