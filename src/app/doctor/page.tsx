import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { DoctorService } from '@/lib/services/doctor.service'
import { userRepository, dailyLogRepository } from '@/lib/db/repositories'
import { DoctorDashboard } from '@/components/doctor/DoctorDashboard'
import type { User } from '@/lib/db/schema'

export default async function DoctorPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as User & { role?: string }

  if (user.role !== 'doctor') {
    redirect('/')
  }

  const doctorService = new DoctorService(userRepository, dailyLogRepository)
  const patients = await doctorService.getPatients(user.id)

  return (
    <div className="container mx-auto py-8 px-4">
      <DoctorDashboard patients={patients} doctorName={user.name} />
    </div>
  )
}
