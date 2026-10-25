import { Request, Response, NextFunction } from 'express';
import { emailService } from '../../services/email.service';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';

export const subscribe = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const { email } = req.body as { email: string };

    const html = `
      <div style="font-family:sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#fff">
        <h2 style="color:#1d4ed8;margin:0 0 8px">Welcome to Pozhi Studio! 🎉</h2>
        <p style="color:#374151;margin:0 0 16px">
          You're now subscribed to our newsletter. We'll keep you in the loop about:
        </p>
        <ul style="color:#374151;padding-left:20px;margin:0 0 20px">
          <li>New services &amp; products</li>
          <li>Exclusive offers and discounts</li>
          <li>Photography tips &amp; inspiration</li>
        </ul>
        <a href="https://pozhi.in"
           style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600">
          Visit Pozhi Studio →
        </a>
        <p style="color:#9ca3af;font-size:12px;margin-top:24px">
          Pozhi Photography Studio, Hyderabad, India<br/>
          You received this because you subscribed at pozhi.in
        </p>
      </div>
    `;

    const sent = await emailService.sendEmail({
      to: email,
      subject: 'You\'re subscribed to Pozhi Newsletter ✉️',
      html,
    });

    if (!sent) {
      logger.warn('Newsletter confirmation email not sent', { email });
    }

    logger.info('Newsletter subscription', { email });

    res.status(200).json({
      status: 'success',
      message: 'Subscribed successfully! Check your inbox for a confirmation.',
    });
  } catch (error) {
    next(error);
  }
};
