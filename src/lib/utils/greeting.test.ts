import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getTimeBasedGreeting, getGreetingMessage } from './greeting'

describe('getTimeBasedGreeting', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns "Good morning" between 5:00 and 11:59', () => {
    vi.setSystemTime(new Date('2024-01-15T08:00:00'))
    expect(getTimeBasedGreeting()).toBe('Good morning')

    vi.setSystemTime(new Date('2024-01-15T05:00:00'))
    expect(getTimeBasedGreeting()).toBe('Good morning')

    vi.setSystemTime(new Date('2024-01-15T11:59:59'))
    expect(getTimeBasedGreeting()).toBe('Good morning')
  })

  it('returns "Good afternoon" between 12:00 and 17:59', () => {
    vi.setSystemTime(new Date('2024-01-15T12:00:00'))
    expect(getTimeBasedGreeting()).toBe('Good afternoon')

    vi.setSystemTime(new Date('2024-01-15T15:30:00'))
    expect(getTimeBasedGreeting()).toBe('Good afternoon')

    vi.setSystemTime(new Date('2024-01-15T17:59:59'))
    expect(getTimeBasedGreeting()).toBe('Good afternoon')
  })

  it('returns "Good evening" between 18:00 and 4:59', () => {
    vi.setSystemTime(new Date('2024-01-15T18:00:00'))
    expect(getTimeBasedGreeting()).toBe('Good evening')

    vi.setSystemTime(new Date('2024-01-15T21:00:00'))
    expect(getTimeBasedGreeting()).toBe('Good evening')

    vi.setSystemTime(new Date('2024-01-15T23:59:59'))
    expect(getTimeBasedGreeting()).toBe('Good evening')

    vi.setSystemTime(new Date('2024-01-15T00:00:00'))
    expect(getTimeBasedGreeting()).toBe('Good evening')

    vi.setSystemTime(new Date('2024-01-15T04:59:59'))
    expect(getTimeBasedGreeting()).toBe('Good evening')
  })
})

describe('getGreetingMessage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns greeting with name in the morning', () => {
    vi.setSystemTime(new Date('2024-01-15T08:00:00'))
    expect(getGreetingMessage('John')).toBe('Good morning, John')
  })

  it('returns greeting with name in the afternoon', () => {
    vi.setSystemTime(new Date('2024-01-15T14:00:00'))
    expect(getGreetingMessage('Maria')).toBe('Good afternoon, Maria')
  })

  it('returns greeting with name in the evening', () => {
    vi.setSystemTime(new Date('2024-01-15T20:00:00'))
    expect(getGreetingMessage('Carlos')).toBe('Good evening, Carlos')
  })

  it('handles empty name gracefully', () => {
    vi.setSystemTime(new Date('2024-01-15T08:00:00'))
    expect(getGreetingMessage('')).toBe('Good morning')
  })

  it('trims whitespace from name', () => {
    vi.setSystemTime(new Date('2024-01-15T08:00:00'))
    expect(getGreetingMessage('  John  ')).toBe('Good morning, John')
  })
})
