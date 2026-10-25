import { Request, Response } from 'express';
import { verifyWebhookSignature, handlePaymentSuccess } from '../../services/payment.service';
import { logger } from '../../utils/logger';

export async function handleRazorpayWebhook(req: Request, res: Response) {
  const signature = req.headers['x-razorpay-signature'] as string;

  if (!signature) {
    return res.status(400).json({ error: 'Missing signature' });
  }

  const rawBody = req.body as Buffer;
  const isValid = verifyWebhookSignature(rawBody, signature);

  if (!isValid) {
    logger.warn('Invalid Razorpay webhook signature');
    return res.status(400).json({ error: 'Invalid signature' });
  }

  let payload: any;
  try {
    payload = JSON.parse(rawBody.toString());
  } catch {
    return res.status(400).json({ error: 'Invalid JSON' });
  }

  const event = payload.event;
  logger.info('Razorpay webhook received', { event });

  if (event === 'payment.captured') {
    const payment = payload.payload?.payment?.entity;
    const orderId = payment?.notes?.orderId;

    if (orderId && payment?.id) {
      try {
        await handlePaymentSuccess(orderId, payment.id);
        logger.info('Webhook: payment captured', { orderId, paymentId: payment.id });
      } catch (err: any) {
        logger.error('Webhook: failed to update order', { error: err.message });
      }
    }
  }

  res.status(200).json({ status: 'ok' });
}

// Legacy Stripe handler export to avoid breaking any stale imports
export const handleStripeWebhook = handleRazorpayWebhook;
