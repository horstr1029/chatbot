import nodemailer from 'nodemailer'
import { getSmtpSettings } from '@/lib/settings/systemSettings'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
}

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
  const from = s.from || `"MST Chatbot" <${s.user}>`
  const displayName = escapeHtml(name ?? to)
  const { sessionCount, thumbsUp, thumbsDown, questions } = stats
  const total = thumbsUp + thumbsDown
  const pct = total > 0 ? Math.round((thumbsUp / total) * 100) : null
  const questionRows = questions.length
    ? questions.map((q) => `<li style="margin:0 0 6px;font-size:13px;color:#4b5563;">${escapeHtml(q)}</li>`).join('')
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
  const from = s.from || `"MST Chatbot" <${s.user}>`
  const displayName = escapeHtml(name ?? to)
  const count = sources.length

  const rows = sources
    .map(
      (src) =>
        `<tr>
          <td style="padding:8px 12px;font-size:13px;color:#111827;border-bottom:1px solid #e5e7eb;">${escapeHtml(src.name)}</td>
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

export async function sendPasswordResetEmail(to: string, name: string | null, token: string) {
  const s = await getSmtpSettings()
  if (!s.host || !s.user) {
    process.stderr.write(`[email] SMTP not configured — skipping password reset email to ${to}\n`)
    return
  }

  const transport = await createTransport()
  const from = s.from || `"MST Chatbot" <${s.user}>`
  const displayName = escapeHtml(name ?? to)
  const resetUrl = `${APP_URL}/reset-password/${token}`

  await transport.sendMail({
    from,
    to,
    subject: 'MST Chatbot — password reset request',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:'DM Sans',Arial,sans-serif;background:#f9fafb;margin:0;padding:32px;">
        <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:36px;">
          <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Reset your password</h2>
          <p style="margin:0 0 24px;font-size:14px;color:#4b5563;line-height:1.6;">
            Hi ${displayName}, we received a request to reset your password. Click the button below — the link expires in 1 hour.
          </p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none;">Reset password</a>
          <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
            If you didn't request this, you can safely ignore this email. Your password won't change.
          </p>
          <p style="margin:12px 0 0;font-size:11px;color:#d1d5db;word-break:break-all;">
            ${resetUrl}
          </p>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${displayName},\n\nReset your MST Chatbot password here:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.`,
  })
}

export async function sendWorkflowReminderEmail(
  admins: { email: string; name: string | null }[],
  deptName: string,
  workflowRequestId: string,
  description: string,
) {
  const s = await getSmtpSettings()
  if (!s.host || !s.user) return

  const transport = await createTransport()
  const from = s.from || `"MST Chatbot" <${s.user}>`
  const shortDesc = escapeHtml(description.slice(0, 120))

  for (const admin of admins) {
    const adminName = escapeHtml(admin.name ?? admin.email)
    await transport.sendMail({
      from,
      to: admin.email,
      subject: `${deptName} — workflow request pending for 48 hours`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family:'DM Sans',Arial,sans-serif;background:#f9fafb;margin:0;padding:32px;">
          <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:36px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">${deptName}</p>
            <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Workflow approval needed</h2>
            <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.6;">
              Hi ${adminName}, a workflow request has been waiting for your approval for more than 48 hours.
            </p>
            <div style="background:#fffbeb;border:1px solid #fde68a;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#d97706;text-transform:uppercase;letter-spacing:.05em;">Request</p>
              <p style="margin:0;font-size:13px;color:#111827;">${shortDesc}</p>
            </div>
            <a href="${APP_URL}/admin/workflows" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none;">Review request</a>
          </div>
        </body>
        </html>
      `,
      text: `${deptName} — workflow approval needed\n\nHi ${admin.name ?? admin.email},\n\nA workflow request has been pending for 48+ hours:\n\n"${shortDesc}"\n\nReview it here: ${APP_URL}/admin/workflows`,
    })
  }
}

export async function sendWorkflowApprovalRequestEmail(
  admins: { email: string; name: string | null }[],
  deptName: string,
  requestedByName: string,
  description: string,
  stepLabel?: string,
) {
  const s = await getSmtpSettings()
  if (!s.host || !s.user) return

  const transport = await createTransport()
  const from = s.from || `"MST Chatbot" <${s.user}>`
  const shortDesc = escapeHtml(description.slice(0, 160))
  const stepLine = stepLabel ? ` (step: <strong>${escapeHtml(stepLabel)}</strong>)` : ''

  for (const admin of admins) {
    const adminName = escapeHtml(admin.name ?? admin.email)
    await transport.sendMail({
      from,
      to: admin.email,
      subject: `${deptName} — workflow approval needed`,
      html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family:'DM Sans',Arial,sans-serif;background:#f9fafb;margin:0;padding:32px;">
          <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:36px;">
            <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">${escapeHtml(deptName)}</p>
            <h2 style="margin:0 0 8px;font-size:18px;color:#111827;">Workflow approval needed</h2>
            <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.6;">
              Hi ${adminName}, <strong>${escapeHtml(requestedByName)}</strong> has submitted a workflow request that requires your approval${stepLine}.
            </p>
            <div style="background:#eff6ff;border:1px solid #dbeafe;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
              <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#2563eb;text-transform:uppercase;letter-spacing:.05em;">Request</p>
              <p style="margin:0;font-size:13px;color:#111827;">${shortDesc}</p>
            </div>
            <a href="${APP_URL}/admin/workflows" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none;">Review &amp; approve</a>
            <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;">
              Log in to the admin panel to approve or reject this request.
            </p>
          </div>
        </body>
        </html>
      `,
      text: `${deptName} — workflow approval needed\n\nHi ${admin.name ?? admin.email},\n\n${requestedByName} has submitted a workflow request${stepLabel ? ` (step: ${stepLabel})` : ''}:\n\n"${description.slice(0, 160)}"\n\nReview it here: ${APP_URL}/admin/workflows`,
    })
  }
}

export async function sendLeaveApprovalEmail(
  to: string,
  name: string | null,
  leaveType: string,
  startDate: Date,
  endDate: Date,
  daysTaken: number,
  daysRemaining: number,
) {
  const s = await getSmtpSettings()
  if (!s.host || !s.user) return

  const transport = await createTransport()
  const from = s.from || `"MST Chatbot" <${s.user}>`
  const displayName = escapeHtml(name ?? to)
  const fmt = (d: Date) => d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  const balanceColor = daysRemaining < 0 ? '#dc2626' : '#16a34a'

  await transport.sendMail({
    from,
    to,
    subject: 'Leave request approved',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:'DM Sans',Arial,sans-serif;background:#f9fafb;margin:0;padding:32px;">
        <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:36px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
            <div style="width:32px;height:32px;background:#f0fdf4;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:16px;">✅</span>
            </div>
            <h2 style="margin:0;font-size:18px;color:#111827;">Leave approved</h2>
          </div>
          <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.6;">
            Hi ${displayName}, your leave request has been approved.
          </p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">Leave type</p>
                <p style="margin:0;font-size:13px;color:#111827;font-weight:500;">${escapeHtml(leaveType)}</p>
              </div>
              <div>
                <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">Days taken</p>
                <p style="margin:0;font-size:13px;color:#111827;font-weight:500;">${daysTaken} day${daysTaken !== 1 ? 's' : ''}</p>
              </div>
              <div>
                <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">From</p>
                <p style="margin:0;font-size:13px;color:#111827;">${fmt(startDate)}</p>
              </div>
              <div>
                <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">To</p>
                <p style="margin:0;font-size:13px;color:#111827;">${fmt(endDate)}</p>
              </div>
            </div>
            <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb;">
              <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">Remaining balance</p>
              <p style="margin:0;font-size:16px;font-weight:700;color:${balanceColor};">${daysRemaining.toFixed(1)} day${Math.abs(daysRemaining) !== 1 ? 's' : ''}</p>
            </div>
          </div>
          <a href="${APP_URL}/chat" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none;">Back to chat</a>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${displayName},\n\nYour leave request has been approved.\n\nLeave type: ${leaveType}\nFrom: ${fmt(startDate)}\nTo: ${fmt(endDate)}\nDays taken: ${daysTaken}\nRemaining balance: ${daysRemaining.toFixed(1)} days`,
  })
}

export async function sendLeaveRejectionEmail(
  to: string,
  name: string | null,
  leaveType: string,
  startDate: Date,
  endDate: Date,
  reason: string,
) {
  const s = await getSmtpSettings()
  if (!s.host || !s.user) return

  const transport = await createTransport()
  const from = s.from || `"MST Chatbot" <${s.user}>`
  const displayName = escapeHtml(name ?? to)
  const fmt = (d: Date) => d.toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })

  await transport.sendMail({
    from,
    to,
    subject: 'Leave request not approved',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="font-family:'DM Sans',Arial,sans-serif;background:#f9fafb;margin:0;padding:32px;">
        <div style="max-width:480px;margin:0 auto;background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:36px;">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px;">
            <div style="width:32px;height:32px;background:#fef2f2;border-radius:8px;display:flex;align-items:center;justify-content:center;">
              <span style="font-size:16px;">❌</span>
            </div>
            <h2 style="margin:0;font-size:18px;color:#111827;">Leave not approved</h2>
          </div>
          <p style="margin:0 0 20px;font-size:14px;color:#4b5563;line-height:1.6;">
            Hi ${displayName}, unfortunately your leave request was not approved.
          </p>
          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:6px;padding:16px 20px;margin-bottom:16px;">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
              <div>
                <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">Leave type</p>
                <p style="margin:0;font-size:13px;color:#111827;font-weight:500;">${escapeHtml(leaveType)}</p>
              </div>
              <div>
                <p style="margin:0 0 2px;font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;">Dates</p>
                <p style="margin:0;font-size:13px;color:#111827;">${fmt(startDate)} – ${fmt(endDate)}</p>
              </div>
            </div>
          </div>
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:6px;padding:14px 16px;margin-bottom:24px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:600;color:#dc2626;text-transform:uppercase;letter-spacing:.05em;">Reason</p>
            <p style="margin:0;font-size:13px;color:#111827;">${escapeHtml(reason)}</p>
          </div>
          <a href="${APP_URL}/chat" style="display:inline-block;padding:10px 20px;background:#111827;color:#ffffff;border-radius:6px;font-size:13px;font-weight:500;text-decoration:none;">Back to chat</a>
        </div>
      </body>
      </html>
    `,
    text: `Hi ${displayName},\n\nYour leave request was not approved.\n\nLeave type: ${leaveType}\nDates: ${fmt(startDate)} – ${fmt(endDate)}\n\nReason: ${reason}`,
  })
}

export async function sendWelcomeEmail(to: string, name: string | null, tempPassword: string) {
  const s = await getSmtpSettings()
  if (!s.host || !s.user) {
    process.stderr.write(`[email] SMTP not configured — skipping welcome email to ${to}\n`)
    return
  }

  const transport = await createTransport()
  const from = s.from || `"MST Chatbot" <${s.user}>`
  const displayName = escapeHtml(name ?? to)

  await transport.sendMail({
    from,
    to,
    subject: 'Welcome to MST Chatbot — your account is ready',
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
