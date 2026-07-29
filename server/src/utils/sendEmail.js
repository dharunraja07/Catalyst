import nodemailer from 'nodemailer'

let transporterCache = null

function getTransporter() {
  if (transporterCache) return transporterCache

  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
  const secure = process.env.SMTP_SECURE === 'true' // false for port 587 (STARTTLS), true for port 465 (SSL)

  if (!user || !pass) return null

  transporterCache = nodemailer.createTransport({
    host,
    port,
    secure,
    pool: true,
    maxConnections: 3,
    maxMessages: 100,
    auth: { user, pass },
    connectionTimeout: 8000, // 8 seconds connection timeout instead of hanging 30s
    greetingTimeout: 5000,
    socketTimeout: 10000,
    tls: {
      rejectUnauthorized: false
    }
  })

  return transporterCache
}

export async function sendResetPasswordEmail({ to, token }) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  const resetUrl = `${clientUrl}/reset-password/${token}`
  const from = process.env.EMAIL_FROM || '"Team Catalyst" <catalyst.team.ai@gmail.com>'

  const textContent = `Hello,\n\nYou requested a password reset.\n\nClick the link below:\n${resetUrl}\n\nThis link expires in 15 minutes.\n\nIf you didn't request this, ignore this email.\n\nTeam Catalyst`

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #e8e8e8; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #1F2937; margin-bottom: 16px;">Reset your Catalyst password</h2>
      <p style="color: #4B5563; font-size: 14px; line-height: 1.5;">Hello,</p>
      <p style="color: #4B5563; font-size: 14px; line-height: 1.5;">You requested a password reset. Click the button below to set a new password:</p>
      <div style="margin: 24px 0; text-align: center;">
        <a href="${resetUrl}" style="background-color: #E6B325; color: #000000; padding: 12px 24px; font-weight: bold; font-size: 14px; border-radius: 12px; text-decoration: none; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #6B7280; font-size: 12px; line-height: 1.5;">Or copy and paste this link in your browser:</p>
      <p style="color: #3B82F6; font-size: 12px; word-break: break-all;">${resetUrl}</p>
      <p style="color: #9CA3AF; font-size: 12px; margin-top: 24px; border-top: 1px solid #F3F4F6; padding-top: 12px;">This link expires in 15 minutes. If you didn't request this, ignore this email.<br/><br/><strong>Team Catalyst</strong></p>
    </div>
  `

  const transporter = getTransporter()

  if (!transporter) {
    console.log(`\n==================================================`)
    console.log(`[SMTP CONFIGURATION MISSING IN SERVER .ENV]`)
    console.log(`To: ${to}`)
    console.log(`Reset URL: ${resetUrl}`)
    console.log(`==================================================\n`)
    return { success: true, simulated: true }
  }

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      await transporter.sendMail({
        from,
        to,
        subject: 'Reset your Catalyst password',
        text: textContent,
        html: htmlContent
      })
      console.log(`[EMAIL SENT] Password reset email successfully sent to ${to}`)
      return { success: true }
    } catch (error) {
      if (attempt === 1) {
        console.warn(`[EMAIL RETRY] Attempt 1 failed sending to ${to}: ${error.message}. Retrying in 1.5s...`)
        await new Promise((r) => setTimeout(r, 1500))
        continue
      }
      console.error(`[EMAIL ERROR] Failed sending to ${to}: ${error.message}`)
      console.log(`\n==================================================`)
      console.log(`[PASSWORD RESET LINK FALLBACK]`)
      console.log(`To: ${to}`)
      console.log(`Reset URL: ${resetUrl}`)
      console.log(`==================================================\n`)
      return { success: false, error: error.message, resetUrl }
    }
  }
}
