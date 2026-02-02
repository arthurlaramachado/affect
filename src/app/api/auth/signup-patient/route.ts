import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { userRepository } from '@/lib/db/repositories'
import { invitationRepository } from '@/lib/db/repositories/invitation.repository'

const signupPatientSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  invitationToken: z.string().min(1, 'Invitation token is required'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validationResult = signupPatientSchema.safeParse(body)

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

    const { email, password, name, invitationToken } = validationResult.data

    // 1. Validate invitation
    const invitation = await invitationRepository.findByToken(invitationToken)

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: 'Invalid invitation token' },
        { status: 400 }
      )
    }

    if (invitation.status !== 'pending') {
      return NextResponse.json(
        { success: false, error: 'Invitation has already been used or expired' },
        { status: 400 }
      )
    }

    if (new Date() > invitation.expiresAt) {
      return NextResponse.json(
        { success: false, error: 'Invitation has expired' },
        { status: 400 }
      )
    }

    if (invitation.email.toLowerCase() !== email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'Email does not match invitation' },
        { status: 400 }
      )
    }

    // 2. Check if user already exists
    const existingUser = await userRepository.findByEmail(email)
    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User with this email already exists' },
        { status: 400 }
      )
    }

    // 3. Create user via Better Auth API
    const signupResponse = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name,
        role: 'patient',
      },
    })

    if (!signupResponse.user) {
      return NextResponse.json(
        { success: false, error: 'Failed to create user account' },
        { status: 500 }
      )
    }

    // 4. Link patient to doctor
    await userRepository.updateDoctorId(signupResponse.user.id, invitation.doctorId)

    // 5. Mark invitation as accepted
    await invitationRepository.markAsAccepted(invitationToken)

    // Return success - the client will need to sign in separately
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: signupResponse.user.id,
          email: signupResponse.user.email,
          name: signupResponse.user.name,
          role: 'patient',
          doctorId: invitation.doctorId,
        },
        // Client should use these to sign in
        credentials: {
          email,
          requiresSignIn: true,
        },
      },
    })
  } catch (error) {
    console.error('Patient signup error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
