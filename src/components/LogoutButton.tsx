'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { signOut } from '@/lib/auth/client'
import { Button } from '@/components/ui/button'
import type { VariantProps } from 'class-variance-authority'
import { buttonVariants } from '@/components/ui/button'

interface LogoutButtonProps extends VariantProps<typeof buttonVariants> {
  className?: string
}

export function LogoutButton({
  className,
  variant = 'ghost',
  size = 'default',
}: LogoutButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  async function handleLogout() {
    if (isLoading) return

    setIsLoading(true)

    try {
      await signOut()
      router.push('/login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleLogout}
      disabled={isLoading}
    >
      {isLoading ? 'Logging out...' : 'Logout'}
    </Button>
  )
}
