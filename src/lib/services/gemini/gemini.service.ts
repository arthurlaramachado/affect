import * as fsPromises from 'fs/promises'
import { parseGeminiResponse, PSYCHIATRIST_SYSTEM_PROMPT, type GeminiAnalysis } from './schemas'

const MAX_POLL_ATTEMPTS = 30
const POLL_INTERVAL_MS = 1000
const DEFAULT_MODEL = 'gemini-2.0-flash'

function getModelName(): string {
  return process.env.GEMINI_MODEL || DEFAULT_MODEL
}

export class GeminiServiceError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'GeminiServiceError'
  }
}

interface FilesApi {
  upload: (filePath: string, mimeType: string, displayName: string) => Promise<{ uri: string; name: string }>
  get: (name: string) => Promise<{ state: string }>
  delete: (name: string) => Promise<void>
}

type GenerateContentFn = (params: {
  model: string
  contents: Array<{ role: string; parts: Array<{ text?: string; fileData?: { fileUri: string; mimeType: string } }> }>
  config?: { responseMimeType?: string }
}) => Promise<{ response: { text: () => string } }>

interface GeminiServiceOptions {
  filesApi: FilesApi
  generateContent: GenerateContentFn
}

export class GeminiService {
  private filesApi: FilesApi
  private generateContent: GenerateContentFn

  constructor(options: GeminiServiceOptions) {
    this.filesApi = options.filesApi
    this.generateContent = options.generateContent
  }

  async uploadFile(filePath: string): Promise<string> {
    try {
      const mimeType = this.getMimeType(filePath)
      const displayName = `scan_${Date.now()}`

      const uploadResult = await this.filesApi.upload(filePath, mimeType, displayName)

      const fileUri = uploadResult.uri
      const fileName = uploadResult.name

      // Poll until file is ACTIVE
      await this.waitForFileActive(fileName)

      return fileUri
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        throw error
      }
      throw new GeminiServiceError(
        `Failed to upload file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'UPLOAD_FAILED'
      )
    }
  }

  private async waitForFileActive(fileName: string): Promise<void> {
    for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
      const file = await this.filesApi.get(fileName)

      if (file.state === 'ACTIVE') {
        return
      }

      if (file.state === 'FAILED') {
        throw new GeminiServiceError(
          'File processing failed',
          'FILE_PROCESSING_FAILED'
        )
      }

      await this.sleep(POLL_INTERVAL_MS)
    }

    throw new GeminiServiceError(
      'File processing timed out',
      'FILE_PROCESSING_TIMEOUT'
    )
  }

  async analyzeVideo(fileUri: string): Promise<GeminiAnalysis> {
    try {
      const result = await this.generateContent({
        model: getModelName(),
        contents: [
          {
            role: 'user',
            parts: [
              {
                fileData: {
                  fileUri,
                  mimeType: 'video/mp4',
                },
              },
              {
                text: 'Analyze this patient video and provide your assessment.',
              },
            ],
          },
        ],
        config: {
          responseMimeType: 'application/json',
        },
      })

      const responseText = result.response.text()
      const parsed = parseGeminiResponse(responseText)

      if (!parsed.success) {
        throw new GeminiServiceError(
          `Invalid analysis response: ${parsed.error}`,
          'INVALID_RESPONSE'
        )
      }

      return parsed.data
    } catch (error) {
      if (error instanceof GeminiServiceError) {
        throw error
      }
      throw new GeminiServiceError(
        `Failed to analyze video: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'ANALYSIS_FAILED'
      )
    }
  }

  async deleteFile(fileUri: string): Promise<void> {
    try {
      const fileName = this.extractFileName(fileUri)
      await this.filesApi.delete(fileName)
    } catch (error) {
      // Log but don't throw - cleanup failure shouldn't fail the operation
      console.error('Failed to delete file from Gemini:', error)
    }
  }

  async processVideo(filePath: string): Promise<GeminiAnalysis> {
    let fileUri: string | null = null

    try {
      fileUri = await this.uploadFile(filePath)
      return await this.analyzeVideo(fileUri)
    } finally {
      if (fileUri) {
        await this.deleteFile(fileUri)
      }
    }
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase()
    const mimeTypes: Record<string, string> = {
      mp4: 'video/mp4',
      webm: 'video/webm',
      mov: 'video/quicktime',
      avi: 'video/x-msvideo',
    }
    return mimeTypes[ext || ''] || 'video/mp4'
  }

  private extractFileName(fileUri: string): string {
    // Extract file name from URI like "https://generativelanguage.googleapis.com/v1/files/file-123"
    const parts = fileUri.split('/')
    return parts[parts.length - 1]
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  // Static factory method for production use
  static create(apiKey: string): GeminiService {
    // This would use the real Google AI SDK
    // For now, throw an error as we need proper SDK setup
    throw new Error('Use createGeminiService() from the SDK integration module')
  }
}
