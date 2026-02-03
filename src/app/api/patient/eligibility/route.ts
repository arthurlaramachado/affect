import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { checkInEligibilityService, type CheckInEligibility } from '@/lib/services/check-in-eligibility.service'
import type { User } from '@/lib/db/schema'

interface EligibilityResponse {
  success: boolean
  data?: CheckInEligibility
  error?: string
}

export async function GET(request: NextRequest): Promise<NextResponse<EligibilityResponse>> {
  try {
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user as User & { role?: string }

    if (user.role !== 'patient') {
      return NextResponse.json(
        { success: false, error: 'Only patients can check eligibility' },
        { status: 403 }
      )
    }

    const eligibility = await checkInEligibilityService.getEligibility(user.id)

    return NextResponse.json({
      success: true,
      data: eligibility,
    })
  } catch (error) {
    return NextResponse.json(
      { success: false, error: `Failed to check eligibility: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
