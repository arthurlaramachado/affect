import { eq, or, ilike } from 'drizzle-orm'
import { users, type User, type NewUser } from '../schema'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'

export interface UserRepository {
  findById(id: string): Promise<User | null>
  findByEmail(email: string): Promise<User | null>
  create(data: NewUser): Promise<User>
  update(id: string, data: Partial<NewUser>): Promise<User | null>
  delete(id: string): Promise<boolean>
  searchPatients(query: string, limit?: number): Promise<User[]>
  findPatientsByDoctorId(doctorId: string): Promise<User[]>
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

    async findPatientsByDoctorId(_doctorId: string): Promise<User[]> {
      // This will be implemented with a join on follow_ups table
      // For now, returns empty array - will be updated in Phase 3
      return []
    },
  }
}
