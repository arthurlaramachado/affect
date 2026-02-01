import { describe, it, expect, vi, beforeEach } from 'vitest'
import { FileHandler, FileHandlerError } from './file-handler'

// Helper to create a mock File with proper arrayBuffer method
function createMockFile(name: string, type: string, content: Uint8Array = new Uint8Array()): File {
  const mockFile = {
    name,
    type,
    arrayBuffer: vi.fn().mockResolvedValue(content.buffer),
  }
  return mockFile as unknown as File
}

describe('FileHandler', () => {
  let handler: FileHandler
  let mockWriteFile: ReturnType<typeof vi.fn>
  let mockUnlink: ReturnType<typeof vi.fn>
  const mockUUID = vi.fn().mockReturnValue('test-uuid-1234')

  beforeEach(() => {
    vi.clearAllMocks()
    mockWriteFile = vi.fn().mockResolvedValue(undefined)
    mockUnlink = vi.fn().mockResolvedValue(undefined)
    handler = new FileHandler({
      uuidGenerator: mockUUID,
      writeFile: mockWriteFile,
      unlink: mockUnlink,
    })
  })

  describe('saveToTemp', () => {
    it('should save file to temp directory with unique name', async () => {
      const mockFile = createMockFile('video.mp4', 'video/mp4', new Uint8Array([0x00, 0x00, 0x00]))

      const result = await handler.saveToTemp(mockFile)

      expect(result).toContain('/tmp/')
      expect(result).toContain('test-uuid-1234')
      expect(result).toMatch(/\.mp4$/)
      expect(mockWriteFile).toHaveBeenCalledWith(
        result,
        expect.any(Buffer)
      )
    })

    it('should preserve original file extension', async () => {
      const mockFile = createMockFile('recording.webm', 'video/webm')

      const result = await handler.saveToTemp(mockFile)

      expect(result).toMatch(/\.webm$/)
    })

    it('should default to .mp4 when no extension provided', async () => {
      const mockFile = createMockFile('recording', 'video/mp4')

      const result = await handler.saveToTemp(mockFile)

      expect(result).toMatch(/\.mp4$/)
    })

    it('should throw FileHandlerError on write failure', async () => {
      const mockFile = createMockFile('video.mp4', 'video/mp4')
      mockWriteFile.mockRejectedValue(new Error('Disk full'))

      await expect(handler.saveToTemp(mockFile)).rejects.toThrow(FileHandlerError)
    })
  })

  describe('deleteFromTemp', () => {
    it('should delete file from temp directory', async () => {
      const filePath = '/tmp/scan_test-uuid.mp4'

      await handler.deleteFromTemp(filePath)

      expect(mockUnlink).toHaveBeenCalledWith(filePath)
    })

    it('should not throw if file does not exist', async () => {
      const filePath = '/tmp/nonexistent.mp4'
      const error = new Error('ENOENT') as NodeJS.ErrnoException
      error.code = 'ENOENT'
      mockUnlink.mockRejectedValue(error)

      await expect(handler.deleteFromTemp(filePath)).resolves.not.toThrow()
    })

    it('should throw FileHandlerError for other delete errors', async () => {
      const filePath = '/tmp/scan_test.mp4'
      mockUnlink.mockRejectedValue(new Error('Permission denied'))

      await expect(handler.deleteFromTemp(filePath)).rejects.toThrow(FileHandlerError)
    })

    it('should only allow deleting from temp directory', async () => {
      const filePath = '/etc/passwd'

      await expect(handler.deleteFromTemp(filePath)).rejects.toThrow(FileHandlerError)
      await expect(handler.deleteFromTemp(filePath)).rejects.toThrow('Security')
    })
  })

  describe('withTempFile', () => {
    it('should clean up file after successful operation', async () => {
      const mockFile = createMockFile('video.mp4', 'video/mp4')

      let savedPath = ''
      await handler.withTempFile(mockFile, async (path) => {
        savedPath = path
        return 'result'
      })

      expect(mockUnlink).toHaveBeenCalledWith(savedPath)
    })

    it('should clean up file even after operation fails', async () => {
      const mockFile = createMockFile('video.mp4', 'video/mp4')

      let savedPath = ''
      try {
        await handler.withTempFile(mockFile, async (path) => {
          savedPath = path
          throw new Error('Processing failed')
        })
      } catch {
        // Expected
      }

      expect(mockUnlink).toHaveBeenCalledWith(savedPath)
    })

    it('should return operation result', async () => {
      const mockFile = createMockFile('video.mp4', 'video/mp4')

      const result = await handler.withTempFile(mockFile, async () => {
        return { success: true, data: 'processed' }
      })

      expect(result).toEqual({ success: true, data: 'processed' })
    })

    it('should propagate operation errors', async () => {
      const mockFile = createMockFile('video.mp4', 'video/mp4')

      await expect(
        handler.withTempFile(mockFile, async () => {
          throw new Error('Analysis failed')
        })
      ).rejects.toThrow('Analysis failed')
    })
  })

  describe('getFileExtension', () => {
    it('should extract extension from filename', () => {
      expect(handler.getFileExtension('video.mp4')).toBe('.mp4')
      expect(handler.getFileExtension('recording.webm')).toBe('.webm')
      expect(handler.getFileExtension('file.name.with.dots.mov')).toBe('.mov')
    })

    it('should return default .mp4 for files without extension', () => {
      expect(handler.getFileExtension('noextension')).toBe('.mp4')
      expect(handler.getFileExtension('')).toBe('.mp4')
    })
  })
})
