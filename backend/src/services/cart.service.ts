import { supabase } from '../config/supabase';
import { ApiError } from '../utils/ApiError';

export const cartService = {
  /**
   * Get User's Cart
   */
  async getCart(userId: string) {
    const { data, error } = await supabase
      .from('cart_items')
      .select(`
        *,
        frame:frames(name, base_price, image_url),
        gallery_art:gallery_art(title, image_url, base_price),
        user_upload:user_uploads(original_filename, preview_url)
      `)
      .eq('user_id', userId);

    if (error) throw new ApiError(500, 'Failed to fetch cart');
    return data;
  },

  /**
   * ✅ Add Item(s) to Cart
   * Accepts an array of items, calculates prices for all, and bulk inserts.
   */
  async addToCart(userId: string, items: any[]) {
    // 1. Process all items in parallel to calculate prices and check stock
    const cartData = await Promise.all(items.map(async (item) => {
      // Fetch Frame Price & Stock
      const { data: frame } = await supabase
        .from('frames')
        .select('base_price, stock_quantity')
        .eq('id', item.frame_id)
        .single();

      if (!frame) throw new ApiError(404, `Frame not found (ID: ${item.frame_id})`);
      if (frame.stock_quantity < item.quantity) {
        throw new ApiError(400, `Frame out of stock (ID: ${item.frame_id})`);
      }

      // Calculate Unit Price
      let unitPrice = Number(frame.base_price);
      
      if (item.item_type === 'gallery' && item.gallery_art_id) {
        const { data: art } = await supabase
          .from('gallery_art')
          .select('base_price, price_markup')
          .eq('id', item.gallery_art_id)
          .single();
        
        if (art) {
          unitPrice += Number(art.base_price) + Number(art.price_markup || 0);
        }
      }

      // Return the formatted object for the database
      return {
        user_id: userId,
        frame_id: item.frame_id,
        item_type: item.item_type,
        gallery_art_id: item.gallery_art_id,
        user_upload_id: item.user_upload_id,
        frame_size: item.frame_size,
        customizations: { mat: item.mat_color, glass: item.glass_type },
        quantity: item.quantity,
        unit_price: unitPrice
      };
    }));

    // 2. Bulk Save/Update DB
    // Using upsert allows us to update existing rows or insert new ones
    const { data, error } = await supabase
      .from('cart_items')
      .upsert(cartData, { 
        onConflict: 'user_id, frame_id, frame_size, item_type, gallery_art_id, user_upload_id' 
      })
      .select();

    if (error) throw new ApiError(500, error.message);
    return data;
  },

  /**
   * Update Cart Item Quantity
   */
  async updateCartItem(userId: string, cartItemId: string, quantity: number) {
    const { data, error } = await supabase
      .from('cart_items')
      .update({ quantity })
      .eq('id', cartItemId)
      .eq('user_id', userId) // Security check: must belong to user
      .select()
      .single();

    if (error) throw new ApiError(500, 'Failed to update cart item');
    if (!data) throw new ApiError(404, 'Cart item not found');
    return data;
  },

  /**
   * Remove Item
   */
  async removeFromCart(userId: string, itemId: string) {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('id', itemId)
      .eq('user_id', userId);

    if (error) throw new ApiError(500, 'Failed to remove item');
  },

  /**
   * Clear Cart
   */
  async clearCart(userId: string) {
    const { error } = await supabase
      .from('cart_items')
      .delete()
      .eq('user_id', userId);

    if (error) throw new ApiError(500, 'Failed to clear cart');
  }
};