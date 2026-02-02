import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession as defaultGetSession } from '@/lib/auth/session'
import { userRepository as defaultUserRepository } from '@/lib/db/repositories'
import type { User } from '@/lib/db/schema'
import type { UserRepository } from '@/lib/db/repositories'

const linkDoctorSchema = z.object({
  doctorId: z.string().uuid('Invalid doctor ID format'),
})

export type GetSessionFn = () => Promise<{
  user: { id: string; role?: string } | null
  session?: unknown
} | null>

interface Dependencies {
  userRepository: UserRepository
  getSession: GetSessionFn
}

const defaultDependencies: Dependencies = {
  userRepository: defaultUserRepository,
  getSession: defaultGetSession,
}

export interface LinkDoctorInput {
  doctorId?: string
}

export async function handleLinkDoctor(
  body: LinkDoctorInput,
  deps: Dependencies = defaultDependencies
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

    if (user.role !== 'patient') {
      return NextResponse.json(
        { success: false, error: 'Only patients can link to a doctor' },
        { status: 403 }
      )
    }

    const validationResult = linkDoctorSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { success: false, error: 'Doctor ID is required' },
        { status: 400 }
      )
    }

    const { doctorId } = validationResult.data

    const doctor = await deps.userRepository.findById(doctorId)

    if (!doctor) {
      return NextResponse.json(
        { success: false, error: 'Doctor not found' },
        { status: 404 }
      )
    }

    if (doctor.role !== 'doctor') {
      return NextResponse.json(
        { success: false, error: 'Target user is not a doctor' },
        { status: 400 }
      )
    }

    const updatedUser = await deps.userRepository.updateDoctorId(user.id, doctorId)

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        doctorId: updatedUser.doctorId,
      },
    })
  } catch {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  return handleLinkDoctor(body)
}
