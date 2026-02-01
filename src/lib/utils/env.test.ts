import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { z } from 'zod'

describe('env validation', () => {
  const originalEnv = process.env

  beforeEach(() => {
    vi.resetModules()
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = originalEnv
  })

  it('should validate correct environment variables', async () => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db'
    process.env.BETTER_AUTH_SECRET = 'a-super-secret-key-that-is-at-least-32-chars'
    process.env.BETTER_AUTH_URL = 'http://localhost:3000'
    process.env.GOOGLE_API_KEY = 'test-api-key'
    process.env.RESEND_API_KEY = 're_test-key'

    const envSchema = z.object({
      DATABASE_URL: z.string().url(),
      BETTER_AUTH_SECRET: z.string().min(32),
      BETTER_AUTH_URL: z.string().url(),
      GOOGLE_API_KEY: z.string().min(1),
      RESEND_API_KEY: z.string().min(1),
      NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
    })

    const parsed = envSchema.safeParse(process.env)
    expect(parsed.success).toBe(true)
  })

  it('should reject invalid DATABASE_URL', () => {
    const envSchema = z.object({
      DATABASE_URL: z.string().url(),
    })

    const parsed = envSchema.safeParse({ DATABASE_URL: 'not-a-url' })
    expect(parsed.success).toBe(false)
  })

  it('should reject short BETTER_AUTH_SECRET', () => {
    const envSchema = z.object({
      BETTER_AUTH_SECRET: z.string().min(32),
    })

    const parsed = envSchema.safeParse({ BETTER_AUTH_SECRET: 'short' })
    expect(parsed.success).toBe(false)
  })

  it('should use default value for NEXT_PUBLIC_APP_URL', () => {
    const envSchema = z.object({
      NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
    })

    const parsed = envSchema.parse({})
    expect(parsed.NEXT_PUBLIC_APP_URL).toBe('http://localhost:3000')
  })
})
