import { eq, and, desc } from 'drizzle-orm'
import { followUps, type FollowUp, type NewFollowUp } from '../schema'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { FollowUpStatus } from '@/types/database'

export interface FollowUpRepository {
  findById(id: string): Promise<FollowUp | null>
  findByDoctorAndPatient(doctorId: string, patientId: string): Promise<FollowUp | null>
  findByDoctorId(doctorId: string): Promise<FollowUp[]>
  findByPatientId(patientId: string): Promise<FollowUp[]>
  findPendingByPatientId(patientId: string): Promise<FollowUp[]>
  getPendingCountByPatientId(patientId: string): Promise<number>
  create(data: NewFollowUp): Promise<FollowUp>
  updateStatus(id: string, status: FollowUpStatus): Promise<FollowUp | null>
  getAcceptedPatientsByDoctorId(doctorId: string): Promise<FollowUp[]>
}

export function createFollowUpRepository(db: NodePgDatabase): FollowUpRepository {
  return {
    async findById(id: string): Promise<FollowUp | null> {
      const result = await db
        .select()
        .from(followUps)
        .where(eq(followUps.id, id))
        .limit(1)

      return result[0] ?? null
    },

    async findByDoctorAndPatient(
      doctorId: string,
      patientId: string
    ): Promise<FollowUp | null> {
      const result = await db
        .select()
        .from(followUps)
        .where(
          and(
            eq(followUps.doctorId, doctorId),
            eq(followUps.patientId, patientId)
          )
        )
        .limit(1)

      return result[0] ?? null
    },

    async findByDoctorId(doctorId: string): Promise<FollowUp[]> {
      return db
        .select()
        .from(followUps)
        .where(eq(followUps.doctorId, doctorId))
        .orderBy(desc(followUps.createdAt))
    },

    async findByPatientId(patientId: string): Promise<FollowUp[]> {
      return db
        .select()
        .from(followUps)
        .where(eq(followUps.patientId, patientId))
        .orderBy(desc(followUps.createdAt))
    },

    async findPendingByPatientId(patientId: string): Promise<FollowUp[]> {
      return db
        .select()
        .from(followUps)
        .where(
          and(
            eq(followUps.patientId, patientId),
            eq(followUps.status, 'pending')
          )
        )
        .orderBy(desc(followUps.createdAt))
    },

    async getPendingCountByPatientId(patientId: string): Promise<number> {
      const result = await db
        .select()
        .from(followUps)
        .where(
          and(
            eq(followUps.patientId, patientId),
            eq(followUps.status, 'pending')
          )
        )

      return result.length
    },

    async create(data: NewFollowUp): Promise<FollowUp> {
      const result = await db.insert(followUps).values(data).returning()

      return result[0]
    },

    async updateStatus(id: string, status: FollowUpStatus): Promise<FollowUp | null> {
      const result = await db
        .update(followUps)
        .set({
          status,
          respondedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(followUps.id, id))
        .returning()

      return result[0] ?? null
    },

    async getAcceptedPatientsByDoctorId(doctorId: string): Promise<FollowUp[]> {
      return db
        .select()
        .from(followUps)
        .where(
          and(
            eq(followUps.doctorId, doctorId),
            eq(followUps.status, 'accepted')
          )
        )
        .orderBy(desc(followUps.createdAt))
    },
  }
}

// Import db here to avoid circular dependencies
import { db } from '@/lib/db'

export const followUpRepository = createFollowUpRepository(db as unknown as NodePgDatabase)
