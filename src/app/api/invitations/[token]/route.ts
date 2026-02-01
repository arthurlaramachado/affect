import { NextRequest, NextResponse } from 'next/server'
import { InvitationService } from '@/lib/services/invitation.service'
import { invitationRepository } from '@/lib/db/repositories/invitation.repository'
import { getEmailService } from '@/lib/services/email.service'

function createInvitationService(): InvitationService {
  return new InvitationService(invitationRepository, getEmailService())
}

interface RouteParams {
  params: Promise<{ token: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { token } = await params

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Token is required' },
        { status: 400 }
      )
    }

    const service = createInvitationService()
    const result = await service.validateToken(token)

    if (!result.valid) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: {
        email: result.invitation!.email,
        expiresAt: result.invitation!.expiresAt.toISOString(),
      },
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
