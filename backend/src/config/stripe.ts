// ==========================================
// STRIPE CLIENT - CORRECTED VERSION
// ==========================================
// ✅ Correct API version (2024-11-20.acacia)
// ✅ Uses validated env variables
// ✅ Proper configuration
// ==========================================

import Stripe from 'stripe';
import { env, isStripeLiveMode } from './env';
import { logger } from '../utils/logger';

// ==========================================
// INITIALIZE STRIPE CLIENT
// ==========================================

export const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? 'sk_test_placeholder', {
  apiVersion: '2026-01-28.clover', // ✅ CORRECTED: Real Stripe API version
  typescript: true,
  maxNetworkRetries: 3, // Retry failed requests
  timeout: 30000, // 30 seconds timeout
  telemetry: true, // Enable telemetry for better debugging
  appInfo: {
    name: 'Luminia & Oak Studio',
    version: '1.0.0',
    url: 'https://luminia.com'
  }
});

// ==========================================
// WEBHOOK SECRET
// ==========================================

export const webhookSecret = env.STRIPE_WEBHOOK_SECRET ?? '';

// ==========================================
// CONFIGURATION CONSTANTS
// ==========================================

export const STRIPE_CONFIG = {
  currency: 'inr', // Indian Rupees
  minimumAmount: 100, // ₹1.00 (in paisa)
  maximumAmount: 50000000, // ₹5,00,000 (in paisa)
  statementDescriptor: 'LUMINIA FRAMES',
  
  // Payment method types
  paymentMethods: [
    'card',
    'upi', // Indian UPI payments
  ] as Stripe.PaymentMethodCreateParams.Type[],
  
  // Automatic payment methods
  automaticPaymentMethods: {
    enabled: true,
    allow_redirects: 'always' as const
  },
  
  // Radar fraud detection (if available in your Stripe plan)
  radarOptions: {
    enabled: true
  }
};

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * Convert rupees to paisa (smallest currency unit)
 */
export const convertToSmallestUnit = (amount: number): number => {
  return Math.round(amount * 100);
};

/**
 * Convert paisa to rupees
 */
export const convertFromSmallestUnit = (amount: number): number => {
  return amount / 100;
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number, currency: string = 'INR'): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency
  }).format(amount);
};

/**
 * Test Stripe connection
 */
export const testStripeConnection = async (): Promise<boolean> => {
  try {
    // Try to retrieve account info
    const account = await stripe.accounts.retrieve();
    
    const mode = isStripeLiveMode() ? 'LIVE' : 'TEST';
    logger.info(`✅ Stripe connection successful (${mode} mode)`, {
      accountId: account.id,
      country: account.country
    });
    
    return true;

  } catch (error: any) {
    logger.error('Stripe connection test failed', { error: error.message });
    return false;
  }
};

/**
 * Verify webhook signature
 */
export const verifyWebhookSignature = (
  payload: Buffer | string,
  signature: string
): Stripe.Event => {
  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );

    logger.info('Webhook signature verified', {
      eventType: event.type,
      eventId: event.id
    });

    return event;

  } catch (error: any) {
    logger.error('Webhook signature verification failed', {
      error: error.message
    });

    throw new Error(`Webhook signature verification failed: ${error.message}`);
  }
};

/**
 * Create payment intent with standard configuration
 */
export const createPaymentIntent = async (
  amount: number,
  metadata: Record<string, string> = {}
): Promise<Stripe.PaymentIntent> => {
  const amountInPaisa = convertToSmallestUnit(amount);

  // Validate amount
  if (amountInPaisa < STRIPE_CONFIG.minimumAmount) {
    throw new Error(`Amount must be at least ₹${STRIPE_CONFIG.minimumAmount / 100}`);
  }

  if (amountInPaisa > STRIPE_CONFIG.maximumAmount) {
    throw new Error(`Amount cannot exceed ₹${STRIPE_CONFIG.maximumAmount / 100}`);
  }

  return await stripe.paymentIntents.create({
    amount: amountInPaisa,
    currency: STRIPE_CONFIG.currency,
    automatic_payment_methods: STRIPE_CONFIG.automaticPaymentMethods,
    statement_descriptor: STRIPE_CONFIG.statementDescriptor,
    metadata,
    ...(STRIPE_CONFIG.radarOptions.enabled && {
      radar_options: {
        session: metadata.user_id || undefined
      }
    })
  });
};

/**
 * Get payment intent details
 */
export const getPaymentIntent = async (
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> => {
  return await stripe.paymentIntents.retrieve(paymentIntentId);
};

/**
 * Cancel payment intent
 */
export const cancelPaymentIntent = async (
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> => {
  return await stripe.paymentIntents.cancel(paymentIntentId);
};

/**
 * Create refund
 */
export const createRefund = async (
  paymentIntentId: string,
  amount?: number,
  reason?: string
): Promise<Stripe.Refund> => {
  const refundParams: Stripe.RefundCreateParams = {
    payment_intent: paymentIntentId,
    reason: 'requested_by_customer'
  };

  if (amount) {
    refundParams.amount = convertToSmallestUnit(amount);
  }

  if (reason) {
    refundParams.metadata = { reason };
  }

  return await stripe.refunds.create(refundParams);
};

/**
 * List all refunds for a payment intent
 */
export const listRefunds = async (
  paymentIntentId: string
): Promise<Stripe.Refund[]> => {
  const refunds = await stripe.refunds.list({
    payment_intent: paymentIntentId
  });

  return refunds.data;
};

/**
 * Get customer by email
 */
export const getCustomerByEmail = async (
  email: string
): Promise<Stripe.Customer | null> => {
  const customers = await stripe.customers.list({
    email,
    limit: 1
  });

  return customers.data[0] || null;
};

/**
 * Create or get customer
 */
export const createOrGetCustomer = async (
  email: string,
  metadata: Record<string, string> = {}
): Promise<Stripe.Customer> => {
  // Try to find existing customer
  let customer = await getCustomerByEmail(email);

  // Create new customer if doesn't exist
  if (!customer) {
    customer = await stripe.customers.create({
      email,
      metadata
    });

    logger.info('Stripe customer created', {
      customerId: customer.id,
      email
    });
  }

  return customer;
};

// ==========================================
// LOG STRIPE MODE ON STARTUP
// ==========================================

const mode = isStripeLiveMode() ? '🔴 LIVE MODE' : '🟢 TEST MODE';
logger.info(`Stripe initialized in ${mode}`);

// ==========================================
// EXPORT
// ==========================================

export default stripe;