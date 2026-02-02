import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { DoctorService } from '@/lib/services/doctor.service'
import { userRepository, dailyLogRepository } from '@/lib/db/repositories'
import type { User } from '@/lib/db/schema'

function createDoctorService(): DoctorService {
  return new DoctorService(userRepository, dailyLogRepository)
}

export async function GET() {
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
        { success: false, error: 'Only doctors can access this resource' },
        { status: 403 }
      )
    }

    const service = createDoctorService()
    const patients = await service.getPatients(user.id)

    return NextResponse.json({
      success: true,
      data: patients.map((p) => ({
        ...p,
        lastCheckIn: p.lastCheckIn?.toISOString() ?? null,
      })),
    })
  } catch (error) {
    console.error('Error fetching patients:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
