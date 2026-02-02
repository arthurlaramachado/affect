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
  mse?: {
    appearance: {
      grooming: 'well_groomed' | 'disheveled' | 'unkempt' | 'bizarre'
      dress: 'appropriate' | 'inappropriate' | 'disheveled' | 'bizarre'
      hygiene: 'good' | 'fair' | 'poor'
      posture: 'relaxed' | 'tense' | 'slumped' | 'rigid'
    }
    behavior: {
      psychomotor: 'normal' | 'retarded' | 'agitated' | 'catatonic'
      eye_contact: 'appropriate' | 'avoidant' | 'intense' | 'absent'
      cooperation: 'cooperative' | 'guarded' | 'hostile' | 'uncooperative'
      movements: 'normal' | 'restless' | 'tremor' | 'tics' | 'stereotyped'
    }
    speech: {
      rate: 'normal' | 'slow' | 'rapid' | 'pressured'
      volume: 'normal' | 'soft' | 'loud' | 'whispered'
      tone: 'normal' | 'monotone' | 'tremulous' | 'angry'
      latency: 'normal' | 'increased' | 'decreased'
      spontaneity: 'spontaneous' | 'only_answers' | 'mute'
    }
    mood_affect: {
      reported_mood: 'euthymic' | 'depressed' | 'anxious' | 'irritable' | 'euphoric' | 'angry'
      observed_affect: 'full_range' | 'flat' | 'blunted' | 'labile' | 'anxious' | 'irritable'
      affect_range: 'full' | 'restricted' | 'flat'
      congruence: 'congruent' | 'incongruent'
      lability: 'stable' | 'labile'
    }
    thought_process: {
      organization: 'organized' | 'disorganized' | 'tangential' | 'circumstantial'
      flow: 'goal_directed' | 'loose_associations' | 'flight_of_ideas' | 'thought_blocking'
    }
    thought_content: {
      preoccupations: 'none' | 'health' | 'guilt' | 'religious' | 'somatic' | 'other'
      hopelessness_expressed: boolean
      worthlessness_expressed: boolean
    }
    cognition: {
      alertness: 'alert' | 'drowsy' | 'lethargic' | 'obtunded'
      attention: 'intact' | 'impaired' | 'distractible'
      estimated_insight: 'good' | 'fair' | 'poor' | 'absent'
      estimated_judgment: 'good' | 'fair' | 'poor' | 'impaired'
    }
  }
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
