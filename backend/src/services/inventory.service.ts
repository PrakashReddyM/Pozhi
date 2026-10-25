// ==========================================
// INVENTORY SERVICE - PRODUCTION GRADE
// ==========================================

import { supabase } from '../config/supabase';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';
import { v4 as uuidv4 } from 'uuid';

interface StockItem {
  frame_id: string;
  quantity: number;
}

export const inventoryService = {
  /**
   * Reserve stock atomically (pessimistic locking)
   */
  async reserveStock(items: StockItem[]): Promise<string> {
    const reservationId = uuidv4();

    try {
      for (const item of items) {
        // Check and reserve stock atomically
        const { data, error } = await supabase.rpc('reserve_frame_stock', {
          p_frame_id: item.frame_id,
          p_quantity: item.quantity,
          p_reservation_id: reservationId
        });

        if (error) {
          // Rollback all reservations
          await this.releaseReservation(reservationId);
          throw new ApiError(400, `Failed to reserve stock for frame ${item.frame_id}`);
        }

        if (!data) {
          await this.releaseReservation(reservationId);
          throw new ApiError(400, `Insufficient stock for frame ${item.frame_id}`);
        }
      }

      logger.info('Stock reserved', { reservationId, items });
      return reservationId;

    } catch (error) {
      logger.error('Stock reservation failed', { error, items });
      throw error;
    }
  },

  /**
   * Release stock reservation
   */
  async releaseReservation(reservationId: string): Promise<void> {
    try {
      await supabase.rpc('release_stock_reservation', {
        p_reservation_id: reservationId
      });

      logger.info('Stock reservation released', { reservationId });

    } catch (error) {
      logger.error('Failed to release reservation', { error, reservationId });
    }
  },

  /**
   * Release stock for cancelled order
   */
  async releaseStock(items: StockItem[]): Promise<void> {
    try {
      for (const item of items) {
        await supabase.rpc('restore_frame_stock', {
          p_frame_id: item.frame_id,
          p_quantity: item.quantity
        });
      }

      logger.info('Stock released', { items });

    } catch (error) {
      logger.error('Failed to release stock', { error, items });
    }
  },

  /**
   * Check stock availability
   */
  async checkStockAvailability(frameId: string, quantity: number): Promise<boolean> {
    try {
      const { data: frame } = await supabase
        .from('frames')
        .select('stock_quantity, max_order_quantity')
        .eq('id', frameId)
        .single();

      if (!frame) return false;

      return frame.stock_quantity >= quantity && quantity <= frame.max_order_quantity;

    } catch (error) {
      logger.error('Failed to check stock', { error, frameId });
      return false;
    }
  }
};