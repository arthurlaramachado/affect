import { eq, desc } from 'drizzle-orm'
import { db } from '@/lib/db'
import { invitations, type Invitation, type NewInvitation } from '@/lib/db/schema'
import { randomBytes } from 'crypto'

export interface CreateInvitationData {
  doctorId: string
  email: string
  expiresAt: Date
}

export class InvitationRepository {
  async create(data: CreateInvitationData): Promise<Invitation> {
    const token = this.generateToken()

    const newInvitation: NewInvitation = {
      doctorId: data.doctorId,
      email: data.email.toLowerCase(),
      token,
      expiresAt: data.expiresAt,
    }

    const [invitation] = await db
      .insert(invitations)
      .values(newInvitation)
      .returning()

    return invitation
  }

  async findByToken(token: string): Promise<Invitation | null> {
    const [invitation] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, token))

    return invitation ?? null
  }

  async findByDoctorId(doctorId: string): Promise<Invitation[]> {
    return db
      .select()
      .from(invitations)
      .where(eq(invitations.doctorId, doctorId))
      .orderBy(desc(invitations.createdAt))
  }

  async findByEmail(email: string): Promise<Invitation[]> {
    return db
      .select()
      .from(invitations)
      .where(eq(invitations.email, email.toLowerCase()))
  }

  async markAsAccepted(token: string): Promise<Invitation | null> {
    const [invitation] = await db
      .update(invitations)
      .set({ status: 'accepted' })
      .where(eq(invitations.token, token))
      .returning()

    return invitation ?? null
  }

  isExpired(invitation: Invitation): boolean {
    if (invitation.status !== 'pending') {
      return true
    }
    return new Date() > invitation.expiresAt
  }

  generateToken(): string {
    return randomBytes(16).toString('hex')
  }
}

export const invitationRepository = new InvitationRepository()
