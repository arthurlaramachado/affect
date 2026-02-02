import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { VideoCheckIn } from '@/components/patient/VideoCheckIn'
import type { User } from '@/lib/db/schema'

export default async function PatientCheckInPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as User & { role?: string }

  if (user.role !== 'patient') {
    redirect('/')
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-2xl">
      <VideoCheckIn />
    </div>
  )
}
