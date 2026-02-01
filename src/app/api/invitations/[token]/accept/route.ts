import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { InvitationService, InvitationError } from '@/lib/services/invitation.service'
import { invitationRepository } from '@/lib/db/repositories/invitation.repository'
import { getEmailService } from '@/lib/services/email.service'

const acceptInvitationSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

function createInvitationService(): InvitationService {
  return new InvitationService(invitationRepository, getEmailService())
}

interface RouteParams {
  params: Promise<{ token: string }>
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const validationResult = acceptInvitationSchema.safeParse(body)

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
    const result = await service.acceptInvitation(token)

    return NextResponse.json({
      success: true,
      data: {
        doctorId: result.doctorId,
        email: result.patientEmail,
      },
    })
  } catch (error) {
    if (error instanceof InvitationError) {
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
