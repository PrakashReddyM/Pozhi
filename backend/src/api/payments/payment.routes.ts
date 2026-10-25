import { Router } from 'express';
import express from 'express';
import * as PaymentController from './payment.controller';
import * as WebhookController from './webhook.controller';
import { createRateLimiter } from '../../middleware/rateLimiter.middleware';
import { requireAuth } from '../../middleware/auth.middleware';
import { validate } from '../../middleware/validate';
import { createPaymentOrderSchema, verifyPaymentSchema } from './payment.validation';

const router = Router();

const paymentLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: 'Too many payment attempts',
  keyGenerator: (req) => req.user?.id || req.ip as string,
});

// Create Razorpay order
router.post(
  '/create-intent',
  requireAuth,
  paymentLimiter,
  validate(createPaymentOrderSchema),
  PaymentController.createPaymentIntent,
);

// Verify payment signature and mark order paid
router.post(
  '/verify',
  requireAuth,
  paymentLimiter,
  validate(verifyPaymentSchema),
  PaymentController.verifyPayment,
);

// Razorpay webhook (raw body)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  WebhookController.handleRazorpayWebhook,
);

export default router;
