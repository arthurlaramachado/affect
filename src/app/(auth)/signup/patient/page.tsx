'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { signUp } from '@/lib/auth/client'
import { signupSchema, type SignupFormData } from '@/lib/auth/schemas'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

interface InvitationData {
  email: string
  expiresAt: string
  doctorId: string
}

export default function PatientSignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isValidating, setIsValidating] = useState(true)
  const [invitation, setInvitation] = useState<InvitationData | null>(null)

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
  })

  useEffect(() => {
    async function validateToken() {
      if (!token) {
        setError('No invitation token provided. Please use the link from your invitation email.')
        setIsValidating(false)
        return
      }

      try {
        const response = await fetch(`/api/invitations/${token}`)
        const data = await response.json()

        if (!response.ok || !data.success) {
          setError(data.error || 'Invalid or expired invitation')
          setIsValidating(false)
          return
        }

        setInvitation(data.data)
        setValue('email', data.data.email)
        setIsValidating(false)
      } catch (err) {
        setError('Failed to validate invitation. Please try again.')
        setIsValidating(false)
      }
    }

    validateToken()
  }, [token, setValue])

  const onSubmit = async (data: SignupFormData) => {
    if (!token || !invitation) {
      setError('Invalid invitation')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const acceptResponse = await fetch(`/api/invitations/${token}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          password: data.password,
        }),
      })

      const acceptData = await acceptResponse.json()

      if (!acceptResponse.ok || !acceptData.success) {
        setError(acceptData.error || 'Failed to accept invitation')
        return
      }

      const result = await signUp.email({
        email: data.email,
        password: data.password,
        name: data.name,
        role: 'patient',
      } as Parameters<typeof signUp.email>[0])

      if (result.error) {
        setError(result.error.message || 'Failed to create account')
        return
      }

      const linkResponse = await fetch('/api/patient/link-doctor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doctorId: acceptData.data.doctorId }),
      })

      if (!linkResponse.ok) {
        const linkData = await linkResponse.json()
        setError(linkData.error || 'Failed to link to doctor')
        return
      }

      router.push('/patient')
      router.refresh()
    } catch (err) {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (isValidating) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Validating invitation...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!invitation) {
    return (
      <Card>
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center text-red-600">
            Invalid Invitation
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-gray-600 mb-4">{error}</p>
          <p className="text-sm text-gray-500">
            If you believe this is an error, please contact your healthcare provider
            for a new invitation.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Link href="/login">
            <Button variant="outline">Go to Login</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Complete Registration
        </CardTitle>
        <CardDescription className="text-center">
          Create your account to start your mental health journey
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              {...register('name')}
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              {...register('email')}
              disabled
              className="bg-gray-50"
            />
            <p className="text-xs text-gray-500">
              Email is set from your invitation
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Create a strong password"
              {...register('password')}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
            <p className="text-xs text-gray-500">
              Must be at least 8 characters with uppercase, lowercase, number, and special character
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm your password"
              {...register('confirmPassword')}
              disabled={isLoading}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-red-600">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-600 hover:underline">
            Sign in
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
