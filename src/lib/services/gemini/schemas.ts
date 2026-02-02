import { z } from 'zod'

// Legacy biomarker schemas (kept for backward compatibility)
export const speechLatencySchema = z.enum(['normal', 'high', 'low'])
export const affectTypeSchema = z.enum(['full_range', 'flat', 'blunted', 'labile'])
export const eyeContactSchema = z.enum(['normal', 'avoidant'])

// ============================================
// Enhanced MSE (Mental Status Examination) Schemas
// ============================================

// MSE Appearance
export const mseGroomingSchema = z.enum(['well_groomed', 'disheveled', 'unkempt', 'bizarre'])
export const mseDressSchema = z.enum(['appropriate', 'inappropriate', 'disheveled', 'bizarre'])
export const mseHygieneSchema = z.enum(['good', 'fair', 'poor'])
export const msePostureSchema = z.enum(['relaxed', 'tense', 'slumped', 'rigid'])

export const mseAppearanceSchema = z.object({
  grooming: mseGroomingSchema,
  dress: mseDressSchema,
  hygiene: mseHygieneSchema,
  posture: msePostureSchema,
})

// MSE Behavior
export const msePsychomotorSchema = z.enum(['normal', 'retarded', 'agitated', 'catatonic'])
export const mseBehaviorEyeContactSchema = z.enum(['appropriate', 'avoidant', 'intense', 'absent'])
export const mseCooperationSchema = z.enum(['cooperative', 'guarded', 'hostile', 'uncooperative'])
export const mseMovementsSchema = z.enum(['normal', 'restless', 'tremor', 'tics', 'stereotyped'])

export const mseBehaviorSchema = z.object({
  psychomotor: msePsychomotorSchema,
  eye_contact: mseBehaviorEyeContactSchema,
  cooperation: mseCooperationSchema,
  movements: mseMovementsSchema,
})

// MSE Speech
export const mseSpeechRateSchema = z.enum(['normal', 'slow', 'rapid', 'pressured'])
export const mseSpeechVolumeSchema = z.enum(['normal', 'soft', 'loud', 'whispered'])
export const mseSpeechToneSchema = z.enum(['normal', 'monotone', 'tremulous', 'angry'])
export const mseSpeechLatencySchema = z.enum(['normal', 'increased', 'decreased'])
export const mseSpeechSpontaneitySchema = z.enum(['spontaneous', 'only_answers', 'mute'])

export const mseSpeechSchema = z.object({
  rate: mseSpeechRateSchema,
  volume: mseSpeechVolumeSchema,
  tone: mseSpeechToneSchema,
  latency: mseSpeechLatencySchema,
  spontaneity: mseSpeechSpontaneitySchema,
})

// MSE Mood and Affect
export const mseReportedMoodSchema = z.enum(['euthymic', 'depressed', 'anxious', 'irritable', 'euphoric', 'angry'])
export const mseObservedAffectSchema = z.enum(['full_range', 'flat', 'blunted', 'labile', 'anxious', 'irritable'])
export const mseAffectRangeSchema = z.enum(['full', 'restricted', 'flat'])
export const mseCongruenceSchema = z.enum(['congruent', 'incongruent'])
export const mseLabilitySchema = z.enum(['stable', 'labile'])

export const mseMoodAffectSchema = z.object({
  reported_mood: mseReportedMoodSchema,
  observed_affect: mseObservedAffectSchema,
  affect_range: mseAffectRangeSchema,
  congruence: mseCongruenceSchema,
  lability: mseLabilitySchema,
})

// MSE Thought Process
export const mseOrganizationSchema = z.enum(['organized', 'disorganized', 'tangential', 'circumstantial'])
export const mseFlowSchema = z.enum(['goal_directed', 'loose_associations', 'flight_of_ideas', 'thought_blocking'])

export const mseThoughtProcessSchema = z.object({
  organization: mseOrganizationSchema,
  flow: mseFlowSchema,
})

// MSE Thought Content
export const msePreoccupationsSchema = z.enum(['none', 'health', 'guilt', 'religious', 'somatic', 'other'])

export const mseThoughtContentSchema = z.object({
  preoccupations: msePreoccupationsSchema,
  hopelessness_expressed: z.boolean(),
  worthlessness_expressed: z.boolean(),
})

// MSE Cognition
export const mseAlertnessSchema = z.enum(['alert', 'drowsy', 'lethargic', 'obtunded'])
export const mseAttentionSchema = z.enum(['intact', 'impaired', 'distractible'])
export const mseInsightSchema = z.enum(['good', 'fair', 'poor', 'absent'])
export const mseJudgmentSchema = z.enum(['good', 'fair', 'poor', 'impaired'])

export const mseCognitionSchema = z.object({
  alertness: mseAlertnessSchema,
  attention: mseAttentionSchema,
  estimated_insight: mseInsightSchema,
  estimated_judgment: mseJudgmentSchema,
})

// Complete MSE Schema
export const mseSchema = z.object({
  appearance: mseAppearanceSchema,
  behavior: mseBehaviorSchema,
  speech: mseSpeechSchema,
  mood_affect: mseMoodAffectSchema,
  thought_process: mseThoughtProcessSchema,
  thought_content: mseThoughtContentSchema,
  cognition: mseCognitionSchema,
})

export const riskFlagsSchema = z.object({
  suicidality_indicated: z.boolean(),
  self_harm_indicated: z.boolean(),
  severe_distress: z.boolean(),
})

export const biomarkersSchema = z.object({
  speech_latency: speechLatencySchema,
  affect_type: affectTypeSchema,
  eye_contact: eyeContactSchema,
})

export const geminiAnalysisSchema = z.object({
  mood_score: z.number().int().min(1).max(10),
  risk_flags: riskFlagsSchema,
  biomarkers: biomarkersSchema,
  clinical_summary: z.string().min(1).max(2000),
  mse: mseSchema.optional(),
})

export type GeminiAnalysisInput = z.input<typeof geminiAnalysisSchema>
export type GeminiAnalysis = z.output<typeof geminiAnalysisSchema>

export type SpeechLatency = z.infer<typeof speechLatencySchema>
export type AffectType = z.infer<typeof affectTypeSchema>
export type EyeContact = z.infer<typeof eyeContactSchema>
export type RiskFlags = z.infer<typeof riskFlagsSchema>
export type Biomarkers = z.infer<typeof biomarkersSchema>

// MSE Types
export type MSEAppearance = z.infer<typeof mseAppearanceSchema>
export type MSEBehavior = z.infer<typeof mseBehaviorSchema>
export type MSESpeech = z.infer<typeof mseSpeechSchema>
export type MSEMoodAffect = z.infer<typeof mseMoodAffectSchema>
export type MSEThoughtProcess = z.infer<typeof mseThoughtProcessSchema>
export type MSEThoughtContent = z.infer<typeof mseThoughtContentSchema>
export type MSECognition = z.infer<typeof mseCognitionSchema>
export type MSE = z.infer<typeof mseSchema>

type ParseResult =
  | { success: true; data: GeminiAnalysis }
  | { success: false; error: string }

export function parseGeminiResponse(response: string): ParseResult {
  let jsonString = response.trim()

  // Handle markdown code block wrapping
  if (jsonString.startsWith('```')) {
    const lines = jsonString.split('\n')
    // Remove first line (```json or ```) and last line (```)
    const startIndex = lines[0].startsWith('```') ? 1 : 0
    const endIndex = lines[lines.length - 1] === '```' ? lines.length - 1 : lines.length
    jsonString = lines.slice(startIndex, endIndex).join('\n')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch (e) {
    return {
      success: false,
      error: `Failed to parse JSON: ${e instanceof Error ? e.message : 'Unknown error'}`,
    }
  }

  const result = geminiAnalysisSchema.safeParse(parsed)

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ')
    return {
      success: false,
      error: `Invalid analysis format: ${errors}`,
    }
  }

  return {
    success: true,
    data: result.data,
  }
}

export const PSYCHIATRIST_SYSTEM_PROMPT = `You are an expert Board-Certified Psychiatrist conducting a comprehensive remote Mental Status Examination (MSE). Your goal is to analyze the patient's video input to identify "Digital Biomarkers" of mental health through systematic observation.

COMPREHENSIVE MSE ANALYSIS PROTOCOL:

1. APPEARANCE Assessment:
   - Grooming: well_groomed | disheveled | unkempt | bizarre
   - Dress: appropriate | inappropriate | disheveled | bizarre
   - Hygiene: good | fair | poor
   - Posture: relaxed | tense | slumped | rigid

2. BEHAVIOR Assessment:
   - Psychomotor: normal | retarded (slowing) | agitated (restless) | catatonic
   - Eye Contact: appropriate | avoidant | intense | absent
   - Cooperation: cooperative | guarded | hostile | uncooperative
   - Movements: normal | restless | tremor | tics | stereotyped

3. SPEECH Assessment:
   - Rate: normal | slow | rapid | pressured
   - Volume: normal | soft | loud | whispered
   - Tone: normal | monotone | tremulous | angry
   - Latency: normal | increased (long pauses) | decreased
   - Spontaneity: spontaneous | only_answers | mute

4. MOOD & AFFECT Assessment:
   - Reported Mood (patient's stated): euthymic | depressed | anxious | irritable | euphoric | angry
   - Observed Affect: full_range | flat | blunted | labile | anxious | irritable
   - Affect Range: full | restricted | flat
   - Congruence (mood matches affect): congruent | incongruent
   - Lability: stable | labile

5. THOUGHT PROCESS Assessment:
   - Organization: organized | disorganized | tangential | circumstantial
   - Flow: goal_directed | loose_associations | flight_of_ideas | thought_blocking

6. THOUGHT CONTENT Assessment:
   - Preoccupations: none | health | guilt | religious | somatic | other
   - Hopelessness Expressed: boolean (any statements suggesting hopelessness)
   - Worthlessness Expressed: boolean (any statements suggesting worthlessness)

7. COGNITION Assessment:
   - Alertness: alert | drowsy | lethargic | obtunded
   - Attention: intact | impaired | distractible
   - Estimated Insight: good | fair | poor | absent
   - Estimated Judgment: good | fair | poor | impaired

RISK FLAG ASSESSMENT:
- Suicidality: Any mention of death wishes, suicidal ideation, or self-harm intent
- Self-Harm: Any evidence of self-injurious behavior or intent
- Severe Distress: Acute emotional crisis requiring immediate attention

OUTPUT: Return strictly valid JSON (no markdown) with this schema:
{
  "mood_score": number (1-10 integer, 1=Severely Depressed, 5=Euthymic, 10=Manic),
  "risk_flags": {
    "suicidality_indicated": boolean,
    "self_harm_indicated": boolean,
    "severe_distress": boolean
  },
  "biomarkers": {
    "speech_latency": "normal" | "high" | "low",
    "affect_type": "full_range" | "flat" | "blunted" | "labile",
    "eye_contact": "normal" | "avoidant"
  },
  "clinical_summary": "A concise 2-3 sentence medical abstract describing the patient's presentation.",
  "mse": {
    "appearance": {
      "grooming": "well_groomed" | "disheveled" | "unkempt" | "bizarre",
      "dress": "appropriate" | "inappropriate" | "disheveled" | "bizarre",
      "hygiene": "good" | "fair" | "poor",
      "posture": "relaxed" | "tense" | "slumped" | "rigid"
    },
    "behavior": {
      "psychomotor": "normal" | "retarded" | "agitated" | "catatonic",
      "eye_contact": "appropriate" | "avoidant" | "intense" | "absent",
      "cooperation": "cooperative" | "guarded" | "hostile" | "uncooperative",
      "movements": "normal" | "restless" | "tremor" | "tics" | "stereotyped"
    },
    "speech": {
      "rate": "normal" | "slow" | "rapid" | "pressured",
      "volume": "normal" | "soft" | "loud" | "whispered",
      "tone": "normal" | "monotone" | "tremulous" | "angry",
      "latency": "normal" | "increased" | "decreased",
      "spontaneity": "spontaneous" | "only_answers" | "mute"
    },
    "mood_affect": {
      "reported_mood": "euthymic" | "depressed" | "anxious" | "irritable" | "euphoric" | "angry",
      "observed_affect": "full_range" | "flat" | "blunted" | "labile" | "anxious" | "irritable",
      "affect_range": "full" | "restricted" | "flat",
      "congruence": "congruent" | "incongruent",
      "lability": "stable" | "labile"
    },
    "thought_process": {
      "organization": "organized" | "disorganized" | "tangential" | "circumstantial",
      "flow": "goal_directed" | "loose_associations" | "flight_of_ideas" | "thought_blocking"
    },
    "thought_content": {
      "preoccupations": "none" | "health" | "guilt" | "religious" | "somatic" | "other",
      "hopelessness_expressed": boolean,
      "worthlessness_expressed": boolean
    },
    "cognition": {
      "alertness": "alert" | "drowsy" | "lethargic" | "obtunded",
      "attention": "intact" | "impaired" | "distractible",
      "estimated_insight": "good" | "fair" | "poor" | "absent",
      "estimated_judgment": "good" | "fair" | "poor" | "impaired"
    }
  }
}`
