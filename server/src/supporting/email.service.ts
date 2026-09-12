import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter | null = null;

  private getTransporter(): nodemailer.Transporter | null {
    if (this.transporter) return this.transporter;

    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (!host || !user || !pass) {
      this.logger.warn('SMTP not configured — email sending is disabled. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.');
      return null;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });

    return this.transporter;
  }

  async sendPasswordReset(toEmail: string, toName: string, resetUrl: string): Promise<void> {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@rentease.qa';
    const transporter = this.getTransporter();

    if (!transporter) {
      // Log the reset URL to the server console if SMTP is not configured (dev/test only)
      this.logger.warn(`[DEV] Password reset link for ${toEmail}: ${resetUrl}`);
      return;
    }

    try {
      await transporter.sendMail({
        from: `"RentEase" <${from}>`,
        to: toEmail,
        subject: 'Reset your RentEase password',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 32px;">
            <h2 style="color: #5c1d1d; margin-bottom: 8px;">Password Reset Request</h2>
            <p style="color: #333;">Hello ${toName},</p>
            <p style="color: #333;">
              We received a request to reset your RentEase account password. Click the button below to set a new password.
              This link expires in <strong>1 hour</strong>.
            </p>
            <a
              href="${resetUrl}"
              style="display:inline-block;margin:24px 0;padding:12px 28px;background:#5c1d1d;color:#fff;border-radius:6px;text-decoration:none;font-weight:600;"
            >
              Reset Password
            </a>
            <p style="color: #666; font-size: 12px;">
              If you didn't request this, you can safely ignore this email. Your password will not be changed.
            </p>
            <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
            <p style="color: #999; font-size: 11px;">
              RentEase — Qatar Property &amp; Tenant Management SaaS<br/>
              This is an automated message, please do not reply.
            </p>
          </div>
        `,
        text: `Hello ${toName},\n\nReset your RentEase password here: ${resetUrl}\n\nThis link expires in 1 hour.\n\nIf you didn't request this, ignore this email.`,
      });
      this.logger.log(`Password reset email sent to ${toEmail}`);
    } catch (err) {
      this.logger.error(`Failed to send password reset email to ${toEmail}: ${(err as Error).message}`);
      // Don't throw — the token is already saved; user can retry. Log for ops team.
    }
  }
}
