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

export async function sendDigestEmail(
  to: string,
  name: string | null,
  deptName: string,
  stats: { sessionCount: number; thumbsUp: number; thumbsDown: number; questions: string[] },
) {
  const s = await getSmtpSettings()
  if (!s.host || !s.user) return

  const transport = await createTransport()
  const from = s.from || `"Company Chatbot" <${s.user}>`
  const displayName = name ?? to
  const { sessionCount, thumbsUp, thumbsDown, questions } = stats
  const total = thumbsUp + thumbsDown
  const pct = total > 0 ? Math.round((thumbsUp / total) * 100) : null
  const questionRows = questions.length
    ? questions.map((q) => `<li style="margin:0 0 6px;font-size:13px;color:#4b5563;">${q}</li>`).join('')
    : '<li style="font-size:13px;color:#9ca3af;">No questions this week</li>'

  await transport.sendMail({
    from,
    to,
    subject: `${deptName} weekly digest — ${new Date().toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:'DM Sans',Arial,sans-serif;background:#f9fafb;margin:0;padding:32px;">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:36px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">${deptName}</p>
          <h2 style="margin:0 0 20px;font-size:18px;color:#111827;">Weekly digest</h2>

          <div style="display:flex;gap:12px;margin-bottom:24px;">
            <div style="flex:1;background:#f3f4f6;border-radius:8px;padding:16px;">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Conversations</p>
              <p style="margin:0;font-size:22px;font-weight:600;color:#111827;">${sessionCount}</p>
            </div>
            <div style="flex:1;background:#f0fdf4;border-radius:8px;padding:16px;">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Thumbs up</p>
              <p style="margin:0;font-size:22px;font-weight:600;color:#16a34a;">${thumbsUp}</p>
            </div>
            <div style="flex:1;background:#fef2f2;border-radius:8px;padding:16px;">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;">Thumbs down</p>
              <p style="margin:0;font-size:22px;font-weight:600;color:#dc2626;">${thumbsDown}</p>
            </div>
          </div>

          ${pct !== null ? `<p style="margin:0 0 20px;font-size:13px;color:#4b5563;">Satisfaction rate: <strong>${pct}%</strong></p>` : ''}

          <p style="margin:0 0 10px;font-size:13px;font-weight:600;color:#111827;">This week's top questions</p>
          <ul style="margin:0 0 24px;padding-left:20px;">${questionRows}</ul>

          <a href="${APP_URL}/admin" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none;">Open admin panel</a>

          <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
            Hi ${displayName}, this digest covers the last 7 days for the ${deptName} department.
          </p>
        </div>
      </body>
      </html>
    `,
    text: `${deptName} weekly digest\n\nConversations: ${sessionCount}\nThumbs up: ${thumbsUp}\nThumbs down: ${thumbsDown}${pct !== null ? `\nSatisfaction: ${pct}%` : ''}\n\nTop questions:\n${questions.map((q, i) => `${i + 1}. ${q}`).join('\n') || 'None this week'}\n\n${APP_URL}/admin`,
  })
}

export async function sendExpiryAlert(
  to: string,
  name: string | null,
  deptName: string,
  sources: { name: string; expiresAt: Date }[],
) {
  const s = await getSmtpSettings()
  if (!s.host || !s.user) return

  const transport = await createTransport()
  const from = s.from || `"Company Chatbot" <${s.user}>`
  const displayName = name ?? to
  const count = sources.length

  const rows = sources
    .map(
      (src) =>
        `<tr>
          <td style="padding:8px 12px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb;">${src.name}</td>
          <td style="padding:8px 12px;font-size:13px;color:#d97706;border-bottom:1px solid #e5e7eb;white-space:nowrap;">${new Date(src.expiresAt).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
        </tr>`,
    )
    .join('')

  await transport.sendMail({
    from,
    to,
    subject: `${deptName} — ${count} document${count === 1 ? '' : 's'} expiring soon`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:'DM Sans',Arial,sans-serif;background:#f9fafb;margin:0;padding:32px;">
        <div style="max-width:520px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:36px;">
          <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">${deptName}</p>
          <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Document expiry alert</h2>
          <p style="margin:0 0 20px;font-size:13px;color:#4b5563;">
            Hi ${displayName}, the following ${count === 1 ? 'document expires' : `${count} documents expire`} within the next 30 days. Please review and update them.
          </p>

          <table style="width:100%;border-collapse:collapse;border:1px solid #e5e7eb;border-radius:6px;overflow:hidden;margin-bottom:24px;">
            <thead>
              <tr style="background:#f9fafb;">
                <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb;">Document</th>
                <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;border-bottom:1px solid #e5e7eb;">Expires</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>

          <a href="${APP_URL}/admin/documents" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none;">Manage documents</a>
        </div>
      </body>
      </html>
    `,
    text: `${deptName} — document expiry alert\n\nHi ${displayName},\n\nThe following documents expire within 30 days:\n\n${sources.map((s) => `- ${s.name}: ${new Date(s.expiresAt).toLocaleDateString()}`).join('\n')}\n\n${APP_URL}/admin/documents`,
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
