import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { userRepository } from '@/lib/db/repositories'
import type { User } from '@/lib/db/schema'

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
        { success: false, error: 'Only doctors can search for patients' },
        { status: 403 }
      )
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('q')

    if (!query || query.trim().length < 2) {
      return NextResponse.json({
        success: true,
        data: [],
      })
    }

    const patients = await userRepository.searchPatients(query.trim(), 10)

    return NextResponse.json({
      success: true,
      data: patients.map((p) => ({
        id: p.id,
        name: p.name,
        email: p.email,
      })),
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
