// eslint-disable-next-line @typescript-eslint/no-require-imports
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '../db';
import { logger } from '../utils/logger';

function getRazorpayInstance(): Razorpay {
  if (!env.RAZORPAY_KEY_ID || !env.RAZORPAY_KEY_SECRET) {
    throw new Error('Razorpay credentials not configured');
  }
  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID,
    key_secret: env.RAZORPAY_KEY_SECRET,
  });
}

export interface CreatePaymentOrderResult {
  razorpayOrderId: string;
  amount: number;
  currency: string;
  keyId: string;
}

export async function createPaymentOrder(orderId: string, userId: string): Promise<CreatePaymentOrderResult> {
  // Scoped to the caller: without the user_id predicate any signed-in user
  // could start a payment against someone else's order.
  const [order] = await db
    .select({
      id: schema.orders.id,
      totalAmount: schema.orders.totalAmount,
      orderNumber: schema.orders.orderNumber,
      paymentStatus: schema.orders.paymentStatus
    })
    .from(schema.orders)
    .where(and(eq(schema.orders.id, orderId), eq(schema.orders.userId, userId)))
    .limit(1);

  if (!order) {
    throw new Error('Order not found');
  }
  if (order.paymentStatus === 'completed') {
    throw new Error('Order is already paid');
  }

  const razorpay = getRazorpayInstance();

  // numeric(10,2) arrives as a string from pg, so parse it rather than relying
  // on JavaScript coercing "179.00" * 100.
  const amountInPaise = Math.round(parseFloat(order.totalAmount) * 100);

  const rzpOrder = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: order.orderNumber,
    notes: {
      orderId,
      orderNumber: order.orderNumber,
    },
  });

  // Store razorpay order ID against our order. verifyPayment reads it back to
  // prove the payment belongs to this order.
  await db
    .update(schema.orders)
    .set({ upiTransactionId: rzpOrder.id })
    .where(eq(schema.orders.id, orderId));

  logger.info('Razorpay order created', { orderId, razorpayOrderId: rzpOrder.id });

  return {
    razorpayOrderId: rzpOrder.id,
    amount: amountInPaise,
    currency: 'INR',
    keyId: env.RAZORPAY_KEY_ID!,
  };
}

export function verifyPaymentSignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  razorpaySignature: string,
): boolean {
  if (!env.RAZORPAY_KEY_SECRET) throw new Error('Razorpay secret not configured');
  const body = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_KEY_SECRET)
    .update(body)
    .digest('hex');
  return expectedSignature === razorpaySignature;
}

export async function handlePaymentSuccess(
  orderId: string,
  razorpayPaymentId: string,
): Promise<void> {
  const updated = await db
    .update(schema.orders)
    .set({
      paymentStatus: 'completed',
      orderStatus: 'confirmed',
      paymentMethod: 'razorpay',
      // Overwrites the Razorpay order id stored above; preserved from the
      // pre-migration behaviour, and verifyPayment has already read it.
      upiTransactionId: razorpayPaymentId
      // updated_at maintained by trigger trg_orders_updated_at.
    })
    .where(eq(schema.orders.id, orderId))
    .returning({ id: schema.orders.id });

  // A silent no-op here would mean a paid order left marked pending.
  if (updated.length === 0) {
    logger.error('Failed to update order after payment: no such order', { orderId });
    throw new Error('Failed to update order status');
  }

  logger.info('Order payment confirmed', { orderId, razorpayPaymentId });
}

export function verifyWebhookSignature(rawBody: Buffer, signature: string): boolean {
  if (!env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expectedSignature = crypto
    .createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');
  return expectedSignature === signature;
}

// Stub for legacy order.service.ts references — not invoked in the active Razorpay flow
export const paymentService = {
  async createPaymentIntent(
    _amount: number,
    _currency?: string,
    _metadata?: Record<string, unknown>,
  ): Promise<{ paymentIntentId: string; clientSecret: string | null }> {
    throw new Error('Stripe not configured — use Razorpay');
  },
  async cancelPaymentIntent(_intentId: string): Promise<void> {
    throw new Error('Stripe not configured');
  },
  async createRefund(_intentId: string, _amount?: number, _reason?: string): Promise<void> {
    throw new Error('Stripe not configured');
  },
};
