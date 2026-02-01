import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  pgEnum,
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'
import type { GeminiAnalysis } from '@/types/database'

export const userRoleEnum = pgEnum('user_role', ['doctor', 'patient'])

export const followUpStatusEnum = pgEnum('follow_up_status', [
  'pending',
  'accepted',
  'declined',
  'ended',
])

export const notificationTypeEnum = pgEnum('notification_type', [
  'follow_up_request',
  'follow_up_accepted',
  'follow_up_declined',
])

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: userRoleEnum('role').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const usersRelations = relations(users, ({ many }) => ({
  dailyLogs: many(dailyLogs),
  followUpsAsDoctor: many(followUps, { relationName: 'doctorFollowUps' }),
  followUpsAsPatient: many(followUps, { relationName: 'patientFollowUps' }),
  notifications: many(notifications),
}))

export const dailyLogs = pgTable('daily_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  moodScore: integer('mood_score').notNull(),
  riskFlag: boolean('risk_flag').default(false).notNull(),
  analysisJson: jsonb('analysis_json').$type<GeminiAnalysis>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const dailyLogsRelations = relations(dailyLogs, ({ one }) => ({
  user: one(users, {
    fields: [dailyLogs.userId],
    references: [users.id],
  }),
}))

export const followUps = pgTable('follow_ups', {
  id: uuid('id').defaultRandom().primaryKey(),
  doctorId: uuid('doctor_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  patientId: uuid('patient_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  status: followUpStatusEnum('status').default('pending').notNull(),
  message: text('message'),
  requestedAt: timestamp('requested_at').defaultNow().notNull(),
  respondedAt: timestamp('responded_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const followUpsRelations = relations(followUps, ({ one }) => ({
  doctor: one(users, {
    fields: [followUps.doctorId],
    references: [users.id],
    relationName: 'doctorFollowUps',
  }),
  patient: one(users, {
    fields: [followUps.patientId],
    references: [users.id],
    relationName: 'patientFollowUps',
  }),
}))

export const notifications = pgTable('notifications', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  type: notificationTypeEnum('type').notNull(),
  title: text('title').notNull(),
  message: text('message').notNull(),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type DailyLog = typeof dailyLogs.$inferSelect
export type NewDailyLog = typeof dailyLogs.$inferInsert
export type FollowUp = typeof followUps.$inferSelect
export type NewFollowUp = typeof followUps.$inferInsert
export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
