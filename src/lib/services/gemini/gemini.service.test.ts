import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GeminiService, GeminiServiceError } from './gemini.service'
import type { GeminiAnalysis } from './schemas'

describe('GeminiService', () => {
  let service: GeminiService
  let mockFilesUpload: ReturnType<typeof vi.fn>
  let mockFilesGet: ReturnType<typeof vi.fn>
  let mockFilesDelete: ReturnType<typeof vi.fn>
  let mockGenerateContent: ReturnType<typeof vi.fn>
  let mockReadFile: ReturnType<typeof vi.fn>

  const validAnalysisResponse: GeminiAnalysis = {
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

  beforeEach(() => {
    vi.clearAllMocks()

    mockFilesUpload = vi.fn().mockResolvedValue({
      file: { uri: 'https://generativelanguage.googleapis.com/v1/files/file-123' },
    })
    mockFilesGet = vi.fn().mockResolvedValue({
      state: 'ACTIVE',
    })
    mockFilesDelete = vi.fn().mockResolvedValue(undefined)
    mockGenerateContent = vi.fn().mockResolvedValue({
      response: {
        text: () => JSON.stringify(validAnalysisResponse),
      },
    })
    mockReadFile = vi.fn().mockResolvedValue(Buffer.from('video content'))

    service = new GeminiService({
      filesApi: {
        upload: mockFilesUpload,
        get: mockFilesGet,
        delete: mockFilesDelete,
      },
      generateContent: mockGenerateContent,
      readFile: mockReadFile,
    })
  })

  describe('uploadFile', () => {
    it('should upload file and return URI', async () => {
      const result = await service.uploadFile('/tmp/video.mp4')

      expect(mockReadFile).toHaveBeenCalledWith('/tmp/video.mp4')
      expect(mockFilesUpload).toHaveBeenCalled()
      expect(result).toBe('https://generativelanguage.googleapis.com/v1/files/file-123')
    })

    it('should poll until file is ACTIVE', async () => {
      mockFilesGet
        .mockResolvedValueOnce({ state: 'PROCESSING' })
        .mockResolvedValueOnce({ state: 'PROCESSING' })
        .mockResolvedValueOnce({ state: 'ACTIVE' })

      const result = await service.uploadFile('/tmp/video.mp4')

      expect(mockFilesGet).toHaveBeenCalledTimes(3)
      expect(result).toBe('https://generativelanguage.googleapis.com/v1/files/file-123')
    })

    it('should throw error if file upload fails', async () => {
      mockFilesUpload.mockRejectedValue(new Error('Upload failed'))

      await expect(service.uploadFile('/tmp/video.mp4')).rejects.toThrow(GeminiServiceError)
    })

    it('should throw error if file never becomes ACTIVE', async () => {
      mockFilesGet.mockResolvedValue({ state: 'FAILED' })

      await expect(service.uploadFile('/tmp/video.mp4')).rejects.toThrow(GeminiServiceError)
    })
  })

  describe('analyzeVideo', () => {
    it('should send video to Gemini and return analysis', async () => {
      const fileUri = 'https://generativelanguage.googleapis.com/v1/files/file-123'

      const result = await service.analyzeVideo(fileUri)

      expect(mockGenerateContent).toHaveBeenCalledWith(
        expect.objectContaining({
          contents: expect.arrayContaining([
            expect.objectContaining({
              parts: expect.arrayContaining([
                expect.objectContaining({ fileData: expect.objectContaining({ fileUri }) }),
              ]),
            }),
          ]),
        })
      )
      expect(result).toEqual(validAnalysisResponse)
    })

    it('should throw error for invalid Gemini response', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => JSON.stringify({ invalid: 'response' }),
        },
      })

      await expect(
        service.analyzeVideo('https://generativelanguage.googleapis.com/v1/files/file-123')
      ).rejects.toThrow(GeminiServiceError)
    })

    it('should throw error if Gemini API fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('API error'))

      await expect(
        service.analyzeVideo('https://generativelanguage.googleapis.com/v1/files/file-123')
      ).rejects.toThrow(GeminiServiceError)
    })
  })

  describe('deleteFile', () => {
    it('should delete file from Gemini', async () => {
      const fileUri = 'https://generativelanguage.googleapis.com/v1/files/file-123'

      await service.deleteFile(fileUri)

      expect(mockFilesDelete).toHaveBeenCalledWith('file-123')
    })

    it('should not throw if delete fails', async () => {
      mockFilesDelete.mockRejectedValue(new Error('Delete failed'))

      await expect(
        service.deleteFile('https://generativelanguage.googleapis.com/v1/files/file-123')
      ).resolves.not.toThrow()
    })
  })

  describe('processVideo', () => {
    it('should upload, analyze, and delete file', async () => {
      const result = await service.processVideo('/tmp/video.mp4')

      expect(mockFilesUpload).toHaveBeenCalled()
      expect(mockGenerateContent).toHaveBeenCalled()
      expect(mockFilesDelete).toHaveBeenCalled()
      expect(result).toEqual(validAnalysisResponse)
    })

    it('should delete file even if analysis fails', async () => {
      mockGenerateContent.mockRejectedValue(new Error('Analysis failed'))

      try {
        await service.processVideo('/tmp/video.mp4')
      } catch {
        // Expected
      }

      expect(mockFilesDelete).toHaveBeenCalled()
    })
  })
})
