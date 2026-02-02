import {
  pgTable,
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

export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'expired',
])

// Better Auth required tables
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  role: userRoleEnum('role').notNull().default('patient'),
  doctorId: text('doctor_id'),
  // Reminder settings for patients
  reminderEnabled: boolean('reminder_enabled').default(false).notNull(),
  reminderTime: text('reminder_time'), // HH:MM format (24h)
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const accounts = pgTable('accounts', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const verifications = pgTable('verifications', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})

export const usersRelations = relations(users, ({ one, many }) => ({
  doctor: one(users, {
    fields: [users.doctorId],
    references: [users.id],
    relationName: 'doctorPatients',
  }),
  patients: many(users, { relationName: 'doctorPatients' }),
  sessions: many(sessions),
  accounts: many(accounts),
  dailyLogs: many(dailyLogs),
  followUpsAsDoctor: many(followUps, { relationName: 'doctorFollowUps' }),
  followUpsAsPatient: many(followUps, { relationName: 'patientFollowUps' }),
  notifications: many(notifications),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const dailyLogs = pgTable('daily_logs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
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
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  doctorId: text('doctor_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  patientId: text('patient_id')
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
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id')
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

export const invitations = pgTable('invitations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  doctorId: text('doctor_id')
    .references(() => users.id, { onDelete: 'cascade' })
    .notNull(),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  status: invitationStatusEnum('status').default('pending').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
})

export const invitationsRelations = relations(invitations, ({ one }) => ({
  doctor: one(users, {
    fields: [invitations.doctorId],
    references: [users.id],
  }),
}))

export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert
export type Verification = typeof verifications.$inferSelect
export type NewVerification = typeof verifications.$inferInsert
export type DailyLog = typeof dailyLogs.$inferSelect
export type NewDailyLog = typeof dailyLogs.$inferInsert
export type FollowUp = typeof followUps.$inferSelect
export type NewFollowUp = typeof followUps.$inferInsert
export type Notification = typeof notifications.$inferSelect
export type NewNotification = typeof notifications.$inferInsert
export type Invitation = typeof invitations.$inferSelect
export type NewInvitation = typeof invitations.$inferInsert
