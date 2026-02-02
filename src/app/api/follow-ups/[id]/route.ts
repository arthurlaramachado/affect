import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession as defaultGetSession } from '@/lib/auth/session'
import type { FollowUp, User } from '@/lib/db/schema'

const updateFollowUpSchema = z.object({
  action: z.enum(['accept', 'decline', 'end']),
})

export interface FollowUpServiceInterface {
  requestFollowUp(params: {
    doctorId: string
    patientId: string
    message?: string
  }): Promise<FollowUp>
  respondToFollowUp(params: {
    followUpId: string
    userId: string
    action: 'accept' | 'decline'
  }): Promise<FollowUp>
  endFollowUp(params: { followUpId: string; doctorId: string }): Promise<FollowUp>
  getPendingForPatient(patientId: string): Promise<FollowUp[]>
  getActiveForDoctor(doctorId: string): Promise<FollowUp[]>
  getFollowUpById(id: string): Promise<FollowUp | null>
}

export type GetSessionFn = () => Promise<{
  user: { id: string; role?: string } | null
} | null>

export interface Dependencies {
  getSession: GetSessionFn
  followUpService: FollowUpServiceInterface
}

export interface UpdateFollowUpInput {
  action?: string
}

export async function handleUpdateFollowUp(
  followUpId: string,
  body: UpdateFollowUpInput,
  deps: Dependencies
): Promise<NextResponse> {
  try {
    const session = await deps.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const validationResult = updateFollowUpSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Invalid action' },
        { status: 400 }
      )
    }

    const { action } = validationResult.data
    const user = session.user as User & { role?: string }

    let followUp: FollowUp

    if (action === 'end') {
      followUp = await deps.followUpService.endFollowUp({
        followUpId,
        doctorId: user.id,
      })
    } else {
      followUp = await deps.followUpService.respondToFollowUp({
        followUpId,
        userId: user.id,
        action,
      })
    }

    return NextResponse.json({ success: true, data: followUp })
  } catch (error) {
    if (error instanceof Error && error.name === 'FollowUpServiceError') {
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

// Import real dependencies
import { followUpService } from '@/lib/services'

const defaultDependencies: Dependencies = {
  getSession: defaultGetSession,
  followUpService,
}

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const body = await request.json()
  return handleUpdateFollowUp(id, body, defaultDependencies)
}
