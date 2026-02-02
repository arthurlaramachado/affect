import { eq, or, ilike, and } from 'drizzle-orm'
import { users, type User, type NewUser } from '../schema'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import { db } from '@/lib/db'

export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(data: NewUser): Promise<User>
  update(id: string, data: Partial<NewUser>): Promise<User | null>
  delete(id: string): Promise<boolean>
  searchPatients(query: string, limit?: number): Promise<User[]>
  findPatientsByDoctorId(doctorId: string): Promise<User[]>
  updateDoctorId(userId: string, doctorId: string): Promise<User>
}

export function createUserRepository(db: NodePgDatabase): UserRepository {
  return {
    async findById(id: string): Promise<User | null> {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1)

      return result[0] ?? null
    },

    async findByEmail(email: string): Promise<User | null> {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase()))
        .limit(1)

      return result[0] ?? null
    },

    async create(data: NewUser): Promise<User> {
      const result = await db
        .insert(users)
        .values({
          ...data,
          email: data.email.toLowerCase(),
        })
        .returning()

      return result[0]
    },

    async update(id: string, data: Partial<NewUser>): Promise<User | null> {
      const updateData = {
        ...data,
        ...(data.email && { email: data.email.toLowerCase() }),
        updatedAt: new Date(),
      }

      const result = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning()

      return result[0] ?? null
    },

    async delete(id: string): Promise<boolean> {
      const result = await db
        .delete(users)
        .where(eq(users.id, id))
        .returning({ id: users.id })

      return result.length > 0
    },

    async searchPatients(query: string, limit = 10): Promise<User[]> {
      const searchQuery = query.toLowerCase()

      return db
        .select()
        .from(users)
        .where(
          or(
            eq(users.email, searchQuery),
            ilike(users.name, `%${searchQuery}%`)
          )
        )
        .limit(limit)
    },

    async findPatientsByDoctorId(doctorId: string): Promise<User[]> {
      return db
        .select()
        .from(users)
        .where(
          and(
            eq(users.doctorId, doctorId),
            eq(users.role, 'patient')
          )
        )
    },

    async updateDoctorId(userId: string, doctorId: string): Promise<User> {
      const result = await db
        .update(users)
        .set({
          doctorId,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning()

      if (!result[0]) {
        throw new Error('User not found')
      }

      return result[0]
    },
  }
}

export const userRepository = createUserRepository(db as unknown as NodePgDatabase)
