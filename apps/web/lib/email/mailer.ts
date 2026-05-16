import nodemailer from 'nodemailer'
import { getSmtpSettings } from '@/lib/settings/systemSettings'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

async function createTransport() {
  const s = await getSmtpSettings()
  return nodemailer.createTransport({
    host: s.host,
    port: Number(s.port),
    secure: s.secure === 'true',
    auth: s.user ? { user: s.user, pass: s.pass } : undefined,
  })
}

export async function sendWelcomeEmail(to: string, name: string | null, tempPassword: string) {
  const s = await getSmtpSettings()
  if (!s.host || !s.user) {
    process.stderr.write(`[email] SMTP not configured — skipping welcome email to ${to}\n`)
    return
  }

  const transport = await createTransport()
  const from = s.from || `"Company Chatbot" <${s.user}>`
  const displayName = name ?? to

  await transport.sendMail({
    from,
    to,
    subject: 'Welcome to Company Chatbot — your account is ready',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:'DM Sans',Arial,sans-serif;background:#f9fafb;margin:0;padding:32px;">
        <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:36px;">
          <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Welcome, ${displayName}</h2>
          <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6;">
            Your account has been created. Use the credentials below to log in — you'll be asked to set a new password on first login.
          </p>
          <div style="background:#f3f4f6;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">Login URL</p>
            <p style="margin:0 0 16px;font-size:13px;color:#2563eb;">${APP_URL}/login</p>
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">Email</p>
            <p style="margin:0 0 16px;font-size:13px;color:#111827;font-family:monospace;">${to}</p>
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">Temporary Password</p>
            <p style="margin:0;font-size:15px;color:#111827;font-family:monospace;font-weight:600;letter-spacing:.08em;">${tempPassword}</p>
          </div>
          <p style="margin:0;font-size:12px;color:#9ca3af;">
            If you did not expect this email, please ignore it.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `Welcome ${displayName},\n\nYour account has been created.\n\nLogin: ${APP_URL}/login\nEmail: ${to}\nTemporary password: ${tempPassword}\n\nYou will be asked to change your password on first login.`,
  })
}
