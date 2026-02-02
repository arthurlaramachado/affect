import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { FileHandler } from '@/lib/services/gemini/file-handler'
import { dailyLogRepository } from '@/lib/db/repositories'
import { parseGeminiResponse, type GeminiAnalysis } from '@/lib/services/gemini/schemas'
import type { User } from '@/lib/db/schema'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const ALLOWED_MIME_TYPES = ['video/mp4', 'video/webm', 'video/quicktime']
const DEFAULT_MODEL = 'gemini-2.0-flash'

function getModelName(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL
}

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

const SYSTEM_PROMPT = `You are an expert Board-Certified Psychiatrist conducting a remote Mental Status Examination (MSE). Your goal is to analyze the patient's video input to identify "Digital Biomarkers" of mental health.

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

async function analyzeVideoWithGemini(filePath: string): Promise<GeminiAnalysis> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY not configured')
  }

  // Import the new Google GenAI SDK
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GoogleGenAI, createUserContent, createPartFromUri } = require('@google/genai')

  const ai = new GoogleGenAI({ apiKey })

  // 1. Upload the video file
  const uploadResult = await ai.files.upload({
    file: filePath,
    config: { mimeType: 'video/mp4' },
  })

  // 2. Wait for file to be processed
  let file = uploadResult
  while (file.state === 'PROCESSING') {
    await new Promise(resolve => setTimeout(resolve, 1000))
    file = await ai.files.get({ name: file.name })
  }

  if (file.state === 'FAILED') {
    throw new Error('Video processing failed')
  }

  try {
    // 3. Generate content with the video
    const response = await ai.models.generateContent({
      model: getModelName(),
      contents: createUserContent([
        createPartFromUri(file.uri, file.mimeType),
        `${SYSTEM_PROMPT}\n\nAnalyze this patient video and provide your assessment.`,
      ]),
    })

    // 4. Parse the response
    const responseText = response.text
    const parsed = parseGeminiResponse(responseText)

    if (!parsed.success) {
      throw new Error(`Invalid analysis response: ${parsed.error}`)
    }

    return parsed.data
  } finally {
    // 5. Clean up - delete the uploaded file
    try {
      await ai.files.delete({ name: file.name })
    } catch (deleteError) {
      console.error('Failed to delete file from Gemini:', deleteError)
    }
  }
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

    const analysis = await fileHandler.withTempFile(videoFile, async (tempPath) => {
      return await analyzeVideoWithGemini(tempPath)
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

    return NextResponse.json(
      { success: false, error: `Analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    )
  }
}
