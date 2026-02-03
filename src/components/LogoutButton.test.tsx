import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { LogoutButton } from './LogoutButton'

// Mock the auth client
const mockSignOut = vi.fn()
vi.mock('@/lib/auth/client', () => ({
  signOut: () => mockSignOut(),
}))

// Mock next/navigation
const mockPush = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: vi.fn(),
    refresh: vi.fn(),
  }),
}))

describe('LogoutButton', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignOut.mockResolvedValue({ error: null })
  })

  it('renders with default text "Logout"', () => {
    render(<LogoutButton />)

    expect(screen.getByRole('button', { name: /logout/i })).toBeInTheDocument()
  })

  it('calls signOut when clicked', async () => {
    render(<LogoutButton />)

    const button = screen.getByRole('button', { name: /logout/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1)
    })
  })

  it('redirects to /login after successful logout', async () => {
    render(<LogoutButton />)

    const button = screen.getByRole('button', { name: /logout/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('shows loading state while logging out', async () => {
    // Make signOut take some time
    mockSignOut.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100)))

    render(<LogoutButton />)

    const button = screen.getByRole('button', { name: /logout/i })
    fireEvent.click(button)

    // Button should be disabled during loading
    expect(button).toBeDisabled()

    // Should show loading text
    expect(screen.getByText(/logging out/i)).toBeInTheDocument()

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith('/login')
    })
  })

  it('disables button while loading', async () => {
    mockSignOut.mockImplementation(() => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 100)))

    render(<LogoutButton />)

    const button = screen.getByRole('button', { name: /logout/i })
    fireEvent.click(button)

    expect(button).toBeDisabled()

    // Click again should not trigger another signOut
    fireEvent.click(button)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalledTimes(1)
    })
  })

  it('accepts custom className', () => {
    render(<LogoutButton className="custom-class" />)

    const button = screen.getByRole('button', { name: /logout/i })
    expect(button).toHaveClass('custom-class')
  })

  it('accepts custom variant prop', () => {
    render(<LogoutButton variant="destructive" />)

    const button = screen.getByRole('button', { name: /logout/i })
    expect(button).toHaveAttribute('data-variant', 'destructive')
  })

  it('accepts custom size prop', () => {
    render(<LogoutButton size="sm" />)

    const button = screen.getByRole('button', { name: /logout/i })
    expect(button).toHaveAttribute('data-size', 'sm')
  })
})
