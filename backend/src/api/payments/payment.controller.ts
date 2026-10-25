import { Request, Response, NextFunction } from 'express';
import { createPaymentOrder, verifyPaymentSignature, handlePaymentSuccess } from '../../services/payment.service';
import { ApiError } from '../../utils/ApiError';
import { logger } from '../../utils/logger';
import { supabaseAdmin } from '../../config/supabase';

export async function createPaymentIntent(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId } = req.body;
    const userId = req.user!.id;

    const result = await createPaymentOrder(orderId, userId);

    res.status(200).json({ status: 'success', data: result });
  } catch (error: any) {
    logger.error('Failed to create payment order', { error: error.message });
    next(new ApiError(400, error.message || 'Failed to create payment order'));
  }
}

export async function verifyPayment(req: Request, res: Response, next: NextFunction) {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;
    const userId = req.user!.id;

    // The order must belong to the caller. Without this, any signed-in user could
    // settle someone else's order.
    const { data: order, error: lookupError } = await supabaseAdmin
      .from('orders')
      .select('id, user_id, payment_status, upi_transaction_id')
      .eq('id', orderId)
      .eq('user_id', userId)
      .single();

    if (lookupError || !order) {
      throw new ApiError(404, 'Order not found');
    }

    if (order.payment_status === 'completed') {
      return res.status(200).json({ status: 'success', data: { message: 'Payment already verified' } });
    }

    // The signature only proves Razorpay issued this payment — it says nothing about
    // WHICH of our orders it belongs to. Bind it to the Razorpay order we created for
    // this order, otherwise one valid payment could settle any number of orders.
    if (!order.upi_transaction_id || order.upi_transaction_id !== razorpayOrderId) {
      logger.warn('Payment verification rejected: razorpay order mismatch', {
        orderId,
        userId,
        expected: order.upi_transaction_id,
        received: razorpayOrderId
      });
      throw new ApiError(400, 'Payment verification failed: this payment does not belong to this order');
    }

    const isValid = verifyPaymentSignature(razorpayOrderId, razorpayPaymentId, razorpaySignature);
    if (!isValid) {
      throw new ApiError(400, 'Payment verification failed: invalid signature');
    }

    await handlePaymentSuccess(orderId, razorpayPaymentId);

    res.status(200).json({ status: 'success', data: { message: 'Payment verified' } });
  } catch (error: any) {
    logger.error('Payment verification error', { error: error.message });
    next(error instanceof ApiError ? error : new ApiError(500, error.message || 'Verification failed'));
  }
}
