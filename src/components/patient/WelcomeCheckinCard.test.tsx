import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WelcomeCheckinCard } from './WelcomeCheckinCard'

describe('WelcomeCheckinCard', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the time-based greeting with user name', () => {
    vi.setSystemTime(new Date('2024-01-15T08:00:00'))
    render(<WelcomeCheckinCard userName="John" />)

    expect(screen.getByText('Good morning, John')).toBeInTheDocument()
  })

  it('renders the main message "Tell us how you\'re feeling today"', () => {
    vi.setSystemTime(new Date('2024-01-15T08:00:00'))
    render(<WelcomeCheckinCard userName="John" />)

    expect(screen.getByText("Tell us how you're feeling today")).toBeInTheDocument()
  })

  it('renders a warm emoji', () => {
    vi.setSystemTime(new Date('2024-01-15T08:00:00'))
    render(<WelcomeCheckinCard userName="John" />)

    // The card should have a warm/friendly visual element
    const emojiElement = screen.getByTestId('welcome-emoji')
    expect(emojiElement).toBeInTheDocument()
  })

  it('renders a CTA button to start check-in', () => {
    vi.setSystemTime(new Date('2024-01-15T08:00:00'))
    render(<WelcomeCheckinCard userName="John" />)

    const button = screen.getByRole('link', { name: /start check-in/i })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('href', '/patient/check-in')
  })

  it('displays afternoon greeting in the afternoon', () => {
    vi.setSystemTime(new Date('2024-01-15T14:00:00'))
    render(<WelcomeCheckinCard userName="Maria" />)

    expect(screen.getByText('Good afternoon, Maria')).toBeInTheDocument()
  })

  it('displays evening greeting in the evening', () => {
    vi.setSystemTime(new Date('2024-01-15T20:00:00'))
    render(<WelcomeCheckinCard userName="Carlos" />)

    expect(screen.getByText('Good evening, Carlos')).toBeInTheDocument()
  })

  it('handles empty userName gracefully', () => {
    vi.setSystemTime(new Date('2024-01-15T08:00:00'))
    render(<WelcomeCheckinCard userName="" />)

    expect(screen.getByText('Good morning')).toBeInTheDocument()
  })

  it('has centered layout', () => {
    vi.setSystemTime(new Date('2024-01-15T08:00:00'))
    render(<WelcomeCheckinCard userName="John" />)

    const card = screen.getByTestId('welcome-checkin-card')
    expect(card).toHaveClass('text-center')
  })
})
