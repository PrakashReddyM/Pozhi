import { supabase } from '../config/supabase';
import { ApiError } from '../utils/ApiError';

export const userService = {
  /**
   * Get User Profile & Addresses
   */
  async getProfile(userId: string) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profileError) throw new ApiError(500, 'Failed to fetch profile');

    // Reuse getAddresses logic
    const addresses = await this.getAddresses(userId);

    return { ...profile, addresses };
  },

  /**
   * Update Profile Details
   */
  async updateProfile(userId: string, updates: any) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) throw new ApiError(500, 'Failed to update profile');
    return data;
  },

  /**
   * Get All Addresses for User
   */
  async getAddresses(userId: string) {
    const { data, error } = await supabase
      .from('addresses')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('is_default', { ascending: false });

    if (error) throw new ApiError(500, 'Failed to fetch addresses');
    return data || [];
  },

  /**
   * Add New Address
   */
  async addAddress(userId: string, addressData: any) {
    // If setting as default, unset other defaults first
    if (addressData.is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const { data, error } = await supabase
      .from('addresses')
      .insert({ ...addressData, user_id: userId })
      .select()
      .single();

    if (error) throw new ApiError(500, error.message);
    return data;
  },

  /**
   * Update Existing Address
   */
  async updateAddress(userId: string, addressId: string, updates: any) {
    // If setting as default, unset other defaults first
    if (updates.is_default) {
      await supabase
        .from('addresses')
        .update({ is_default: false })
        .eq('user_id', userId);
    }

    const { data, error } = await supabase
      .from('addresses')
      .update(updates)
      .eq('id', addressId)
      .eq('user_id', userId) // Security: Ensure ownership
      .select()
      .single();

    if (error) throw new ApiError(500, 'Failed to update address');
    if (!data) throw new ApiError(404, 'Address not found');
    
    return data;
  },

  /**
   * Delete Address (Soft Delete)
   */
  async deleteAddress(userId: string, addressId: string) {
    const { error } = await supabase
      .from('addresses')
      .update({ is_active: false }) // Don't actually delete, just hide
      .eq('id', addressId)
      .eq('user_id', userId);

    if (error) throw new ApiError(500, 'Failed to delete address');
  },

  /**
   * Get User Orders (Shortcut)
   */
  async getOrders(userId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, items:order_items(*)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw new ApiError(500, 'Failed to fetch orders');
    return data;
  }
};