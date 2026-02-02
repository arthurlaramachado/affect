/**
 * Returns a time-based greeting based on the current hour
 * - 5:00-11:59 -> "Good morning"
 * - 12:00-17:59 -> "Good afternoon"
 * - 18:00-4:59 -> "Good evening"
 */
export function getTimeBasedGreeting(): string {
  const hour = new Date().getHours()

  if (hour >= 5 && hour < 12) {
    return 'Good morning'
  }

  if (hour >= 12 && hour < 18) {
    return 'Good afternoon'
  }

  return 'Good evening'
}

/**
 * Returns a personalized greeting message with the user's name
 * @param name - The user's name
 * @returns A greeting message like "Good morning, John"
 */
export function getGreetingMessage(name: string): string {
  const greeting = getTimeBasedGreeting()
  const trimmedName = name.trim()

  if (!trimmedName) {
    return greeting
  }

  return `${greeting}, ${trimmedName}`
}
