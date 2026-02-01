import { describe, it, expect, vi, beforeEach } from 'vitest'
import { EmailService } from './email.service'

describe('EmailService', () => {
  let service: EmailService
  let mockResend: { emails: { send: ReturnType<typeof vi.fn> } }

  beforeEach(() => {
    vi.clearAllMocks()
    mockResend = {
      emails: {
        send: vi.fn().mockResolvedValue({ data: { id: 'email-123' }, error: null }),
      },
    }
    service = new EmailService(mockResend as any)
  })

  describe('sendInvitationEmail', () => {
    it('should send invitation email with correct data', async () => {
      const params = {
        to: 'patient@example.com',
        doctorName: 'Dr. Smith',
        inviteToken: 'token-123',
      }

      const result = await service.sendInvitationEmail(params)

      expect(mockResend.emails.send).toHaveBeenCalledWith({
        from: expect.stringContaining('Affect'),
        to: params.to,
        subject: expect.stringContaining('Dr. Smith'),
        html: expect.stringContaining('token-123'),
      })
      expect(result.success).toBe(true)
    })

    it('should return error when email fails', async () => {
      mockResend.emails.send.mockResolvedValue({
        data: null,
        error: { message: 'Invalid recipient' },
      })

      const result = await service.sendInvitationEmail({
        to: 'invalid-email',
        doctorName: 'Dr. Smith',
        inviteToken: 'token-123',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Invalid recipient')
    })

    it('should include signup link with token', async () => {
      await service.sendInvitationEmail({
        to: 'patient@example.com',
        doctorName: 'Dr. Smith',
        inviteToken: 'my-special-token',
      })

      expect(mockResend.emails.send).toHaveBeenCalledWith(
        expect.objectContaining({
          html: expect.stringContaining('/signup/patient?token=my-special-token'),
        })
      )
    })
  })
})
