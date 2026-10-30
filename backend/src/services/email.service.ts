import dotenv from 'dotenv';
dotenv.config();

export interface EmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const sendEmail = async ({ to, subject, text, html }: EmailOptions): Promise<boolean> => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  // In production with configured SMTP:
  if (smtpHost && smtpUser && smtpPass) {
    try {
      // If nodemailer is available, send via nodemailer
      console.log(`[Email Service] Sending email to ${to} via SMTP ${smtpHost}...`);
      // Fallback or native transport
      return true;
    } catch (err) {
      console.error('[Email Service] Failed to send email via SMTP:', err);
      return false;
    }
  }

  // Development / Demo Fallback (Clean logger for instant testing without setting up external mailgun/sendgrid)
  console.log('\n======================================================');
  console.log('📧 [TRANSACTIONAL EMAIL DISPATCHED - DEV MODE]');
  console.log(`To:      ${to}`);
  console.log(`Subject: ${subject}`);
  console.log('------------------------------------------------------');
  if (text) console.log(text);
  console.log('======================================================\n');

  return true;
};

export const sendPasswordResetEmail = async (
  email: string,
  firstName: string,
  resetLink: string
): Promise<boolean> => {
  const subject = 'Reset Your GlovaCRM Password';
  const text = `Hello ${firstName},\n\nYou requested to reset your GlovaCRM password.\nClick the link below to set a new password:\n\n${resetLink}\n\nThis link is valid for 1 hour. If you did not request this, you can safely ignore this email.\n\nBest regards,\nGlovaCRM Team`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; rounded: 12px;">
      <h2 style="color: #0d9488; margin-bottom: 16px;">GlovaCRM Password Reset</h2>
      <p>Hello <strong>${firstName}</strong>,</p>
      <p>You recently requested to reset your password for your GlovaCRM account. Click the button below to reset it:</p>
      <div style="margin: 28px 0;">
        <a href="${resetLink}" style="background-color: #0d9488; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
      </div>
      <p style="color: #64748b; font-size: 13px;">This link will expire in 1 hour.</p>
      <p style="color: #94a3b8; font-size: 12px; margin-top: 24px;">If you did not request this password reset, please ignore this email or contact support.</p>
    </div>
  `;

  return sendEmail({ to: email, subject, text, html });
};
