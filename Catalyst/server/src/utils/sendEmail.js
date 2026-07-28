import nodemailer from 'nodemailer'

export async function sendResetPasswordEmail({ to, token }) {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173'
  const resetUrl = `${clientUrl}/reset-password/${token}`

  const service = process.env.SMTP_SERVICE // e.g. 'gmail'
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.EMAIL_FROM || '"Team Catalyst" <no-reply@catalyst.ai>'

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

  // Development Fallback: If SMTP environment variables are not provided, log reset URL cleanly
  if ((!host && !service) || !user || !pass) {
    console.log(`\n==================================================`)
    console.log(`[DEV MODE: REAL SMTP NOT CONFIGURED IN SERVER .ENV]`)
    console.log(`To send real emails to Gmail, add SMTP_USER & SMTP_PASS (or App Password) in server/.env`)
    console.log(`--------------------------------------------------`)
    console.log(`From: ${from}`)
    console.log(`To: ${to}`)
    console.log(`Reset URL: ${resetUrl}`)
    console.log(`==================================================\n`)
    return { success: true, simulated: true }
  }

  const transportOpts = service
    ? { service, auth: { user, pass } }
    : { host, port, secure: port === 465, auth: { user, pass } }

  const transporter = nodemailer.createTransport(transportOpts)

  await transporter.sendMail({
    from,
    to,
    subject: 'Reset your Catalyst password',
    text: textContent,
    html: htmlContent
  })

  return { success: true }
}
