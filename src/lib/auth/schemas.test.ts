import { describe, it, expect } from 'vitest'
import { loginSchema, signupSchema, doctorSignupSchema } from './schemas'

describe('Auth Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const data = {
        email: 'test@example.com',
        password: 'password123',
      }

      const result = loginSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should reject invalid email', () => {
      const data = {
        email: 'invalid-email',
        password: 'password123',
      }

      const result = loginSchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should reject empty password', () => {
      const data = {
        email: 'test@example.com',
        password: '',
      }

      const result = loginSchema.safeParse(data)

      expect(result.success).toBe(false)
    })
  })

  describe('signupSchema', () => {
    it('should validate correct signup data', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass1!',
        confirmPassword: 'SecurePass1!',
      }

      const result = signupSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should reject short name', () => {
      const data = {
        name: 'J',
        email: 'john@example.com',
        password: 'SecurePass1!',
        confirmPassword: 'SecurePass1!',
      }

      const result = signupSchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should reject weak password - no uppercase', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'weakpass1!',
        confirmPassword: 'weakpass1!',
      }

      const result = signupSchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should reject weak password - no lowercase', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'WEAKPASS1!',
        confirmPassword: 'WEAKPASS1!',
      }

      const result = signupSchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should reject weak password - no number', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'WeakPass!',
        confirmPassword: 'WeakPass!',
      }

      const result = signupSchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should reject weak password - no special character', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'WeakPass1',
        confirmPassword: 'WeakPass1',
      }

      const result = signupSchema.safeParse(data)

      expect(result.success).toBe(false)
    })

    it('should reject mismatched passwords', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'SecurePass1!',
        confirmPassword: 'DifferentPass1!',
      }

      const result = signupSchema.safeParse(data)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('confirmPassword')
      }
    })

    it('should reject short password', () => {
      const data = {
        name: 'John Doe',
        email: 'john@example.com',
        password: 'Short1!',
        confirmPassword: 'Short1!',
      }

      const result = signupSchema.safeParse(data)

      expect(result.success).toBe(false)
    })
  })

  describe('doctorSignupSchema', () => {
    it('should validate correct doctor signup data', () => {
      const data = {
        name: 'Dr. Jane Smith',
        email: 'jane@clinic.com',
        password: 'SecurePass1!',
        confirmPassword: 'SecurePass1!',
        credentials: 'MD, Board Certified',
      }

      const result = doctorSignupSchema.safeParse(data)

      expect(result.success).toBe(true)
    })

    it('should allow empty credentials', () => {
      const data = {
        name: 'Dr. Jane Smith',
        email: 'jane@clinic.com',
        password: 'SecurePass1!',
        confirmPassword: 'SecurePass1!',
      }

      const result = doctorSignupSchema.safeParse(data)

      expect(result.success).toBe(true)
    })
  })
})
