import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth/session'
import { dailyLogRepository } from '@/lib/db/repositories'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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

  const recentLogs = await dailyLogRepository.findByUserId(user.id, 7)
  const latestLog = recentLogs[0]
  const streakInfo = await dailyLogRepository.getStreak(user.id)

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Welcome back, {user.name}</h1>
        <p className="text-gray-600">How are you feeling today?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Streak</CardDescription>
            <CardTitle className="text-3xl">{streakInfo.currentStreak} days</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Check-ins</CardDescription>
            <CardTitle className="text-3xl">{streakInfo.totalCheckIns}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Latest Mood</CardDescription>
            <CardTitle className="text-3xl">
              {latestLog ? `${latestLog.moodScore}/10` : '-'}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Daily Check-In</CardTitle>
          <CardDescription>
            Record a video to share how you're feeling today
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/patient/check-in">
            <Button size="lg" className="w-full">
              Start Check-In
            </Button>
          </Link>
        </CardContent>
      </Card>

      {recentLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent History</CardTitle>
            <CardDescription>Your last 7 check-ins</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    log.riskFlag ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div>
                    <p className="font-medium">
                      {new Date(log.createdAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    <p className="text-sm text-gray-600 line-clamp-1">
                      {log.analysisJson.clinical_summary}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold">{log.moodScore}/10</p>
                    {log.riskFlag && (
                      <span className="text-xs text-red-600">Risk Flag</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
