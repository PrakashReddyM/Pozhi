import { z } from 'zod';

export const createPaymentOrderSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
});

export const verifyPaymentSchema = z.object({
  orderId: z.string().uuid('Invalid order ID'),
  razorpayOrderId: z.string().min(1, 'Razorpay order ID required'),
  razorpayPaymentId: z.string().min(1, 'Razorpay payment ID required'),
  razorpaySignature: z.string().min(1, 'Razorpay signature required'),
});

// Keep for backward compat — no longer used but may be imported elsewhere
export const createPaymentIntentSchema = createPaymentOrderSchema;
