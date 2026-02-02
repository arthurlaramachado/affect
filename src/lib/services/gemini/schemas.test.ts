import { describe, it, expect } from 'vitest'
import {
  geminiAnalysisSchema,
  parseGeminiResponse,
  mseAppearanceSchema,
  mseBehaviorSchema,
  mseSpeechSchema,
  mseMoodAffectSchema,
  mseThoughtProcessSchema,
  mseThoughtContentSchema,
  mseCognitionSchema,
  mseSchema,
  type GeminiAnalysisInput,
  type MSE,
} from './schemas'

describe('geminiAnalysisSchema', () => {
  const validAnalysis: GeminiAnalysisInput = {
    mood_score: 5,
    risk_flags: {
      suicidality_indicated: false,
      self_harm_indicated: false,
      severe_distress: false,
    },
    biomarkers: {
      speech_latency: 'normal',
      affect_type: 'full_range',
      eye_contact: 'normal',
    },
    clinical_summary: 'Patient presents with euthymic mood. No concerning signs observed.',
  }

  describe('mood_score validation', () => {
    it('should accept valid mood scores (1-10)', () => {
      for (let score = 1; score <= 10; score++) {
        const input = { ...validAnalysis, mood_score: score }
        const result = geminiAnalysisSchema.safeParse(input)
        expect(result.success).toBe(true)
      }
    })

    it('should reject mood scores below 1', () => {
      const input = { ...validAnalysis, mood_score: 0 }
      const result = geminiAnalysisSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject mood scores above 10', () => {
      const input = { ...validAnalysis, mood_score: 11 }
      const result = geminiAnalysisSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject non-integer mood scores', () => {
      const input = { ...validAnalysis, mood_score: 5.5 }
      const result = geminiAnalysisSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('risk_flags validation', () => {
    it('should accept valid risk flags', () => {
      const input = {
        ...validAnalysis,
        risk_flags: {
          suicidality_indicated: true,
          self_harm_indicated: false,
          severe_distress: true,
        },
      }
      const result = geminiAnalysisSchema.safeParse(input)
      expect(result.success).toBe(true)
    })

    it('should reject missing risk flag fields', () => {
      const input = {
        ...validAnalysis,
        risk_flags: {
          suicidality_indicated: false,
          // missing other fields
        },
      }
      const result = geminiAnalysisSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('biomarkers validation', () => {
    it('should accept valid speech_latency values', () => {
      const values = ['normal', 'high', 'low'] as const
      for (const value of values) {
        const input = {
          ...validAnalysis,
          biomarkers: { ...validAnalysis.biomarkers, speech_latency: value },
        }
        const result = geminiAnalysisSchema.safeParse(input)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid speech_latency values', () => {
      const input = {
        ...validAnalysis,
        biomarkers: { ...validAnalysis.biomarkers, speech_latency: 'invalid' },
      }
      const result = geminiAnalysisSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should accept valid affect_type values', () => {
      const values = ['full_range', 'flat', 'blunted', 'labile'] as const
      for (const value of values) {
        const input = {
          ...validAnalysis,
          biomarkers: { ...validAnalysis.biomarkers, affect_type: value },
        }
        const result = geminiAnalysisSchema.safeParse(input)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid affect_type values', () => {
      const input = {
        ...validAnalysis,
        biomarkers: { ...validAnalysis.biomarkers, affect_type: 'invalid' },
      }
      const result = geminiAnalysisSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should accept valid eye_contact values', () => {
      const values = ['normal', 'avoidant'] as const
      for (const value of values) {
        const input = {
          ...validAnalysis,
          biomarkers: { ...validAnalysis.biomarkers, eye_contact: value },
        }
        const result = geminiAnalysisSchema.safeParse(input)
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid eye_contact values', () => {
      const input = {
        ...validAnalysis,
        biomarkers: { ...validAnalysis.biomarkers, eye_contact: 'invalid' },
      }
      const result = geminiAnalysisSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })

  describe('clinical_summary validation', () => {
    it('should accept valid clinical summary', () => {
      const result = geminiAnalysisSchema.safeParse(validAnalysis)
      expect(result.success).toBe(true)
    })

    it('should reject empty clinical summary', () => {
      const input = { ...validAnalysis, clinical_summary: '' }
      const result = geminiAnalysisSchema.safeParse(input)
      expect(result.success).toBe(false)
    })

    it('should reject clinical summary that is too long', () => {
      const input = { ...validAnalysis, clinical_summary: 'a'.repeat(2001) }
      const result = geminiAnalysisSchema.safeParse(input)
      expect(result.success).toBe(false)
    })
  })
})

describe('parseGeminiResponse', () => {
  it('should parse valid JSON response', () => {
    const jsonString = JSON.stringify({
      mood_score: 5,
      risk_flags: {
        suicidality_indicated: false,
        self_harm_indicated: false,
        severe_distress: false,
      },
      biomarkers: {
        speech_latency: 'normal',
        affect_type: 'full_range',
        eye_contact: 'normal',
      },
      clinical_summary: 'Patient presents normally.',
    })

    const result = parseGeminiResponse(jsonString)
    expect(result.success).toBe(true)
    expect(result.data?.mood_score).toBe(5)
  })

  it('should handle JSON with extra whitespace', () => {
    const jsonString = `
      {
        "mood_score": 5,
        "risk_flags": {
          "suicidality_indicated": false,
          "self_harm_indicated": false,
          "severe_distress": false
        },
        "biomarkers": {
          "speech_latency": "normal",
          "affect_type": "full_range",
          "eye_contact": "normal"
        },
        "clinical_summary": "Patient presents normally."
      }
    `
    const result = parseGeminiResponse(jsonString)
    expect(result.success).toBe(true)
  })

  it('should handle markdown code block wrapping', () => {
    const jsonString = `\`\`\`json
{
  "mood_score": 5,
  "risk_flags": {
    "suicidality_indicated": false,
    "self_harm_indicated": false,
    "severe_distress": false
  },
  "biomarkers": {
    "speech_latency": "normal",
    "affect_type": "full_range",
    "eye_contact": "normal"
  },
  "clinical_summary": "Patient presents normally."
}
\`\`\``
    const result = parseGeminiResponse(jsonString)
    expect(result.success).toBe(true)
  })

  it('should return error for invalid JSON', () => {
    const result = parseGeminiResponse('not valid json')
    expect(result.success).toBe(false)
    expect(result.error).toContain('parse')
  })

  it('should return error for valid JSON with invalid schema', () => {
    const jsonString = JSON.stringify({ mood_score: 'invalid' })
    const result = parseGeminiResponse(jsonString)
    expect(result.success).toBe(false)
    expect(result.error).toBeDefined()
  })
})

describe('MSE (Mental Status Examination) Schema', () => {
  const validMSE: MSE = {
    appearance: {
      grooming: 'well_groomed',
      dress: 'appropriate',
      hygiene: 'good',
      posture: 'relaxed',
    },
    behavior: {
      psychomotor: 'normal',
      eye_contact: 'appropriate',
      cooperation: 'cooperative',
      movements: 'normal',
    },
    speech: {
      rate: 'normal',
      volume: 'normal',
      tone: 'normal',
      latency: 'normal',
      spontaneity: 'spontaneous',
    },
    mood_affect: {
      reported_mood: 'euthymic',
      observed_affect: 'full_range',
      affect_range: 'full',
      congruence: 'congruent',
      lability: 'stable',
    },
    thought_process: {
      organization: 'organized',
      flow: 'goal_directed',
    },
    thought_content: {
      preoccupations: 'none',
      hopelessness_expressed: false,
      worthlessness_expressed: false,
    },
    cognition: {
      alertness: 'alert',
      attention: 'intact',
      estimated_insight: 'good',
      estimated_judgment: 'good',
    },
  }

  describe('mseAppearanceSchema validation', () => {
    it('should accept valid appearance values', () => {
      const result = mseAppearanceSchema.safeParse(validMSE.appearance)
      expect(result.success).toBe(true)
    })

    it('should accept all valid grooming values', () => {
      const values = ['well_groomed', 'disheveled', 'unkempt', 'bizarre'] as const
      for (const grooming of values) {
        const result = mseAppearanceSchema.safeParse({
          ...validMSE.appearance,
          grooming,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid dress values', () => {
      const values = ['appropriate', 'inappropriate', 'disheveled', 'bizarre'] as const
      for (const dress of values) {
        const result = mseAppearanceSchema.safeParse({
          ...validMSE.appearance,
          dress,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid hygiene values', () => {
      const values = ['good', 'fair', 'poor'] as const
      for (const hygiene of values) {
        const result = mseAppearanceSchema.safeParse({
          ...validMSE.appearance,
          hygiene,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid posture values', () => {
      const values = ['relaxed', 'tense', 'slumped', 'rigid'] as const
      for (const posture of values) {
        const result = mseAppearanceSchema.safeParse({
          ...validMSE.appearance,
          posture,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid grooming value', () => {
      const result = mseAppearanceSchema.safeParse({
        ...validMSE.appearance,
        grooming: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('mseBehaviorSchema validation', () => {
    it('should accept valid behavior values', () => {
      const result = mseBehaviorSchema.safeParse(validMSE.behavior)
      expect(result.success).toBe(true)
    })

    it('should accept all valid psychomotor values', () => {
      const values = ['normal', 'retarded', 'agitated', 'catatonic'] as const
      for (const psychomotor of values) {
        const result = mseBehaviorSchema.safeParse({
          ...validMSE.behavior,
          psychomotor,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid eye_contact values', () => {
      const values = ['appropriate', 'avoidant', 'intense', 'absent'] as const
      for (const eye_contact of values) {
        const result = mseBehaviorSchema.safeParse({
          ...validMSE.behavior,
          eye_contact,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid cooperation values', () => {
      const values = ['cooperative', 'guarded', 'hostile', 'uncooperative'] as const
      for (const cooperation of values) {
        const result = mseBehaviorSchema.safeParse({
          ...validMSE.behavior,
          cooperation,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid movements values', () => {
      const values = ['normal', 'restless', 'tremor', 'tics', 'stereotyped'] as const
      for (const movements of values) {
        const result = mseBehaviorSchema.safeParse({
          ...validMSE.behavior,
          movements,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid psychomotor value', () => {
      const result = mseBehaviorSchema.safeParse({
        ...validMSE.behavior,
        psychomotor: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('mseSpeechSchema validation', () => {
    it('should accept valid speech values', () => {
      const result = mseSpeechSchema.safeParse(validMSE.speech)
      expect(result.success).toBe(true)
    })

    it('should accept all valid rate values', () => {
      const values = ['normal', 'slow', 'rapid', 'pressured'] as const
      for (const rate of values) {
        const result = mseSpeechSchema.safeParse({
          ...validMSE.speech,
          rate,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid volume values', () => {
      const values = ['normal', 'soft', 'loud', 'whispered'] as const
      for (const volume of values) {
        const result = mseSpeechSchema.safeParse({
          ...validMSE.speech,
          volume,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid tone values', () => {
      const values = ['normal', 'monotone', 'tremulous', 'angry'] as const
      for (const tone of values) {
        const result = mseSpeechSchema.safeParse({
          ...validMSE.speech,
          tone,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid latency values', () => {
      const values = ['normal', 'increased', 'decreased'] as const
      for (const latency of values) {
        const result = mseSpeechSchema.safeParse({
          ...validMSE.speech,
          latency,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid spontaneity values', () => {
      const values = ['spontaneous', 'only_answers', 'mute'] as const
      for (const spontaneity of values) {
        const result = mseSpeechSchema.safeParse({
          ...validMSE.speech,
          spontaneity,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid rate value', () => {
      const result = mseSpeechSchema.safeParse({
        ...validMSE.speech,
        rate: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('mseMoodAffectSchema validation', () => {
    it('should accept valid mood_affect values', () => {
      const result = mseMoodAffectSchema.safeParse(validMSE.mood_affect)
      expect(result.success).toBe(true)
    })

    it('should accept all valid reported_mood values', () => {
      const values = ['euthymic', 'depressed', 'anxious', 'irritable', 'euphoric', 'angry'] as const
      for (const reported_mood of values) {
        const result = mseMoodAffectSchema.safeParse({
          ...validMSE.mood_affect,
          reported_mood,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid observed_affect values', () => {
      const values = ['full_range', 'flat', 'blunted', 'labile', 'anxious', 'irritable'] as const
      for (const observed_affect of values) {
        const result = mseMoodAffectSchema.safeParse({
          ...validMSE.mood_affect,
          observed_affect,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid affect_range values', () => {
      const values = ['full', 'restricted', 'flat'] as const
      for (const affect_range of values) {
        const result = mseMoodAffectSchema.safeParse({
          ...validMSE.mood_affect,
          affect_range,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid congruence values', () => {
      const values = ['congruent', 'incongruent'] as const
      for (const congruence of values) {
        const result = mseMoodAffectSchema.safeParse({
          ...validMSE.mood_affect,
          congruence,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid lability values', () => {
      const values = ['stable', 'labile'] as const
      for (const lability of values) {
        const result = mseMoodAffectSchema.safeParse({
          ...validMSE.mood_affect,
          lability,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid reported_mood value', () => {
      const result = mseMoodAffectSchema.safeParse({
        ...validMSE.mood_affect,
        reported_mood: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('mseThoughtProcessSchema validation', () => {
    it('should accept valid thought_process values', () => {
      const result = mseThoughtProcessSchema.safeParse(validMSE.thought_process)
      expect(result.success).toBe(true)
    })

    it('should accept all valid organization values', () => {
      const values = ['organized', 'disorganized', 'tangential', 'circumstantial'] as const
      for (const organization of values) {
        const result = mseThoughtProcessSchema.safeParse({
          ...validMSE.thought_process,
          organization,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid flow values', () => {
      const values = ['goal_directed', 'loose_associations', 'flight_of_ideas', 'thought_blocking'] as const
      for (const flow of values) {
        const result = mseThoughtProcessSchema.safeParse({
          ...validMSE.thought_process,
          flow,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid organization value', () => {
      const result = mseThoughtProcessSchema.safeParse({
        ...validMSE.thought_process,
        organization: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('mseThoughtContentSchema validation', () => {
    it('should accept valid thought_content values', () => {
      const result = mseThoughtContentSchema.safeParse(validMSE.thought_content)
      expect(result.success).toBe(true)
    })

    it('should accept all valid preoccupations values', () => {
      const values = ['none', 'health', 'guilt', 'religious', 'somatic', 'other'] as const
      for (const preoccupations of values) {
        const result = mseThoughtContentSchema.safeParse({
          ...validMSE.thought_content,
          preoccupations,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept boolean values for hopelessness_expressed', () => {
      const valuesTrue = mseThoughtContentSchema.safeParse({
        ...validMSE.thought_content,
        hopelessness_expressed: true,
      })
      const valuesFalse = mseThoughtContentSchema.safeParse({
        ...validMSE.thought_content,
        hopelessness_expressed: false,
      })
      expect(valuesTrue.success).toBe(true)
      expect(valuesFalse.success).toBe(true)
    })

    it('should accept boolean values for worthlessness_expressed', () => {
      const valuesTrue = mseThoughtContentSchema.safeParse({
        ...validMSE.thought_content,
        worthlessness_expressed: true,
      })
      const valuesFalse = mseThoughtContentSchema.safeParse({
        ...validMSE.thought_content,
        worthlessness_expressed: false,
      })
      expect(valuesTrue.success).toBe(true)
      expect(valuesFalse.success).toBe(true)
    })

    it('should reject invalid preoccupations value', () => {
      const result = mseThoughtContentSchema.safeParse({
        ...validMSE.thought_content,
        preoccupations: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('mseCognitionSchema validation', () => {
    it('should accept valid cognition values', () => {
      const result = mseCognitionSchema.safeParse(validMSE.cognition)
      expect(result.success).toBe(true)
    })

    it('should accept all valid alertness values', () => {
      const values = ['alert', 'drowsy', 'lethargic', 'obtunded'] as const
      for (const alertness of values) {
        const result = mseCognitionSchema.safeParse({
          ...validMSE.cognition,
          alertness,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid attention values', () => {
      const values = ['intact', 'impaired', 'distractible'] as const
      for (const attention of values) {
        const result = mseCognitionSchema.safeParse({
          ...validMSE.cognition,
          attention,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid estimated_insight values', () => {
      const values = ['good', 'fair', 'poor', 'absent'] as const
      for (const estimated_insight of values) {
        const result = mseCognitionSchema.safeParse({
          ...validMSE.cognition,
          estimated_insight,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should accept all valid estimated_judgment values', () => {
      const values = ['good', 'fair', 'poor', 'impaired'] as const
      for (const estimated_judgment of values) {
        const result = mseCognitionSchema.safeParse({
          ...validMSE.cognition,
          estimated_judgment,
        })
        expect(result.success).toBe(true)
      }
    })

    it('should reject invalid alertness value', () => {
      const result = mseCognitionSchema.safeParse({
        ...validMSE.cognition,
        alertness: 'invalid',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('mseSchema (complete MSE) validation', () => {
    it('should accept a complete valid MSE', () => {
      const result = mseSchema.safeParse(validMSE)
      expect(result.success).toBe(true)
    })

    it('should reject MSE with missing required sections', () => {
      const incompleteMSE = {
        appearance: validMSE.appearance,
        // missing other required sections
      }
      const result = mseSchema.safeParse(incompleteMSE)
      expect(result.success).toBe(false)
    })

    it('should reject MSE with invalid nested values', () => {
      const invalidMSE = {
        ...validMSE,
        appearance: {
          ...validMSE.appearance,
          grooming: 'invalid_value',
        },
      }
      const result = mseSchema.safeParse(invalidMSE)
      expect(result.success).toBe(false)
    })
  })

  describe('geminiAnalysisSchema with optional MSE', () => {
    const validAnalysisWithoutMSE: GeminiAnalysisInput = {
      mood_score: 5,
      risk_flags: {
        suicidality_indicated: false,
        self_harm_indicated: false,
        severe_distress: false,
      },
      biomarkers: {
        speech_latency: 'normal',
        affect_type: 'full_range',
        eye_contact: 'normal',
      },
      clinical_summary: 'Patient presents with euthymic mood.',
    }

    it('should accept analysis WITHOUT mse field (backward compatibility)', () => {
      const result = geminiAnalysisSchema.safeParse(validAnalysisWithoutMSE)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.mse).toBeUndefined()
      }
    })

    it('should accept analysis WITH complete mse field', () => {
      const analysisWithMSE = {
        ...validAnalysisWithoutMSE,
        mse: validMSE,
      }
      const result = geminiAnalysisSchema.safeParse(analysisWithMSE)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.mse).toBeDefined()
        expect(result.data.mse?.appearance.grooming).toBe('well_groomed')
      }
    })

    it('should reject analysis WITH invalid mse field', () => {
      const analysisWithInvalidMSE = {
        ...validAnalysisWithoutMSE,
        mse: {
          appearance: {
            grooming: 'invalid_value',
            dress: 'appropriate',
            hygiene: 'good',
            posture: 'relaxed',
          },
        },
      }
      const result = geminiAnalysisSchema.safeParse(analysisWithInvalidMSE)
      expect(result.success).toBe(false)
    })
  })

  describe('parseGeminiResponse with MSE', () => {
    it('should parse response without MSE (backward compatibility)', () => {
      const jsonString = JSON.stringify({
        mood_score: 5,
        risk_flags: {
          suicidality_indicated: false,
          self_harm_indicated: false,
          severe_distress: false,
        },
        biomarkers: {
          speech_latency: 'normal',
          affect_type: 'full_range',
          eye_contact: 'normal',
        },
        clinical_summary: 'Patient presents normally.',
      })

      const result = parseGeminiResponse(jsonString)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.mse).toBeUndefined()
      }
    })

    it('should parse response with complete MSE', () => {
      const jsonString = JSON.stringify({
        mood_score: 5,
        risk_flags: {
          suicidality_indicated: false,
          self_harm_indicated: false,
          severe_distress: false,
        },
        biomarkers: {
          speech_latency: 'normal',
          affect_type: 'full_range',
          eye_contact: 'normal',
        },
        clinical_summary: 'Patient presents normally.',
        mse: validMSE,
      })

      const result = parseGeminiResponse(jsonString)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.mse).toBeDefined()
        expect(result.data.mse?.appearance.grooming).toBe('well_groomed')
        expect(result.data.mse?.cognition.estimated_insight).toBe('good')
      }
    })
  })
})
