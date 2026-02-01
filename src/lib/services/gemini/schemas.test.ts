import { describe, it, expect } from 'vitest'
import {
  geminiAnalysisSchema,
  parseGeminiResponse,
  type GeminiAnalysisInput,
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
