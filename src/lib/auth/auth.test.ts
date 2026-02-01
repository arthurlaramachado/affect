import { describe, it, expect, vi, beforeEach } from 'vitest'
import { hashPassword, verifyPassword, isValidEmail, isStrongPassword } from './utils'

describe('Auth Utilities', () => {
  describe('hashPassword', () => {
    it('should hash a password', async () => {
      const password = 'SecurePass123!'
      const hash = await hashPassword(password)

      expect(hash).toBeDefined()
      expect(hash).not.toBe(password)
      expect(hash.length).toBeGreaterThan(0)
    })

    it('should generate different hashes for same password', async () => {
      const password = 'SecurePass123!'
      const hash1 = await hashPassword(password)
      const hash2 = await hashPassword(password)

      expect(hash1).not.toBe(hash2)
    })
  })

  describe('verifyPassword', () => {
    it('should return true for matching password', async () => {
      const password = 'SecurePass123!'
      const hash = await hashPassword(password)

      const isValid = await verifyPassword(password, hash)

      expect(isValid).toBe(true)
    })

    it('should return false for non-matching password', async () => {
      const password = 'SecurePass123!'
      const wrongPassword = 'WrongPass456!'
      const hash = await hashPassword(password)

      const isValid = await verifyPassword(wrongPassword, hash)

      expect(isValid).toBe(false)
    })
  })

  describe('isValidEmail', () => {
    it('should return true for valid email', () => {
      expect(isValidEmail('test@example.com')).toBe(true)
      expect(isValidEmail('user.name@domain.co.uk')).toBe(true)
      expect(isValidEmail('user+tag@example.org')).toBe(true)
    })

    it('should return false for invalid email', () => {
      expect(isValidEmail('invalid')).toBe(false)
      expect(isValidEmail('invalid@')).toBe(false)
      expect(isValidEmail('@example.com')).toBe(false)
      expect(isValidEmail('test@.com')).toBe(false)
      expect(isValidEmail('')).toBe(false)
    })
  })

  describe('isStrongPassword', () => {
    it('should return true for strong password', () => {
      expect(isStrongPassword('SecurePass123!')).toBe(true)
      expect(isStrongPassword('MyP@ssw0rd')).toBe(true)
      expect(isStrongPassword('Complex1@Password')).toBe(true)
    })

    it('should return false for weak password', () => {
      expect(isStrongPassword('short')).toBe(false)
      expect(isStrongPassword('nouppercase1!')).toBe(false)
      expect(isStrongPassword('NOLOWERCASE1!')).toBe(false)
      expect(isStrongPassword('NoNumbers!')).toBe(false)
      expect(isStrongPassword('NoSpecial123')).toBe(false)
    })

    it('should require minimum 8 characters', () => {
      expect(isStrongPassword('Short1!')).toBe(false)
      expect(isStrongPassword('LongEnough1!')).toBe(true)
    })
  })
})
