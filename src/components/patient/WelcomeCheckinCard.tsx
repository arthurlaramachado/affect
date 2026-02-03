import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { getGreetingMessage } from '@/lib/utils/greeting'
import type { CheckInEligibility } from '@/lib/services/check-in-eligibility.service'

interface WelcomeCheckinCardProps {
  userName: string
  eligibility: CheckInEligibility
}

function getEmoji(eligibility: CheckInEligibility): string {
  if (eligibility.canCheckIn) {
    return '\u{1F60A}' // 😊
  }
  if (eligibility.hasCheckedInToday) {
    return '✅'
  }
  return '⏳'
}

function getEmojiLabel(eligibility: CheckInEligibility): string {
  if (eligibility.canCheckIn) {
    return 'Smiling face'
  }
  if (eligibility.hasCheckedInToday) {
    return 'Check mark'
  }
  return 'Hourglass'
}

function getMessage(eligibility: CheckInEligibility): string {
  if (eligibility.canCheckIn) {
    return "Tell us how you're feeling today"
  }
  return eligibility.message || ''
}

export function WelcomeCheckinCard({ userName, eligibility }: WelcomeCheckinCardProps) {
  const greeting = getGreetingMessage(userName)
  const emoji = getEmoji(eligibility)
  const emojiLabel = getEmojiLabel(eligibility)
  const message = getMessage(eligibility)

  return (
    <Card
      data-testid="welcome-checkin-card"
      className="text-center bg-gradient-to-br from-blue-50 to-amber-50 border-blue-100"
    >
      <CardContent className="py-10 px-8">
        <div className="flex flex-col items-center gap-6">
          {/* Emoji based on state */}
          <div
            data-testid="welcome-emoji"
            className="text-6xl"
            role="img"
            aria-label={emojiLabel}
          >
            {emoji}
          </div>

          {/* Time-based greeting */}
          <h2 className="text-2xl font-semibold text-gray-800">
            {greeting}
          </h2>

          {/* Message based on state */}
          <p className="text-lg text-gray-600 max-w-md">
            {message}
          </p>

          {/* CTA Button - only show when can check in */}
          {eligibility.canCheckIn && (
            <Link href="/patient/check-in" className="mt-4">
              <Button
                size="lg"
                className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-6 text-lg rounded-full shadow-md transition-all hover:shadow-lg"
              >
                Start Check-in
              </Button>
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
