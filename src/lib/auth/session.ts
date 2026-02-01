import { headers } from 'next/headers'
import { auth } from './index'
import { redirect } from 'next/navigation'
import type { UserRole } from '@/types/database'

export async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  return session
}

export async function requireAuth() {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  return session
}

export async function requireRole(role: UserRole) {
  const session = await requireAuth()

  const userRole = (session.user as { role?: string }).role

  if (userRole !== role) {
    if (userRole === 'doctor') {
      redirect('/doctor')
    } else {
      redirect('/patient')
    }
  }

  return session
}

export async function getCurrentUser() {
  const session = await getSession()
  return session?.user ?? null
}
