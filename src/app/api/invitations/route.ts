import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth/session'
import { InvitationService } from '@/lib/services/invitation.service'
import { InvitationRepository, invitationRepository } from '@/lib/db/repositories/invitation.repository'
import { EmailService, getEmailService } from '@/lib/services/email.service'
import type { User } from '@/lib/db/schema'

const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
})

function createInvitationService(): InvitationService {
  return new InvitationService(invitationRepository, getEmailService())
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user as User & { role?: string }

    if (user.role !== 'doctor') {
      return NextResponse.json(
        { success: false, error: 'Only doctors can send invitations' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const validationResult = createInvitationSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request',
          details: validationResult.error.flatten().fieldErrors,
        },
        { status: 400 }
      )
    }

    const service = createInvitationService()

    const invitation = await service.sendInvitation({
      doctor: user as User,
      patientEmail: validationResult.data.email,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: invitation.id,
        email: invitation.email,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
      },
    })
  } catch (error) {
    if (error instanceof Error && error.name === 'InvitationError') {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user as User & { role?: string }

    if (user.role !== 'doctor') {
      return NextResponse.json(
        { success: false, error: 'Only doctors can view invitations' },
        { status: 403 }
      )
    }

    const service = createInvitationService()
    const invitations = await service.getInvitationsForDoctor(user.id)

    return NextResponse.json({
      success: true,
      data: invitations.map((inv) => ({
        id: inv.id,
        email: inv.email,
        status: inv.status,
        expiresAt: inv.expiresAt.toISOString(),
        createdAt: inv.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
