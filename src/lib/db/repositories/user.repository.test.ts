import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createUserRepository } from './user.repository'
import type { User, NewUser } from '../schema'

const mockDb = {
  select: vi.fn().mockReturnThis(),
  from: vi.fn().mockReturnThis(),
  where: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  values: vi.fn().mockReturnThis(),
  returning: vi.fn(),
  update: vi.fn().mockReturnThis(),
  set: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
}

describe('UserRepository', () => {
  let userRepository: ReturnType<typeof createUserRepository>

  beforeEach(() => {
    vi.clearAllMocks()
    userRepository = createUserRepository(mockDb as never)
  })

  describe('findById', () => {
    it('should return user when found', async () => {
      const mockUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed',
        role: 'patient',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.limit.mockResolvedValueOnce([mockUser])

      const result = await userRepository.findById(mockUser.id)

      expect(result).toEqual(mockUser)
      expect(mockDb.select).toHaveBeenCalled()
    })

    it('should return null when user not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await userRepository.findById('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('findByEmail', () => {
    it('should return user when found', async () => {
      const mockUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        email: 'test@example.com',
        name: 'Test User',
        passwordHash: 'hashed',
        role: 'patient',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.limit.mockResolvedValueOnce([mockUser])

      const result = await userRepository.findByEmail('test@example.com')

      expect(result).toEqual(mockUser)
    })

    it('should return null when email not found', async () => {
      mockDb.limit.mockResolvedValueOnce([])

      const result = await userRepository.findByEmail('notfound@example.com')

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a new user and return it', async () => {
      const newUser: NewUser = {
        email: 'new@example.com',
        name: 'New User',
        passwordHash: 'hashed',
        role: 'doctor',
      }

      const createdUser: User = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        ...newUser,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.returning.mockResolvedValueOnce([createdUser])

      const result = await userRepository.create(newUser)

      expect(result).toEqual(createdUser)
      expect(mockDb.insert).toHaveBeenCalled()
      expect(mockDb.values).toHaveBeenCalledWith(newUser)
    })
  })

  describe('update', () => {
    it('should update user and return updated user', async () => {
      const userId = '123e4567-e89b-12d3-a456-426614174000'
      const updates = { name: 'Updated Name' }

      const updatedUser: User = {
        id: userId,
        email: 'test@example.com',
        name: 'Updated Name',
        passwordHash: 'hashed',
        role: 'patient',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      mockDb.returning.mockResolvedValueOnce([updatedUser])

      const result = await userRepository.update(userId, updates)

      expect(result).toEqual(updatedUser)
      expect(mockDb.update).toHaveBeenCalled()
    })

    it('should return null when user not found', async () => {
      mockDb.returning.mockResolvedValueOnce([])

      const result = await userRepository.update('non-existent', { name: 'New' })

      expect(result).toBeNull()
    })
  })

  describe('delete', () => {
    it('should delete user and return true', async () => {
      mockDb.returning.mockResolvedValueOnce([{ id: 'some-id' }])

      const result = await userRepository.delete('some-id')

      expect(result).toBe(true)
      expect(mockDb.delete).toHaveBeenCalled()
    })

    it('should return false when user not found', async () => {
      mockDb.returning.mockResolvedValueOnce([])

      const result = await userRepository.delete('non-existent')

      expect(result).toBe(false)
    })
  })

  describe('searchPatients', () => {
    it('should search patients by email', async () => {
      const patients: User[] = [
        {
          id: '123',
          email: 'patient@example.com',
          name: 'Patient One',
          passwordHash: 'hashed',
          role: 'patient',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockDb.limit.mockResolvedValueOnce(patients)

      const result = await userRepository.searchPatients('patient@example.com')

      expect(result).toEqual(patients)
    })

    it('should search patients by partial name', async () => {
      const patients: User[] = [
        {
          id: '123',
          email: 'john@example.com',
          name: 'John Doe',
          passwordHash: 'hashed',
          role: 'patient',
          emailVerified: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]

      mockDb.limit.mockResolvedValueOnce(patients)

      const result = await userRepository.searchPatients('John')

      expect(result).toEqual(patients)
    })
  })
})
