import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { DoctorService, DoctorServiceError } from '@/lib/services/doctor.service'
import { userRepository, dailyLogRepository } from '@/lib/db/repositories'
import type { User } from '@/lib/db/schema'

function createDoctorService(): DoctorService {
  return new DoctorService(userRepository, dailyLogRepository)
}

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id: patientId } = await params

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
        { success: false, error: 'Only doctors can access this resource' },
        { status: 403 }
      )
    }

    const service = createDoctorService()
    const detail = await service.getPatientDetail(user.id, patientId)

    return NextResponse.json({
      success: true,
      data: {
        patient: {
          ...detail.patient,
          createdAt: detail.patient.createdAt.toISOString(),
        },
        moodHistory: detail.moodHistory.map((entry) => ({
          ...entry,
          date: entry.date.toISOString(),
        })),
        riskLevel: detail.riskLevel,
        currentMoodScore: detail.currentMoodScore,
      },
    })
  } catch (error) {
    if (error instanceof DoctorServiceError) {
      const status = error.code === 'NOT_FOUND' ? 404 : 403
      return NextResponse.json(
        { success: false, error: error.message },
        { status }
      )
    }

    console.error('Error fetching patient detail:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
