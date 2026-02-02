import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession as defaultGetSession } from '@/lib/auth/session'
import type { FollowUp, User } from '@/lib/db/schema'

const createFollowUpSchema = z.object({
  patientId: z.string().min(1, 'Patient ID is required'),
  message: z.string().optional(),
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

export interface CreateFollowUpInput {
  patientId?: string
  message?: string
}

export async function handleCreateFollowUp(
  body: CreateFollowUpInput,
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

    const user = session.user as User & { role?: string }

    if (user.role !== 'doctor') {
      return NextResponse.json(
        { success: false, error: 'Only doctors can create follow-up requests' },
        { status: 403 }
      )
    }

    const validationResult = createFollowUpSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Patient ID is required' },
        { status: 400 }
      )
    }

    const { patientId, message } = validationResult.data

    const followUp = await deps.followUpService.requestFollowUp({
      doctorId: user.id,
      patientId,
      message,
    })

    return NextResponse.json(
      { success: true, data: followUp },
      { status: 201 }
    )
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

export async function handleGetFollowUps(deps: Dependencies): Promise<NextResponse> {
  try {
    const session = await deps.getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user as User & { role?: string }

    let followUps: FollowUp[]

    if (user.role === 'doctor') {
      followUps = await deps.followUpService.getActiveForDoctor(user.id)
    } else {
      followUps = await deps.followUpService.getPendingForPatient(user.id)
    }

    return NextResponse.json({ success: true, data: followUps })
  } catch {
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

export async function POST(request: NextRequest) {
  const body = await request.json()
  return handleCreateFollowUp(body, defaultDependencies)
}

export async function GET() {
  return handleGetFollowUps(defaultDependencies)
}
