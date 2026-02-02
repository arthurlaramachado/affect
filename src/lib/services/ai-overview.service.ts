import { z } from 'zod'

// ============================================
// Types and Interfaces
// ============================================

export class AIOverviewServiceError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message)
    this.name = 'AIOverviewServiceError'
  }
}

export interface AIOverviewInput {
  patient: {
    id: string
    name: string
    patientSince: Date
  }
  checkIns: Array<{
    date: Date
    moodScore: number
    riskFlag: boolean
    clinicalSummary: string
    biomarkers: {
      speech_latency: string
      affect_type: string
      eye_contact: string
    }
    riskFlags: {
      suicidality_indicated: boolean
      self_harm_indicated: boolean
      severe_distress: boolean
    }
    mse?: object
  }>
  insights: {
    moodTrend: 'improving' | 'stable' | 'declining'
    averageMood: number
    complianceRate: number
  }
}

export interface AIOverview {
  longitudinalAnalysis: string
  keyPatterns: string[]
  clinicalConcerns: string[]
  recommendations: string[]
  overallAssessment: string
  generatedAt: Date
}

// ============================================
// AI Client Interface (for dependency injection)
// ============================================

export interface AIClientResponse {
  text: string
}

export interface AIClient {
  generateContent(params: { model: string; contents: string }): Promise<AIClientResponse>
}

// ============================================
// Zod Schema for Response Validation
// ============================================

const aiOverviewResponseSchema = z.object({
  longitudinalAnalysis: z.string().min(1),
  keyPatterns: z.array(z.string()),
  clinicalConcerns: z.array(z.string()),
  recommendations: z.array(z.string()),
  overallAssessment: z.string().min(1),
})

// Export for testing
export { aiOverviewResponseSchema }

// ============================================
// Constants
// ============================================

const DEFAULT_MODEL = 'gemini-2.0-flash'

function getModelName(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL
}

// ============================================
// Prompt Generation (exported for testing)
// ============================================

export function generatePrompt(input: AIOverviewInput): string {
  const { patient, checkIns, insights } = input

  const patientSinceFormatted = patient.patientSince.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  const checkInsData = checkIns
    .map((checkIn, index) => {
      const dateFormatted = checkIn.date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })

      let entry = `
Check-in #${index + 1} (${dateFormatted}):
- Mood Score: ${checkIn.moodScore}/10
- Risk Flag: ${checkIn.riskFlag ? 'YES' : 'No'}
- Clinical Summary: ${checkIn.clinicalSummary}
- Biomarkers:
  - Speech Latency: ${checkIn.biomarkers.speech_latency}
  - Affect Type: ${checkIn.biomarkers.affect_type}
  - Eye Contact: ${checkIn.biomarkers.eye_contact}
- Risk Indicators:
  - suicidality_indicated: ${checkIn.riskFlags.suicidality_indicated}
  - self_harm_indicated: ${checkIn.riskFlags.self_harm_indicated}
  - severe_distress: ${checkIn.riskFlags.severe_distress}`

      if (checkIn.mse) {
        entry += `
- MSE (Mental Status Examination): ${JSON.stringify(checkIn.mse, null, 2)}`
      }

      return entry
    })
    .join('\n')

  return `You are an expert Board-Certified Psychiatrist analyzing longitudinal patient data for a clinical report.

PATIENT INFORMATION:
- Name: ${patient.name}
- Patient Since: ${patientSinceFormatted}
- Total Check-ins: ${checkIns.length}

INSIGHTS SUMMARY:
- Mood Trend: ${insights.moodTrend}
- Average Mood: ${insights.averageMood.toFixed(1)}/10
- Compliance Rate: ${insights.complianceRate.toFixed(0)}%

CHECK-IN DATA:
${checkInsData || 'No check-ins available.'}

ANALYSIS TASK:
Based on the longitudinal data above, provide a comprehensive clinical overview. Analyze ALL check-ins to identify patterns, concerns, and recommendations.

OUTPUT: Return strictly valid JSON (no markdown code blocks) with this exact schema:
{
  "longitudinalAnalysis": "A 2-3 sentence analysis of the patient's mood trajectory over time, noting significant changes or stability.",
  "keyPatterns": ["Array of 2-5 key patterns identified across check-ins"],
  "clinicalConcerns": ["Array of clinical concerns based on the data, empty if none"],
  "recommendations": ["Array of 2-4 actionable clinical recommendations"],
  "overallAssessment": "A comprehensive 2-3 sentence summary of the patient's overall clinical status and prognosis."
}

Important considerations:
1. If there are risk flags (suicidality, self-harm, severe distress), highlight them prominently in clinicalConcerns
2. Consider the trend direction (improving/stable/declining) when making recommendations
3. Note any concerning biomarker patterns (e.g., consistently avoidant eye contact, flat affect)
4. If MSE data is available, incorporate relevant findings
5. If there is insufficient data (0-1 check-ins), acknowledge this limitation in your analysis`
}

// ============================================
// Response Parsing (exported for testing)
// ============================================

export function parseAIResponse(responseText: string): z.infer<typeof aiOverviewResponseSchema> {
  let jsonString = responseText.trim()

  // Handle markdown code block wrapping
  if (jsonString.startsWith('```')) {
    const lines = jsonString.split('\n')
    const startIndex = lines[0].startsWith('```') ? 1 : 0
    const endIndex = lines[lines.length - 1] === '```' ? lines.length - 1 : lines.length
    jsonString = lines.slice(startIndex, endIndex).join('\n')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    throw new AIOverviewServiceError(
      'Invalid AI response format: Failed to parse JSON',
      'PARSE_FAILED'
    )
  }

  const result = aiOverviewResponseSchema.safeParse(parsed)

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(', ')
    throw new AIOverviewServiceError(
      `Invalid AI response format: ${errors}`,
      'VALIDATION_FAILED'
    )
  }

  return result.data
}

// ============================================
// Default AI Client Factory
// ============================================

function createDefaultAIClient(): AIClient {
  const apiKey = process.env.GOOGLE_API_KEY

  if (!apiKey) {
    throw new AIOverviewServiceError(
      'GOOGLE_API_KEY not configured',
      'API_KEY_MISSING'
    )
  }

  // Dynamic import to match the pattern in analyze/route.ts
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GoogleGenAI } = require('@google/genai')

  const ai = new GoogleGenAI({ apiKey })

  return {
    generateContent: async (params) => {
      const response = await ai.models.generateContent(params)
      return { text: response.text }
    },
  }
}

// ============================================
// Service Class
// ============================================

export class AIOverviewService {
  private aiClient: AIClient | null

  constructor(aiClient?: AIClient) {
    this.aiClient = aiClient || null
  }

  private getClient(): AIClient {
    if (this.aiClient) {
      return this.aiClient
    }
    return createDefaultAIClient()
  }

  async generateOverview(input: AIOverviewInput): Promise<AIOverview> {
    try {
      const client = this.getClient()
      const prompt = generatePrompt(input)

      const response = await client.generateContent({
        model: getModelName(),
        contents: prompt,
      })

      const responseText = response.text
      const parsedResponse = parseAIResponse(responseText)

      return {
        ...parsedResponse,
        generatedAt: new Date(),
      }
    } catch (error) {
      if (error instanceof AIOverviewServiceError) {
        throw error
      }

      throw new AIOverviewServiceError(
        `Failed to generate AI overview: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'GENERATION_FAILED'
      )
    }
  }
}
