import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { dailyLogRepository, followUpRepository } from '@/lib/db/repositories'
import { checkInEligibilityService } from '@/lib/services/check-in-eligibility.service'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { WelcomeCheckinCard } from '@/components/patient/WelcomeCheckinCard'
import { NotificationBell } from '@/components/patient/NotificationBell'
import { LogoutButton } from '@/components/LogoutButton'
import { CheckCircle2 } from 'lucide-react'
import type { User } from '@/lib/db/schema'

export default async function PatientDashboardPage() {
  const session = await getSession()

  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user as User & { role?: string }

  if (user.role !== 'patient') {
    redirect('/')
  }

  const [recentLogs, streakInfo, pendingCount, eligibility] = await Promise.all([
    dailyLogRepository.findByUserId(user.id, 7),
    dailyLogRepository.getStreak(user.id),
    followUpRepository.getPendingCountByPatientId(user.id),
    checkInEligibilityService.getEligibility(user.id),
  ])

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header with Notification Bell and Logout */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Welcome, {user.name}</h1>
        <div className="flex items-center gap-2">
          <NotificationBell initialCount={pendingCount} />
          <LogoutButton variant="outline" size="sm" />
        </div>
      </div>

      {/* Stats - Only Current Streak and Total Check-ins */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardDescription>Current Streak</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {streakInfo.currentStreak} days
            </CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-white">
          <CardHeader className="pb-2">
            <CardDescription>Total Check-ins</CardDescription>
            <CardTitle className="text-3xl text-blue-600">
              {streakInfo.totalCheckIns}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Welcome Check-in Card - Main Focal Point */}
      <div className="mb-8">
        <WelcomeCheckinCard userName={user.name} eligibility={eligibility} />
      </div>

      {/* Recent History - Simplified to show only dates */}
      {recentLogs.length > 0 && (
        <Card className="bg-white">
          <CardHeader>
            <CardTitle className="text-lg">Recent History</CardTitle>
            <CardDescription>Your last 7 check-ins</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-50 border border-green-200 text-green-700"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {new Date(log.createdAt).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
