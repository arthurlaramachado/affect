import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/signup/doctor',
  '/signup/patient',
  '/api/auth',
]

const doctorOnlyRoutes = ['/doctor']
const patientOnlyRoutes = ['/patient']

function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

function isDoctorRoute(pathname: string): boolean {
  return doctorOnlyRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

function isPatientRoute(pathname: string): boolean {
  return patientOnlyRoutes.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`)
  )
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('better-auth.session_token')

  if (!sessionCookie) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // For role-based access, we need to check the session
  // This is a simplified check - in production, you'd verify the session server-side
  // The actual role check happens in the page components
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
