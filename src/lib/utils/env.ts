import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  GOOGLE_API_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().optional().default('http://localhost:3000'),
})

export type Env = z.infer<typeof envSchema>

function getEnv(): Env {
  const parsed = envSchema.safeParse(process.env)

  if (!parsed.success) {
    const missing = parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')
    throw new Error(`Missing or invalid environment variables: ${missing}`)
  }

  return parsed.data
}

export const env = getEnv()
