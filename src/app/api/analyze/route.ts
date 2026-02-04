import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { FileHandler } from '@/lib/services/gemini/file-handler'
import { dailyLogRepository } from '@/lib/db/repositories'
import { parseGeminiResponse, type GeminiAnalysis } from '@/lib/services/gemini/schemas'
import { checkInEligibilityService } from '@/lib/services/check-in-eligibility.service'
import type { User } from '@/lib/db/schema'

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB
const DEFAULT_MODEL = 'gemini-2.0-flash'

// Normalize MIME type for Gemini API - always use mp4 for best compatibility
function normalizeVideoMimeType(mimeType: string): string {
  // If no type or unknown type, default to mp4
  if (!mimeType || mimeType === '' || !mimeType.startsWith('video/')) {
    return 'video/mp4'
  }
  // Gemini works best with mp4, so normalize all formats
  if (mimeType !== 'video/webm') {
    return 'video/mp4'
  }
  return mimeType
}

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

const SYSTEM_PROMPT = `You are an expert Board-Certified Psychiatrist conducting a comprehensive remote Mental Status Examination (MSE). Your goal is to analyze the patient's video input to identify "Digital Biomarkers" of mental health through systematic observation.

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

async function analyzeVideoWithGemini(filePath: string, mimeType: string): Promise<GeminiAnalysis> {
  const apiKey = process.env.GOOGLE_API_KEY
  if (!apiKey) {
    throw new Error('GOOGLE_API_KEY not configured')
  }

  // Import the new Google GenAI SDK
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { GoogleGenAI, createUserContent, createPartFromUri } = require('@google/genai')

  const ai = new GoogleGenAI({ apiKey })

  // Normalize MIME type for Gemini compatibility
  const normalizedMimeType = normalizeVideoMimeType(mimeType)
  console.log('Uploading to Gemini with MIME type:', normalizedMimeType)

  // 1. Upload the video file
  const uploadResult = await ai.files.upload({
    file: filePath,
    config: { mimeType: normalizedMimeType },
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

    // 2. Check eligibility
    const canCheckIn = await checkInEligibilityService.canPatientCheckIn(user.id)
    if (!canCheckIn) {
      return NextResponse.json(
        { success: false, error: 'You cannot check in. Make sure you are under follow-up with a doctor and have not already checked in today.' },
        { status: 403 }
      )
    }

    // 3. Parse form data
    const formData = await request.formData()
    const videoFile = formData.get('video') as File | null

    if (!videoFile) {
      return NextResponse.json(
        { success: false, error: 'No video file provided' },
        { status: 400 }
      )
    }

    // 4. Validate file
    if (videoFile.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'File size exceeds 100MB limit' },
        { status: 400 }
      )
    }

    // Log received MIME type for debugging (no validation - accept any type)
    console.log('Received video MIME type:', videoFile.type || '(empty)')

    // 5. Process video with transient storage
    const fileHandler = new FileHandler()

    // Use file type or default to mp4 (most compatible with Gemini)
    const videoMimeType = videoFile.type || 'video/mp4'

    const analysis = await fileHandler.withTempFile(videoFile, async (tempPath) => {
      return await analyzeVideoWithGemini(tempPath, videoMimeType)
    })

    // 6. Determine risk flag
    const riskFlag =
      analysis.risk_flags.suicidality_indicated ||
      analysis.risk_flags.self_harm_indicated ||
      analysis.risk_flags.severe_distress ||
      analysis.mood_score < 3

    // 7. Save to database
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
