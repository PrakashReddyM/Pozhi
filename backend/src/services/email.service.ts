// ==========================================
// EMAIL SERVICE - MULTI-PROVIDER SUPPORT
// ==========================================
// Supports: Resend (API) and SMTP (Gmail/Outlook/etc.)
// ==========================================

import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';
import { env } from '../config/env';

// 1. Initialize Resend
const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

// 2. Initialize SMTP (Nodemailer)
const smtpTransporter = (env.SMTP_USER && env.SMTP_PASS) 
  ? nodemailer.createTransport({
      host: env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(env.SMTP_PORT || '587'),
      secure: env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: env.SMTP_USER,
        pass: env.SMTP_PASS, // Use App Password for Gmail
      },
    })
  : null;

const FROM_EMAIL = env.EMAIL_FROM || 'onboarding@resend.dev';
const FROM_NAME = 'Pozhi Studio';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export const emailService = {
  /**
   * Send an email using the configured provider
   */
  async sendEmail({ to, subject, html }: EmailOptions): Promise<boolean> {
    try {
      // SMART PROVIDER SELECTION
      const provider = env.EMAIL_PROVIDER;

      // PROVIDER: MOCK
      if (provider === 'mock') {
        logger.info('???? [MOCK MODE] Email captured:', { to, subject });
        return true;
      }

      // PROVIDER: SMTP (Recommended for Gmail)
      if (provider === 'smtp' && smtpTransporter) {
        logger.info(`Attempting to send SMTP email to ${to}`);
        await smtpTransporter.sendMail({
          from: `\"\${FROM_NAME}\" <\${env.EMAIL_FROM}>`,
          to,
          subject,
          html,
        });
        logger.info(`SMTP Email sent successfully to ${to}`);
        return true;
      }

      // PROVIDER: RESEND (Default/Fallback)
      if (provider === 'resend' && resend) {
        logger.info(`Attempting to send Resend email to ${to}`);
        const { data, error } = await resend.emails.send({
          from: `${FROM_NAME} <${FROM_EMAIL}>`,
          to,
          subject,
          html,
        });

        if (error) {
          logger.error('Resend API Error Detail:', error);
          return false;
        }

        logger.info(`Resend Email sent successfully to ${to}`, { id: data?.id });
        return true;
      }

      // NO PROVIDER CONFIGURED
      logger.warn('?????? No email provider configured or credentials missing. Check .env');
      logger.info('???? [FALLBACK MOCK] Email content:', { to, subject });
      return true;

    } catch (error: any) {
      logger.error('Email Service Failed Critically', { 
        error: error.message,
        stack: error.stack,
        to 
      });
      return false;
    }
  },

  /**
   * Send Order Confirmation
   */
  async sendOrderConfirmation(email: string, orderNumber: string, amount: number) {
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #eee; padding: 20px; border-radius: 10px;">
        <h2 style="color: #333;">???? Order Confirmed!</h2>
        <p>Thank you for choosing <strong>Pozhi Studio</strong>. Your order has been placed successfully.</p>
        
        <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 5px 0;"><strong>Order ID:</strong> ${orderNumber}</p>
          <p style="margin: 5px 0;"><strong>Total Amount:</strong> ???${amount}</p>
          <p style="margin: 5px 0;"><strong>Status:</strong> Pending Confirmation</p>
        </div>

        <p>We will review your order details and contact you on WhatsApp shortly for any clarifications.</p>
        
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
        <p style="font-size: 12px; color: #888;">This is an automated message. Please do not reply to this email.</p>
      </div>
    `;
    return this.sendEmail({ to: email, subject: `Order Confirmation: ${orderNumber}`, html });
  },

  /**
   * Send Welcome Email
   */
  async sendWelcomeEmail(email: string, name: string) {
    const html = `<h1>Welcome to Pozhi Studio, ${name}!</h1><p>We are excited to have you.</p>`;
    return this.sendEmail({ to: email, subject: 'Welcome to Pozhi Studio!', html });
  },

  /**
   * Send Password Reset
   */
  async sendPasswordReset(email: string, resetToken: string) {
    const resetLink = `${env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const html = `<h1>Reset Your Password</h1><p>Click <a href="${resetLink}">here</a> to reset your password.</p>`;
    return this.sendEmail({ to: email, subject: 'Password Reset Request', html });
  }
};
