import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { DoctorService, DoctorServiceError } from '@/lib/services/doctor.service'
import { userRepository, dailyLogRepository } from '@/lib/db/repositories'
import { PatientDetailView } from '@/components/doctor/PatientDetailView'
import { Button } from '@/components/ui/button'
import type { User } from '@/lib/db/schema'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function PatientDetailPage({ params }: PageProps) {
  const { id: patientId } = await params
  const session = await getSession()

  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as User & { role?: string }

  if (user.role !== 'doctor') {
    redirect('/')
  }

  const doctorService = new DoctorService(userRepository, dailyLogRepository)

  try {
    const patientDetail = await doctorService.getPatientDetail(user.id, patientId)

    return (
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Link href="/doctor">
            <Button variant="outline" size="sm">
              &larr; Back to Dashboard
            </Button>
          </Link>
        </div>
        <PatientDetailView patientDetail={patientDetail} />
      </div>
    )
  } catch (error) {
    if (error instanceof DoctorServiceError) {
      if (error.code === 'NOT_FOUND' || error.code === 'UNAUTHORIZED') {
        notFound()
      }
    }
    throw error
  }
}
