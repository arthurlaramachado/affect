import { z } from 'zod'

const envSchema = z.object({
  // Database (Supabase PostgreSQL)
  DATABASE_URL: z.string().url(),
  // Authentication
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  // Google AI (Gemini)
  GOOGLE_API_KEY: z.string().min(1),
  // App (required in production so auth does not point to localhost)
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url()
    .optional()
    .default('http://localhost:3000')
    .refine(
      (val) => {
        const isProduction =
          process.env.VERCEL === '1' || process.env.NODE_ENV === 'production'
        if (!isProduction) return true
        return (
          typeof val === 'string' &&
          val.length > 0 &&
          val !== 'http://localhost:3000'
        )
      },
      {
        message:
          'NEXT_PUBLIC_APP_URL must be set to your production URL (e.g. https://your-app.vercel.app) when deploying to Vercel. See README for setup.',
      }
    ),
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

export function getEnvVar<K extends keyof Env>(key: K, fallback?: Env[K]): Env[K] {
  const value = process.env[key]
  if (value !== undefined) {
    return value as Env[K]
  }
  if (fallback !== undefined) {
    return fallback
  }
  throw new Error(`Missing environment variable: ${key}`)
}
