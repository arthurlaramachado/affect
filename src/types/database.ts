export type UserRole = 'doctor' | 'patient'

export type FollowUpStatus = 'pending' | 'accepted' | 'declined' | 'ended'

export type NotificationType =
  | 'follow_up_request'
  | 'follow_up_accepted'
  | 'follow_up_declined'

export type InvitationStatus = 'pending' | 'accepted' | 'expired'

export interface GeminiAnalysis {
  mood_score: number
  risk_flags: {
    suicidality_indicated: boolean
    self_harm_indicated: boolean
    severe_distress: boolean
  }
  biomarkers: {
    speech_latency: 'normal' | 'high' | 'low'
    affect_type: 'full_range' | 'flat' | 'blunted' | 'labile'
    eye_contact: 'normal' | 'avoidant'
  }
  clinical_summary: string
}

export type RiskLevel = 'stable' | 'drift' | 'alert'

export function calculateRiskLevel(
  moodScore: number,
  riskFlag: boolean
): RiskLevel {
  if (riskFlag || moodScore < 3) {
    return 'alert'
  }
  if (moodScore < 5) {
    return 'drift'
  }
  return 'stable'
}
