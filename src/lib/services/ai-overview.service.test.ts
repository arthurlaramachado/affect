import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  AIOverviewService,
  AIOverviewServiceError,
  generatePrompt,
  parseAIResponse,
  type AIOverviewInput,
  type AIOverview,
  type AIClient,
} from './ai-overview.service'

// Helper to create mock check-in data
function createMockCheckIn(overrides: Partial<AIOverviewInput['checkIns'][number]> = {}): AIOverviewInput['checkIns'][number] {
  return {
    date: new Date('2025-01-15T12:00:00Z'),
    moodScore: 5,
    riskFlag: false,
    clinicalSummary: 'Patient presents with euthymic mood and stable affect.',
    biomarkers: {
      speech_latency: 'normal',
      affect_type: 'full_range',
      eye_contact: 'normal',
    },
    riskFlags: {
      suicidality_indicated: false,
      self_harm_indicated: false,
      severe_distress: false,
    },
    ...overrides,
  }
}

// Helper to create valid AI overview input
function createMockInput(overrides: Partial<AIOverviewInput> = {}): AIOverviewInput {
  return {
    patient: {
      id: 'patient-123',
      name: 'John Doe',
      patientSince: new Date('2024-06-01'),
    },
    checkIns: [
      createMockCheckIn({ date: new Date('2025-01-10'), moodScore: 4 }),
      createMockCheckIn({ date: new Date('2025-01-12'), moodScore: 5 }),
      createMockCheckIn({ date: new Date('2025-01-14'), moodScore: 6 }),
    ],
    insights: {
      moodTrend: 'improving',
      averageMood: 5,
      complianceRate: 85,
    },
    ...overrides,
  }
}

// Helper to create valid Gemini response object
function createMockGeminiResponseObject() {
  return {
    longitudinalAnalysis: 'Patient shows consistent improvement over the observation period with mood scores trending upward from 4 to 6.',
    keyPatterns: [
      'Consistent daily check-ins indicating good treatment adherence',
      'Gradual mood improvement over 5-day period',
      'No risk indicators detected throughout monitoring',
    ],
    clinicalConcerns: [
      'Monitor for potential mood instability given recent fluctuations',
    ],
    recommendations: [
      'Continue current treatment plan',
      'Schedule follow-up in 2 weeks to assess sustained improvement',
      'Encourage continued daily check-ins',
    ],
    overallAssessment: 'Patient demonstrates positive trajectory with improving mood and stable clinical presentation. No immediate clinical concerns identified.',
  }
}

// Helper to create valid AIOverview
function createMockGeminiResponse(): AIOverview {
  return {
    ...createMockGeminiResponseObject(),
    generatedAt: new Date(),
  }
}

// Helper to create mock AI client
function createMockAIClient(mockGenerateContent: AIClient['generateContent']): AIClient {
  return {
    generateContent: mockGenerateContent,
  }
}

describe('AIOverviewService', () => {
  let service: AIOverviewService
  let mockGenerateContent: AIClient['generateContent']
  let mockAIClient: AIClient
  let originalEnv: NodeJS.ProcessEnv

  beforeEach(() => {
    originalEnv = { ...process.env }
    process.env.GOOGLE_API_KEY = 'test-api-key'

    // Setup mock AI client
    mockGenerateContent = vi.fn()
    mockAIClient = createMockAIClient(mockGenerateContent)

    service = new AIOverviewService(mockAIClient)
  })

  afterEach(() => {
    process.env = originalEnv
    vi.clearAllMocks()
  })

  describe('generateOverview', () => {
    it('should generate overview from check-in data', async () => {
      const input = createMockInput()
      const mockResponse = createMockGeminiResponseObject()

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(mockResponse),
      })

      const result = await service.generateOverview(input)

      expect(result.longitudinalAnalysis).toBe(mockResponse.longitudinalAnalysis)
      expect(result.keyPatterns).toEqual(mockResponse.keyPatterns)
      expect(result.clinicalConcerns).toEqual(mockResponse.clinicalConcerns)
      expect(result.recommendations).toEqual(mockResponse.recommendations)
      expect(result.overallAssessment).toBe(mockResponse.overallAssessment)
      expect(result.generatedAt).toBeInstanceOf(Date)
    })

    it('should handle empty check-ins array', async () => {
      const input = createMockInput({ checkIns: [] })

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          longitudinalAnalysis: 'Insufficient data for longitudinal analysis. No check-ins available.',
          keyPatterns: [],
          clinicalConcerns: ['No data available for clinical assessment'],
          recommendations: ['Patient should begin regular check-ins'],
          overallAssessment: 'Unable to provide comprehensive assessment due to lack of data.',
        }),
      })

      const result = await service.generateOverview(input)

      expect(result.longitudinalAnalysis).toContain('Insufficient data')
      expect(result.keyPatterns).toEqual([])
      expect(result.generatedAt).toBeInstanceOf(Date)
    })

    it('should handle single check-in', async () => {
      const input = createMockInput({
        checkIns: [createMockCheckIn()],
      })

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          longitudinalAnalysis: 'Single check-in available. Limited longitudinal assessment possible.',
          keyPatterns: ['Initial presentation shows euthymic mood'],
          clinicalConcerns: [],
          recommendations: ['Continue daily check-ins to establish baseline'],
          overallAssessment: 'Patient presents with stable mood. More data needed for comprehensive trend analysis.',
        }),
      })

      const result = await service.generateOverview(input)

      expect(result.longitudinalAnalysis).toContain('Single check-in')
      expect(result.keyPatterns.length).toBeGreaterThanOrEqual(1)
      expect(result.generatedAt).toBeInstanceOf(Date)
    })

    it('should handle Gemini API errors gracefully', async () => {
      const input = createMockInput()

      mockGenerateContent.mockRejectedValue(new Error('API rate limit exceeded'))

      await expect(service.generateOverview(input)).rejects.toThrow(AIOverviewServiceError)
      await expect(service.generateOverview(input)).rejects.toThrow('Failed to generate AI overview')
    })

    it('should throw error when GOOGLE_API_KEY is not configured and no client provided', async () => {
      delete process.env.GOOGLE_API_KEY

      // Create service without injected client
      const serviceWithoutClient = new AIOverviewService()
      const input = createMockInput()

      await expect(serviceWithoutClient.generateOverview(input)).rejects.toThrow(AIOverviewServiceError)
      await expect(serviceWithoutClient.generateOverview(input)).rejects.toThrow('GOOGLE_API_KEY not configured')
    })

    it('should validate response schema', async () => {
      const input = createMockInput()

      // Invalid response missing required fields
      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          longitudinalAnalysis: 'Some analysis',
          // Missing keyPatterns, clinicalConcerns, recommendations, overallAssessment
        }),
      })

      await expect(service.generateOverview(input)).rejects.toThrow(AIOverviewServiceError)
      await expect(service.generateOverview(input)).rejects.toThrow('Invalid AI response format')
    })

    it('should handle timeout', async () => {
      const input = createMockInput()

      // Simulate a timeout by rejecting with a timeout error
      mockGenerateContent.mockRejectedValue(new Error('Request timed out'))

      await expect(service.generateOverview(input)).rejects.toThrow(AIOverviewServiceError)
    })

    it('should handle malformed JSON response', async () => {
      const input = createMockInput()

      mockGenerateContent.mockResolvedValue({
        text: 'This is not valid JSON',
      })

      await expect(service.generateOverview(input)).rejects.toThrow(AIOverviewServiceError)
      await expect(service.generateOverview(input)).rejects.toThrow('Invalid AI response format')
    })

    it('should handle JSON wrapped in markdown code blocks', async () => {
      const input = createMockInput()
      const mockResponse = createMockGeminiResponseObject()

      mockGenerateContent.mockResolvedValue({
        text: '```json\n' + JSON.stringify(mockResponse) + '\n```',
      })

      const result = await service.generateOverview(input)

      expect(result.longitudinalAnalysis).toBe(mockResponse.longitudinalAnalysis)
    })

    it('should include check-in data with risk flags in the prompt', async () => {
      const input = createMockInput({
        checkIns: [
          createMockCheckIn({
            date: new Date('2025-01-15'),
            moodScore: 2,
            riskFlag: true,
            riskFlags: {
              suicidality_indicated: true,
              self_harm_indicated: false,
              severe_distress: true,
            },
            clinicalSummary: 'Patient exhibits concerning symptoms with suicidal ideation.',
          }),
        ],
      })

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          longitudinalAnalysis: 'Patient shows concerning presentation.',
          keyPatterns: ['Suicidal ideation present'],
          clinicalConcerns: ['Immediate risk assessment needed', 'Suicidality indicators detected'],
          recommendations: ['Urgent psychiatric evaluation', 'Safety planning required'],
          overallAssessment: 'High-risk presentation requiring immediate clinical attention.',
        }),
      })

      const result = await service.generateOverview(input)

      expect(result.clinicalConcerns).toContain('Immediate risk assessment needed')
      expect(mockGenerateContent).toHaveBeenCalled()

      // Verify the prompt includes risk flag information
      const callArgs = mockGenerateContent.mock.calls[0][0]
      expect(callArgs.contents).toContain('suicidality_indicated')
    })

    it('should include MSE data when available', async () => {
      const input = createMockInput({
        checkIns: [
          createMockCheckIn({
            mse: {
              appearance: { grooming: 'well_groomed', dress: 'appropriate', hygiene: 'good', posture: 'relaxed' },
              behavior: { psychomotor: 'normal', eye_contact: 'appropriate', cooperation: 'cooperative', movements: 'normal' },
              speech: { rate: 'normal', volume: 'normal', tone: 'normal', latency: 'normal', spontaneity: 'spontaneous' },
              mood_affect: { reported_mood: 'euthymic', observed_affect: 'full_range', affect_range: 'full', congruence: 'congruent', lability: 'stable' },
              thought_process: { organization: 'organized', flow: 'goal_directed' },
              thought_content: { preoccupations: 'none', hopelessness_expressed: false, worthlessness_expressed: false },
              cognition: { alertness: 'alert', attention: 'intact', estimated_insight: 'good', estimated_judgment: 'good' },
            },
          }),
        ],
      })

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          longitudinalAnalysis: 'Complete MSE assessment available.',
          keyPatterns: ['Normal MSE findings'],
          clinicalConcerns: [],
          recommendations: ['Continue monitoring'],
          overallAssessment: 'Patient shows stable presentation with normal MSE findings.',
        }),
      })

      await service.generateOverview(input)

      // Verify the prompt includes MSE data
      const callArgs = mockGenerateContent.mock.calls[0][0]
      expect(callArgs.contents).toContain('MSE')
    })

    it('should use correct Gemini model', async () => {
      const input = createMockInput()

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(createMockGeminiResponseObject()),
      })

      await service.generateOverview(input)

      const callArgs = mockGenerateContent.mock.calls[0][0]
      expect(callArgs.model).toMatch(/gemini/)
    })
  })

  describe('error handling', () => {
    it('should include error code in AIOverviewServiceError', async () => {
      const input = createMockInput()

      mockGenerateContent.mockRejectedValue(new Error('Network error'))

      try {
        await service.generateOverview(input)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(AIOverviewServiceError)
        expect((error as AIOverviewServiceError).code).toBe('GENERATION_FAILED')
      }
    })

    it('should preserve original error message in details', async () => {
      const input = createMockInput()

      mockGenerateContent.mockRejectedValue(new Error('Specific API error message'))

      try {
        await service.generateOverview(input)
        expect.fail('Should have thrown')
      } catch (error) {
        expect(error).toBeInstanceOf(AIOverviewServiceError)
        expect((error as AIOverviewServiceError).message).toContain('Failed to generate AI overview')
      }
    })
  })

  describe('input validation', () => {
    it('should handle patient data correctly', async () => {
      const input = createMockInput({
        patient: {
          id: 'unique-patient-id',
          name: 'Jane Smith',
          patientSince: new Date('2023-01-15'),
        },
      })

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify(createMockGeminiResponseObject()),
      })

      await service.generateOverview(input)

      const callArgs = mockGenerateContent.mock.calls[0][0]
      expect(callArgs.contents).toContain('Jane Smith')
    })

    it('should handle multiple check-ins with varying mood scores', async () => {
      const input = createMockInput({
        checkIns: [
          createMockCheckIn({ date: new Date('2025-01-01'), moodScore: 3 }),
          createMockCheckIn({ date: new Date('2025-01-05'), moodScore: 5 }),
          createMockCheckIn({ date: new Date('2025-01-10'), moodScore: 7 }),
          createMockCheckIn({ date: new Date('2025-01-15'), moodScore: 6 }),
          createMockCheckIn({ date: new Date('2025-01-20'), moodScore: 8 }),
        ],
        insights: {
          moodTrend: 'improving',
          averageMood: 5.8,
          complianceRate: 71,
        },
      })

      mockGenerateContent.mockResolvedValue({
        text: JSON.stringify({
          longitudinalAnalysis: 'Patient shows significant improvement from mood score 3 to 8 over 20 days.',
          keyPatterns: ['Consistent upward trend', 'Minor fluctuation mid-period'],
          clinicalConcerns: [],
          recommendations: ['Maintain current treatment approach'],
          overallAssessment: 'Excellent progress with sustained improvement.',
        }),
      })

      const result = await service.generateOverview(input)

      expect(result.keyPatterns).toContain('Consistent upward trend')
    })
  })
})

describe('generatePrompt', () => {
  it('should include patient name', () => {
    const input = createMockInput({
      patient: { id: '123', name: 'Test Patient', patientSince: new Date('2024-01-01') },
    })

    const prompt = generatePrompt(input)

    expect(prompt).toContain('Test Patient')
  })

  it('should include mood trend', () => {
    const input = createMockInput({
      insights: { moodTrend: 'declining', averageMood: 4, complianceRate: 70 },
    })

    const prompt = generatePrompt(input)

    expect(prompt).toContain('declining')
  })

  it('should include all check-in data', () => {
    const input = createMockInput({
      checkIns: [
        createMockCheckIn({ moodScore: 3, clinicalSummary: 'First check-in summary' }),
        createMockCheckIn({ moodScore: 7, clinicalSummary: 'Second check-in summary' }),
      ],
    })

    const prompt = generatePrompt(input)

    expect(prompt).toContain('First check-in summary')
    expect(prompt).toContain('Second check-in summary')
    expect(prompt).toContain('3/10')
    expect(prompt).toContain('7/10')
  })

  it('should include risk flags when present', () => {
    const input = createMockInput({
      checkIns: [
        createMockCheckIn({
          riskFlag: true,
          riskFlags: {
            suicidality_indicated: true,
            self_harm_indicated: false,
            severe_distress: true,
          },
        }),
      ],
    })

    const prompt = generatePrompt(input)

    expect(prompt).toContain('suicidality_indicated: true')
    expect(prompt).toContain('severe_distress: true')
    expect(prompt).toContain('Risk Flag: YES')
  })

  it('should include MSE data when available', () => {
    const input = createMockInput({
      checkIns: [
        createMockCheckIn({
          mse: { appearance: { grooming: 'well_groomed' } },
        }),
      ],
    })

    const prompt = generatePrompt(input)

    expect(prompt).toContain('MSE')
    expect(prompt).toContain('well_groomed')
  })

  it('should handle empty check-ins array', () => {
    const input = createMockInput({ checkIns: [] })

    const prompt = generatePrompt(input)

    expect(prompt).toContain('No check-ins available')
    expect(prompt).toContain('Total Check-ins: 0')
  })
})

describe('parseAIResponse', () => {
  it('should parse valid JSON response', () => {
    const validResponse = JSON.stringify({
      longitudinalAnalysis: 'Test analysis',
      keyPatterns: ['Pattern 1', 'Pattern 2'],
      clinicalConcerns: ['Concern 1'],
      recommendations: ['Recommendation 1'],
      overallAssessment: 'Test assessment',
    })

    const result = parseAIResponse(validResponse)

    expect(result.longitudinalAnalysis).toBe('Test analysis')
    expect(result.keyPatterns).toEqual(['Pattern 1', 'Pattern 2'])
    expect(result.clinicalConcerns).toEqual(['Concern 1'])
    expect(result.recommendations).toEqual(['Recommendation 1'])
    expect(result.overallAssessment).toBe('Test assessment')
  })

  it('should handle JSON wrapped in markdown code blocks', () => {
    const wrappedResponse = '```json\n' + JSON.stringify({
      longitudinalAnalysis: 'Test analysis',
      keyPatterns: [],
      clinicalConcerns: [],
      recommendations: [],
      overallAssessment: 'Test assessment',
    }) + '\n```'

    const result = parseAIResponse(wrappedResponse)

    expect(result.longitudinalAnalysis).toBe('Test analysis')
  })

  it('should throw error for invalid JSON', () => {
    expect(() => parseAIResponse('not valid json')).toThrow(AIOverviewServiceError)
    expect(() => parseAIResponse('not valid json')).toThrow('Failed to parse JSON')
  })

  it('should throw error for missing required fields', () => {
    const incompleteResponse = JSON.stringify({
      longitudinalAnalysis: 'Test',
      // Missing other required fields
    })

    expect(() => parseAIResponse(incompleteResponse)).toThrow(AIOverviewServiceError)
    expect(() => parseAIResponse(incompleteResponse)).toThrow('Invalid AI response format')
  })

  it('should throw error for empty longitudinalAnalysis', () => {
    const emptyFieldResponse = JSON.stringify({
      longitudinalAnalysis: '',
      keyPatterns: [],
      clinicalConcerns: [],
      recommendations: [],
      overallAssessment: 'Test',
    })

    expect(() => parseAIResponse(emptyFieldResponse)).toThrow(AIOverviewServiceError)
  })

  it('should allow empty arrays for optional collections', () => {
    const validResponse = JSON.stringify({
      longitudinalAnalysis: 'Test analysis',
      keyPatterns: [],
      clinicalConcerns: [],
      recommendations: [],
      overallAssessment: 'Test assessment',
    })

    const result = parseAIResponse(validResponse)

    expect(result.keyPatterns).toEqual([])
    expect(result.clinicalConcerns).toEqual([])
    expect(result.recommendations).toEqual([])
  })
})
