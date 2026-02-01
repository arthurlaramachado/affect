import * as fsPromises from 'fs/promises'
import * as path from 'path'
import { randomUUID } from 'crypto'

const TEMP_DIR = '/tmp'
const FILE_PREFIX = 'scan_'

export class FileHandlerError extends Error {
  constructor(message: string, public code: string) {
    super(message)
    this.name = 'FileHandlerError'
  }
}

type UUIDGenerator = () => string
type WriteFileFn = (path: string, data: Buffer) => Promise<void>
type UnlinkFn = (path: string) => Promise<void>

interface FileHandlerOptions {
  uuidGenerator?: UUIDGenerator
  writeFile?: WriteFileFn
  unlink?: UnlinkFn
}

export class FileHandler {
  private generateUUID: UUIDGenerator
  private writeFile: WriteFileFn
  private unlink: UnlinkFn

  constructor(options: FileHandlerOptions = {}) {
    this.generateUUID = options.uuidGenerator || randomUUID
    this.writeFile = options.writeFile || fsPromises.writeFile
    this.unlink = options.unlink || fsPromises.unlink
  }

  async saveToTemp(file: File): Promise<string> {
    const extension = this.getFileExtension(file.name)
    const uniqueId = this.generateUUID()
    const fileName = `${FILE_PREFIX}${uniqueId}${extension}`
    const filePath = path.join(TEMP_DIR, fileName)

    try {
      const arrayBuffer = await file.arrayBuffer()
      const buffer = Buffer.from(arrayBuffer)
      await this.writeFile(filePath, buffer)
      return filePath
    } catch (error) {
      throw new FileHandlerError(
        `Failed to save file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'SAVE_FAILED'
      )
    }
  }

  async deleteFromTemp(filePath: string): Promise<void> {
    // Security check: only allow deleting from temp directory
    const normalizedPath = path.normalize(filePath)
    if (!normalizedPath.startsWith(TEMP_DIR)) {
      throw new FileHandlerError(
        'Security error: Cannot delete files outside temp directory',
        'SECURITY_ERROR'
      )
    }

    try {
      await this.unlink(filePath)
    } catch (error) {
      // Ignore "file not found" errors
      if (error instanceof Error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
        return
      }
      throw new FileHandlerError(
        `Failed to delete file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'DELETE_FAILED'
      )
    }
  }

  async withTempFile<T>(
    file: File,
    operation: (filePath: string) => Promise<T>
  ): Promise<T> {
    const filePath = await this.saveToTemp(file)

    try {
      return await operation(filePath)
    } finally {
      await this.deleteFromTemp(filePath).catch(() => {
        // Log but don't throw - cleanup failure shouldn't fail the operation
      })
    }
  }

  getFileExtension(filename: string): string {
    if (!filename || !filename.includes('.')) {
      return '.mp4'
    }
    const ext = path.extname(filename)
    return ext || '.mp4'
  }
}

export const fileHandler = new FileHandler()
