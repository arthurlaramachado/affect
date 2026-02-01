import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { FileHandler } from '@/lib/services/gemini/file-handler'
import { GeminiService, GeminiServiceError } from '@/lib/services/gemini/gemini.service'
import { dailyLogRepository } from '@/lib/db/repositories'
import type { User } from '@/lib/db/schema'
import type { GeminiAnalysis } from '@/lib/services/gemini/schemas'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']

interface AnalyzeResult {
  success: boolean
  data?: {
    id: string
    moodScore: number
    riskFlag: boolean
    analysis: GeminiAnalysis
    createdAt: string
  }
  error?: string
}

// Create services - these would be properly initialized in production
function createGeminiService(): GeminiService {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY not configured')
  }

  // Import the Google AI SDK dynamically
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GoogleGenAI } = require('@google/genai')
  const genai = new GoogleGenAI({ apiKey })

  return new GeminiService({
    filesApi: {
      upload: async (params) => {
        const result = await genai.files.upload({
          file: new Blob([new Uint8Array(params.media.data)], { type: params.media.mimeType }),
          config: {
            mimeType: params.file.mimeType,
            displayName: params.file.displayName,
          },
        })
        return { file: { uri: result.uri, name: result.name } }
      },
      get: async (name) => {
        const result = await genai.files.get({ name })
        return { state: result.state }
      },
      delete: async (name) => {
        await genai.files.delete({ name })
      },
    },
    generateContent: async (params) => {
      const model = genai.getGenerativeModel({
        model: params.model,
        systemInstruction: `You are an expert Board-Certified Psychiatrist conducting a remote Mental Status Examination (MSE). Your goal is to analyze the patient's video input to identify "Digital Biomarkers" of mental health.

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
}`,
        generationConfig: {
          responseMimeType: params.config?.responseMimeType || 'application/json',
        },
      })

      const result = await model.generateContent(params.contents)
      return {
        response: {
          text: () => result.response.text(),
        },
      }
    },
  })
}

export async function POST(request: NextRequest): Promise<NextResponse<AnalyzeResult>> {
  try {
    // 1. Auth check - only patients can submit
    const session = await getSession()

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const user = session.user as User & { role?: string }

    if (user.role !== 'patient') {
      return NextResponse.json(
        { success: false, error: 'Only patients can submit check-ins' },
        { status: 403 }
      )
    }

    // 2. Parse form data
    const formData = await request.formData()
    const videoFile = formData.get('video') as File | null

    if (!videoFile) {
      return NextResponse.json(
        { success: false, error: 'No video file provided' },
        { status: 400 }
      )
    }

    // 3. Validate file
    if (videoFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 100MB limit' },
        { status: 400 }
      )
    }

    if (!ALLOWED_MIME_TYPES.includes(videoFile.type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid file type. Allowed: mp4, webm, mov' },
        { status: 400 }
      )
    }

    // 4. Process video with transient storage
    const fileHandler = new FileHandler()
    const geminiService = createGeminiService()

    const analysis = await fileHandler.withTempFile(videoFile, async (tempPath) => {
      return await geminiService.processVideo(tempPath)
    })

    // 5. Determine risk flag
    const riskFlag =
      analysis.risk_flags.suicidality_indicated ||
      analysis.risk_flags.self_harm_indicated ||
      analysis.risk_flags.severe_distress ||
      analysis.mood_score < 3

    // 6. Save to database
    const dailyLog = await dailyLogRepository.create({
      userId: user.id,
      moodScore: analysis.mood_score,
      riskFlag,
      analysisJson: analysis,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: dailyLog.id,
        moodScore: dailyLog.moodScore,
        riskFlag: dailyLog.riskFlag,
        analysis,
        createdAt: dailyLog.createdAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Video analysis error:', error)

    if (error instanceof GeminiServiceError) {
      return NextResponse.json(
        { success: false, error: `Analysis failed: ${error.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
