import { Resend } from 'resend'

function getEnvVar(key: string, fallback: string): string {
  return process.env[key] ?? fallback
}

interface ResendClient {
  emails: {
    send: (params: {
      from: string
      to: string
      subject: string
      html: string
    }) => Promise<{ data: { id: string } | null; error: { message: string } | null }>
  }
}

interface SendInvitationParams {
  to: string
  doctorName: string
  inviteToken: string
}

interface SendResult {
  success: boolean
  error?: string
}

export class EmailService {
  private resend: ResendClient
  private fromEmail: string
  private baseUrl: string

  constructor(resendClient?: ResendClient) {
    this.resend = resendClient || new Resend(getEnvVar('RESEND_API_KEY', ''))
    this.fromEmail = getEnvVar('EMAIL_FROM', 'Affect <noreply@affect.health>')
    this.baseUrl = getEnvVar('NEXT_PUBLIC_APP_URL', 'http://localhost:3000')
  }

  async sendInvitationEmail(params: SendInvitationParams): Promise<SendResult> {
    const { to, doctorName, inviteToken } = params
    const signupUrl = `${this.baseUrl}/signup/patient?token=${inviteToken}`

    const html = this.buildInvitationEmailHtml({
      doctorName,
      signupUrl,
    })

    const { error } = await this.resend.emails.send({
      from: this.fromEmail,
      to,
      subject: `${doctorName} has invited you to Affect`,
      html,
    })

    if (error) {
      return { success: false, error: error.message }
    }

    return { success: true }
  }

  private buildInvitationEmailHtml(params: {
    doctorName: string
    signupUrl: string
  }): string {
    const { doctorName, signupUrl } = params

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invitation to Affect</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin: 0;">Affect</h1>
    <p style="color: #64748b; margin: 5px 0 0;">Mental Health Monitoring</p>
  </div>

  <div style="background: #f8fafc; border-radius: 8px; padding: 30px; margin-bottom: 20px;">
    <h2 style="margin-top: 0; color: #1e293b;">You've been invited!</h2>
    <p><strong>${doctorName}</strong> has invited you to join Affect for your mental health monitoring.</p>
    <p>Affect allows you to record daily check-ins that help your doctor track your wellbeing over time. Your privacy is our priority - videos are analyzed and immediately deleted.</p>
  </div>

  <div style="text-align: center; margin: 30px 0;">
    <a href="${signupUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600;">
      Accept Invitation
    </a>
  </div>

  <p style="color: #64748b; font-size: 14px; text-align: center;">
    This invitation expires in 7 days.<br>
    If you didn't expect this email, you can safely ignore it.
  </p>

  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">

  <p style="color: #94a3b8; font-size: 12px; text-align: center;">
    Affect - Privacy-First Mental Health Monitoring<br>
    <a href="${signupUrl}" style="color: #64748b;">${signupUrl}</a>
  </p>
</body>
</html>
    `.trim()
  }
}

let _emailService: EmailService | null = null

export function getEmailService(): EmailService {
  if (!_emailService) {
    _emailService = new EmailService()
  }
  return _emailService
}
