// ==========================================
// PAYMENT SERVICE - HYBRID (MOCK + PROD)
// ==========================================

import Stripe from 'stripe';
import { supabase } from '../config/supabase';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

// Initialize Stripe (Only errors if key is missing AND we are not in mock mode)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock_key', {
  apiVersion: '2026-01-28.clover', // Use the latest stable version
  typescript: true
});

// ------------------------------------------------------------------
// CONFIGURATION
// ------------------------------------------------------------------
// Set this in your .env file: PAYMENT_MODE=mock
const IS_MOCK_MODE = process.env.PAYMENT_MODE === 'mock';

interface PaymentMetadata {
  userId: string;
  ipAddress: string;
  items: Array<{
    frame_id: string;
    quantity: number;
    price: number;
  }>;
}

export const paymentService = {
  /**
   * 1. CREATE PAYMENT INTENT
   * Handles both Mock mode (for testing) and Real Stripe mode
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    metadata: PaymentMetadata
  ) {
    // --- 🧪 MOCK MODE START ---
    if (IS_MOCK_MODE) {
      logger.info('🧪 MOCK MODE: Skipping Stripe Create');
      const mockId = `pi_mock_${Date.now()}_${Math.random().toString(36).substring(7)}`;
      
      return {
        paymentIntentId: mockId,
        clientSecret: 'mock_secret_do_not_use_real_card',
        message: 'MOCK MODE ACTIVE: No real payment will be processed.'
      };
    }
    // --- 🧪 MOCK MODE END ---

    try {
      const amountInSmallestUnit = Math.round(amount * 100);

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amountInSmallestUnit,
        currency: currency.toLowerCase(),
        automatic_payment_methods: { enabled: true },
        metadata: {
          user_id: metadata.userId,
          ip_address: metadata.ipAddress,
          item_count: metadata.items.length.toString()
        },
        description: `Luminia & Oak Studio Order`,
        statement_descriptor: 'LUMINIA FRAMES',
        radar_options: {
          session: metadata.userId
        }
      });

      logger.info('Payment intent created', {
        paymentIntentId: paymentIntent.id,
        amount,
        userId: metadata.userId
      });

      return {
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret
      };

    } catch (error: any) {
      logger.error('Failed to create payment intent', { error: error.message });
      throw new ApiError(500, `Payment initialization failed: ${error.message}`);
    }
  },

  /**
   * 2. HANDLE SUCCESS (THE CORE LOGIC)
   * This runs automatically via Webhook (Prod) or manually via triggerMockSuccess (Mock)
   */
  async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent | { id: string; amount: number; latest_charge: string | any }): Promise<void> {
    const paymentIntentId = paymentIntent.id;
    
    // --- FIX START: Safely extract charge ID ---
    let chargeId = 'unknown';
    
    // We cast to 'any' here to stop TypeScript from over-analyzing the union type
    const rawCharge = (paymentIntent as any).latest_charge;

    if (rawCharge) {
      if (typeof rawCharge === 'string') {
        // Case 1: It's just an ID string (e.g. "ch_123...")
        chargeId = rawCharge;
      } else if (rawCharge.id) {
        // Case 2: It's a full object, so we grab the .id from it
        chargeId = rawCharge.id;
      }
    }
    // --- FIX END ---

    try {
      // A. IDEMPOTENCY CHECK
      const { data: existingOrder } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (existingOrder?.payment_status === 'succeeded') {
        logger.info('Duplicate success event received, skipping.', { paymentIntentId });
        return;
      }

      // B. FETCH ORDER
      const { data: order, error } = await supabase
        .from('orders')
        .select('id, user_id, total_amount')
        .eq('stripe_payment_intent_id', paymentIntentId)
        .single();

      if (error || !order) {
        logger.error('Order not found for payment', { paymentIntentId });
        return;
      }

      // C. SECURITY CHECK (Amount)
      const expectedAmount = Math.round(order.total_amount * 100);
      if (paymentIntent.amount !== expectedAmount) {
        logger.error('CRITICAL: Payment amount mismatch', {
           expected: expectedAmount, received: paymentIntent.amount 
        });
        await supabase.from('orders').update({ is_flagged_fraud: true }).eq('id', order.id);
        return; 
      }

      // D. ATOMIC DATABASE UPDATE (RPC)
      const { error: rpcError } = await supabase.rpc('process_successful_payment', {
        p_order_id: order.id,
        p_payment_intent_id: paymentIntentId,
        p_amount: paymentIntent.amount,
        p_charge_id: chargeId
      });

      if (rpcError) {
        throw new Error(`RPC Failed: ${rpcError.message}`);
      }

      logger.info('✅ Payment processed and Inventory deducted', { orderId: order.id, mode: IS_MOCK_MODE ? 'MOCK' : 'PROD' });

    } catch (error) {
      logger.error('Failed to handle payment success', { error, paymentIntentId });
      throw error; 
    }
  },

  /**
   * 3. TRIGGER MOCK SUCCESS (New Helper)
   * Call this from a temporary API route to simulate a successful payment
   */
  async triggerMockSuccess(mockPaymentIntentId: string, amount: number) {
     if (!IS_MOCK_MODE) {
        throw new ApiError(403, '❌ Cannot trigger mock success in Production!');
     }

     logger.info('🧪 MOCK MODE: Manually triggering payment success', { mockPaymentIntentId });

     // Construct a fake object that looks enough like a Stripe Intent
     const mockPaymentObject = {
        id: mockPaymentIntentId,
        amount: Math.round(amount * 100),
        currency: 'inr',
        latest_charge: `ch_mock_${Date.now()}`,
        status: 'succeeded',
        object: 'payment_intent',
        created: Date.now() / 1000,
        livemode: false
     };

     // Pass the fake object to the REAL logic
     // @ts-ignore - Ignoring type strictness for the mock object
     await this.handlePaymentSuccess(mockPaymentObject);
  },

  /**
   * 4. CANCEL INTENT
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<void> {
    if (IS_MOCK_MODE) {
      logger.info('🧪 MOCK MODE: Skipped cancel logic', { paymentIntentId });
      return;
    }

    try {
      await stripe.paymentIntents.cancel(paymentIntentId);
      logger.info('Payment intent cancelled', { paymentIntentId });
    } catch (error: any) {
      logger.error('Failed to cancel payment intent', { error, paymentIntentId });
    }
  },

  /**
   * 5. CREATE REFUND
   */
  async createRefund(paymentIntentId: string, amount: number, reason: string): Promise<void> {
    if (IS_MOCK_MODE) {
       logger.info('🧪 MOCK MODE: Skipped refund logic', { paymentIntentId, amount });
       return;
    }

    try {
      const refund = await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: Math.round(amount * 100),
        reason: 'requested_by_customer',
        metadata: { reason }
      });
      logger.info('Refund created', { refundId: refund.id });
    } catch (error: any) {
      logger.error('Failed to create refund', { error, paymentIntentId });
      throw new ApiError(500, `Refund failed: ${error.message}`);
    }
  },

  /**
   * 6. VERIFY WEBHOOK (Prod Only)
   */
  verifyWebhookSignature(payload: string | Buffer, signature: string): Stripe.Event {
    if (IS_MOCK_MODE) {
      // In mock mode, webhooks shouldn't happen, but if they do, we ignore validation
      throw new ApiError(400, 'Webhooks not supported in MOCK mode');
    }

    try {
      const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;
      return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    } catch (error: any) {
      logger.error('Webhook signature verification failed', { error: error.message });
      throw new ApiError(400, 'Invalid webhook signature');
    }
  }
};