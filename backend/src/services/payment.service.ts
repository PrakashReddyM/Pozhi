// eslint-disable-next-line @typescript-eslint/no-require-imports
import Razorpay from 'razorpay';
import crypto from 'crypto';
import { env } from '../config/env';
import { supabaseAdmin } from '../config/supabase';
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
  const { data: order, error } = await supabaseAdmin
    .from('orders')
    .select('id, total_amount, order_number, payment_status')
    .eq('id', orderId)
    .eq('user_id', userId)
    .single();

  if (error || !order) {
    throw new Error('Order not found');
  }
  if (order.payment_status === 'completed') {
    throw new Error('Order is already paid');
  }

  const razorpay = getRazorpayInstance();
  const amountInPaise = Math.round(order.total_amount * 100);

  const rzpOrder = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: order.order_number,
    notes: {
      orderId,
      orderNumber: order.order_number,
    },
  });

  // Store razorpay order ID against our order
  await supabaseAdmin
    .from('orders')
    .update({ upi_transaction_id: rzpOrder.id })
    .eq('id', orderId);

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
  const { error } = await supabaseAdmin
    .from('orders')
    .update({
      payment_status: 'completed',
      order_status: 'confirmed',
      payment_method: 'razorpay',
      upi_transaction_id: razorpayPaymentId,
    })
    .eq('id', orderId);

  if (error) {
    logger.error('Failed to update order after payment', { orderId, error });
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
