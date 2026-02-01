import { randomBytes, scrypt, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scryptAsync = promisify(scrypt)

const SALT_LENGTH = 16
const KEY_LENGTH = 64

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH).toString('hex')
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  return `${salt}:${derivedKey.toString('hex')}`
}

export async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  const [salt, hash] = storedHash.split(':')
  if (!salt || !hash) {
    return false
  }

  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer
  const storedBuffer = Buffer.from(hash, 'hex')

  return timingSafeEqual(derivedKey, storedBuffer)
}

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function isStrongPassword(password: string): boolean {
  if (!password || typeof password !== 'string') {
    return false
  }

  // Minimum 8 characters
  if (password.length < 8) {
    return false
  }

  // Must contain at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    return false
  }

  // Must contain at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    return false
  }

  // Must contain at least one number
  if (!/[0-9]/.test(password)) {
    return false
  }

  // Must contain at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    return false
  }

  return true
}

export function generateToken(length = 32): string {
  return randomBytes(length).toString('hex')
}
