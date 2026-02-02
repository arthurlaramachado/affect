import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getGreetingMessage } from '@/lib/utils/greeting'

interface WelcomeCheckinCardProps {
  userName: string
}

export function WelcomeCheckinCard({ userName }: WelcomeCheckinCardProps) {
  const greeting = getGreetingMessage(userName)

  return (
    <Card
      data-testid="welcome-checkin-card"
      className="text-center bg-gradient-to-br from-blue-50 to-amber-50 border-blue-100"
    >
      <CardContent className="py-10 px-8">
        <div className="flex flex-col items-center gap-6">
          {/* Warm emoji */}
          <div
            data-testid="welcome-emoji"
            className="text-6xl"
            role="img"
            aria-label="Smiling face"
          >
            {'\u{1F60A}'}
          </div>

          {/* Time-based greeting */}
          <h2 className="text-2xl font-semibold text-gray-800">
            {greeting}
          </h2>

          {/* Main message */}
          <p className="text-lg text-gray-600 max-w-md">
            Tell us how you&apos;re feeling today
          </p>

          {/* CTA Button */}
          <Link href="/patient/check-in" className="mt-4">
            <Button
              size="lg"
              className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-6 text-lg rounded-full shadow-md transition-all hover:shadow-lg"
            >
              Start Check-in
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
