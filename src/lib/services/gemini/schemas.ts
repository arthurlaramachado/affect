import { z } from 'zod'

export const speechLatencySchema = z.enum(['normal', 'high', 'low'])
export const affectTypeSchema = z.enum(['full_range', 'flat', 'blunted', 'labile'])
export const eyeContactSchema = z.enum(['normal', 'avoidant'])

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
})

export type GeminiAnalysisInput = z.input<typeof geminiAnalysisSchema>
export type GeminiAnalysis = z.output<typeof geminiAnalysisSchema>

export type SpeechLatency = z.infer<typeof speechLatencySchema>
export type AffectType = z.infer<typeof affectTypeSchema>
export type EyeContact = z.infer<typeof eyeContactSchema>
export type RiskFlags = z.infer<typeof riskFlagsSchema>
export type Biomarkers = z.infer<typeof biomarkersSchema>

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

export const PSYCHIATRIST_SYSTEM_PROMPT = `You are an expert Board-Certified Psychiatrist conducting a remote Mental Status Examination (MSE). Your goal is to analyze the patient's video input to identify "Digital Biomarkers" of mental health.

ANALYSIS PROTOCOL:
1. Psychomotor: Look for "Psychomotor Retardation" (slowing) or "Agitation" (fidgeting).
2. Speech: Analyze "Latency" (pauses before answering), "Prosody" (monotone vs normal), and "Rate".
3. Affect: Determine if affect is "Flat", "Blunted", "Labile", or "Incongruent".

OUTPUT: Return strictly valid JSON (no markdown) with this schema:
{
  "mood_score": number (1-10 integer, 1=Depressed, 5=Euthymic, 10=Manic),
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
  "clinical_summary": "A concise 2-sentence medical abstract describing the patient's presentation."
}`
