// Service exports with real dependencies wired up

import { FollowUpService } from './follow-up.service'
import { NotificationService } from './notification.service'
import {
  followUpRepository,
  notificationRepository,
  userRepository,
} from '@/lib/db/repositories'

// Create NotificationService singleton
export const notificationService = new NotificationService(notificationRepository)

// Create FollowUpService singleton with all dependencies
export const followUpService = new FollowUpService(
  followUpRepository,
  userRepository,
  notificationService
)

// Re-export types and classes for testing
export { FollowUpService, FollowUpServiceError } from './follow-up.service'
export { NotificationService, NotificationServiceError } from './notification.service'
export { InvitationService, InvitationError } from './invitation.service'
export { DoctorService, DoctorServiceError } from './doctor.service'
