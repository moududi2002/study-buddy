// ============================================================
// Path: apps/api/src/mail/mail.service.ts
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { renderOtpEmail } from './templates';

export type OtpPurpose = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;
  private fromName: string;
  private fromEmail: string;
  private devMode: boolean;

  constructor(private readonly config: ConfigService) {
    this.fromName = this.config.get<string>('SMTP_FROM_NAME', 'Study Buddy');
    this.fromEmail = this.config.get<string>('SMTP_FROM_EMAIL', 'no-reply@studybuddy.local');

    const user = this.config.get<string>('SMTP_USER');
    const pass = this.config.get<string>('SMTP_PASS');

    // If SMTP creds are placeholders/missing, run in dev mode (log only)
    this.devMode =
      !user ||
      !pass ||
      user.includes('your-email') ||
      pass.includes('your-smtp');

    if (!this.devMode) {
      this.transporter = nodemailer.createTransport({
        host: this.config.get<string>('SMTP_HOST', 'smtp.hostinger.com'),
        port: this.config.get<number>('SMTP_PORT', 465),
        secure: this.config.get<string>('SMTP_SECURE', 'true') === 'true',
        auth: { user, pass },
      });
      this.logger.log(`📧 SMTP ready: ${this.config.get('SMTP_HOST')}`);
    } else {
      this.logger.warn('⚠️  SMTP not configured — running in DEV mode (OTP will be logged).');
    }
  }

  async sendOtp(params: {
    to: string;
    fullName: string;
    otp: string;
    purpose: OtpPurpose;
    expiryMinutes: number;
  }) {
    const { subject, html, text } = renderOtpEmail({
      fullName: params.fullName,
      otp: params.otp,
      purpose: params.purpose,
      expiryMinutes: params.expiryMinutes,
    });

    if (this.devMode) {
      this.logger.log(
        `\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
          `🐱 DEV MODE OTP\n` +
          `To:      ${params.to}\n` +
          `Name:    ${params.fullName}\n` +
          `Purpose: ${params.purpose}\n` +
          `OTP:     ${params.otp}\n` +
          `Expires: ${params.expiryMinutes} minutes\n` +
          `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
      );
      return { queued: true, dev: true };
    }

    await this.transporter!.sendMail({
      from: `"${this.fromName}" <${this.fromEmail}>`,
      to: params.to,
      subject,
      html,
      text,
    });

    this.logger.log(`📨 OTP email sent to ${params.to} (${params.purpose})`);
    return { queued: true, dev: false };
  }
}