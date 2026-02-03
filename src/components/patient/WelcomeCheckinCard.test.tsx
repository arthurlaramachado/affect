import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WelcomeCheckinCard } from './WelcomeCheckinCard'
import type { CheckInEligibility } from '@/lib/services/check-in-eligibility.service'

describe('WelcomeCheckinCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  const eligibleState: CheckInEligibility = {
    canCheckIn: true,
    hasActiveFollowUp: true,
    hasCheckedInToday: false,
    message: null,
  }

  const alreadyCheckedInState: CheckInEligibility = {
    canCheckIn: false,
    hasActiveFollowUp: true,
    hasCheckedInToday: true,
    message: 'You already checked in today. Come back tomorrow!',
  }

  const noFollowUpState: CheckInEligibility = {
    canCheckIn: false,
    hasActiveFollowUp: false,
    hasCheckedInToday: false,
    message: 'You need to be under follow-up with a doctor to check in.',
  }

  describe('when patient can check in', () => {
    it('renders the time-based greeting with user name', () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'))
      render(<WelcomeCheckinCard userName="John" eligibility={eligibleState} />)

      expect(screen.getByText('Good morning, John')).toBeInTheDocument()
    })

    it('renders the main message "Tell us how you\'re feeling today"', () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'))
      render(<WelcomeCheckinCard userName="John" eligibility={eligibleState} />)

      expect(screen.getByText("Tell us how you're feeling today")).toBeInTheDocument()
    })

    it('renders a warm emoji', () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'))
      render(<WelcomeCheckinCard userName="John" eligibility={eligibleState} />)

      const emojiElement = screen.getByTestId('welcome-emoji')
      expect(emojiElement).toBeInTheDocument()
    })

    it('renders a CTA button to start check-in', () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'))
      render(<WelcomeCheckinCard userName="John" eligibility={eligibleState} />)

      const button = screen.getByRole('link', { name: /start check-in/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('href', '/patient/check-in')
    })

    it('displays afternoon greeting in the afternoon', () => {
      vi.setSystemTime(new Date('2024-01-15T14:00:00'))
      render(<WelcomeCheckinCard userName="Maria" eligibility={eligibleState} />)

      expect(screen.getByText('Good afternoon, Maria')).toBeInTheDocument()
    })

    it('displays evening greeting in the evening', () => {
      vi.setSystemTime(new Date('2024-01-15T20:00:00'))
      render(<WelcomeCheckinCard userName="Carlos" eligibility={eligibleState} />)

      expect(screen.getByText('Good evening, Carlos')).toBeInTheDocument()
    })

    it('handles empty userName gracefully', () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'))
      render(<WelcomeCheckinCard userName="" eligibility={eligibleState} />)

      expect(screen.getByText('Good morning')).toBeInTheDocument()
    })

    it('has centered layout', () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'))
      render(<WelcomeCheckinCard userName="John" eligibility={eligibleState} />)

      const card = screen.getByTestId('welcome-checkin-card')
      expect(card).toHaveClass('text-center')
    })
  })

  describe('when patient has already checked in today', () => {
    it('renders a success message', () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'))
      render(<WelcomeCheckinCard userName="John" eligibility={alreadyCheckedInState} />)

      expect(screen.getByText('You already checked in today. Come back tomorrow!')).toBeInTheDocument()
    })

    it('renders a checkmark or success emoji', () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'))
      render(<WelcomeCheckinCard userName="John" eligibility={alreadyCheckedInState} />)

      const emojiElement = screen.getByTestId('welcome-emoji')
      expect(emojiElement).toHaveTextContent('✅')
    })

    it('does not render the check-in button', () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'))
      render(<WelcomeCheckinCard userName="John" eligibility={alreadyCheckedInState} />)

      expect(screen.queryByRole('link', { name: /start check-in/i })).not.toBeInTheDocument()
    })

    it('renders the greeting', () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'))
      render(<WelcomeCheckinCard userName="John" eligibility={alreadyCheckedInState} />)

      expect(screen.getByText('Good morning, John')).toBeInTheDocument()
    })
  })

  describe('when patient has no active follow-up', () => {
    it('renders a message about needing follow-up', () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'))
      render(<WelcomeCheckinCard userName="John" eligibility={noFollowUpState} />)

      expect(screen.getByText('You need to be under follow-up with a doctor to check in.')).toBeInTheDocument()
    })

    it('renders an info or waiting emoji', () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'))
      render(<WelcomeCheckinCard userName="John" eligibility={noFollowUpState} />)

      const emojiElement = screen.getByTestId('welcome-emoji')
      expect(emojiElement).toHaveTextContent('⏳')
    })

    it('does not render the check-in button', () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'))
      render(<WelcomeCheckinCard userName="John" eligibility={noFollowUpState} />)

      expect(screen.queryByRole('link', { name: /start check-in/i })).not.toBeInTheDocument()
    })

    it('renders the greeting', () => {
      vi.setSystemTime(new Date('2024-01-15T08:00:00'))
      render(<WelcomeCheckinCard userName="John" eligibility={noFollowUpState} />)

      expect(screen.getByText('Good morning, John')).toBeInTheDocument()
    })
  })
})
