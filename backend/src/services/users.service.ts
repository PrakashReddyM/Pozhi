import { and, desc, eq } from 'drizzle-orm';
import { db, schema } from '../db';
import { ApiError } from '../utils/ApiError';
import { findOrders } from '../api/orders/orders.queries';

// ==========================================
// USERS SERVICE
//
// Profile and address CRUD for the logged-in customer.
// Migrated from Supabase to Drizzle/PostgreSQL.
// ==========================================

// Fields the customer is allowed to update on their profile.
// Internal fields (role, isBanned, passwordHash …) are not exposed here.
const PROFILE_UPDATABLE_FIELDS: Record<string, keyof typeof schema.profiles.$inferSelect> = {
  full_name: 'fullName',
  fullName: 'fullName',
  phone: 'phone',
  avatar_url: 'avatarUrl',
  avatarUrl: 'avatarUrl'
};

// Fields accepted in an address create/update payload (snake_case → camelCase).
const ADDRESS_FIELDS: Record<string, keyof typeof schema.addresses.$inferSelect> = {
  label: 'label',
  recipient_name: 'recipientName',
  recipientName: 'recipientName',
  phone: 'phone',
  street_line1: 'streetLine1',
  streetLine1: 'streetLine1',
  street_line2: 'streetLine2',
  streetLine2: 'streetLine2',
  landmark: 'landmark',
  city: 'city',
  state: 'state',
  zip_code: 'zipCode',
  zipCode: 'zipCode',
  country: 'country',
  is_default: 'isDefault',
  isDefault: 'isDefault'
};

function pickAddressFields(raw: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(raw)) {
    const col = ADDRESS_FIELDS[key];
    if (col) out[col] = val;
  }
  return out;
}

function pickProfileFields(raw: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(raw)) {
    const col = PROFILE_UPDATABLE_FIELDS[key];
    if (col) out[col] = val;
  }
  return out;
}

export const userService = {
  /**
   * Get the user's profile row plus their active addresses.
   */
  async getProfile(userId: string) {
    const [profile] = await db
      .select()
      .from(schema.profiles)
      .where(eq(schema.profiles.id, userId))
      .limit(1);

    if (!profile) throw new ApiError(404, 'Profile not found');

    const addresses = await this.getAddresses(userId);

    // Omit internal-only fields before returning to the API layer.
    const { passwordHash, googleSub, failedLoginAttempts, lastFailedLogin,
            accountLockedUntil, ...safeProfile } = profile;

    return { ...safeProfile, addresses };
  },

  /**
   * Update allowed profile fields (full_name, phone, avatar_url).
   */
  async updateProfile(userId: string, updates: Record<string, unknown>) {
    const changes = pickProfileFields(updates);

    if (Object.keys(changes).length === 0) {
      throw new ApiError(400, 'No updatable fields provided');
    }

    changes.updatedAt = new Date().toISOString();

    const [updated] = await db
      .update(schema.profiles)
      .set(changes)
      .where(eq(schema.profiles.id, userId))
      .returning();

    if (!updated) throw new ApiError(404, 'Profile not found');

    const { passwordHash, googleSub, failedLoginAttempts, lastFailedLogin,
            accountLockedUntil, ...safeProfile } = updated;

    return safeProfile;
  },

  /**
   * Return active addresses for the user, default first.
   */
  async getAddresses(userId: string) {
    return db
      .select()
      .from(schema.addresses)
      .where(and(
        eq(schema.addresses.userId, userId),
        eq(schema.addresses.isActive, true)
      ))
      .orderBy(desc(schema.addresses.isDefault));
  },

  /**
   * Create a new address.
   * If is_default is true, clears all other defaults for the user first
   * (can't use a partial unique index for automatic enforcement here because
   * we allow temporarily having zero defaults during the transition).
   */
  async addAddress(userId: string, addressData: Record<string, unknown>) {
    const fields = pickAddressFields(addressData);

    if (fields.isDefault) {
      await db
        .update(schema.addresses)
        .set({ isDefault: false })
        .where(and(
          eq(schema.addresses.userId, userId),
          eq(schema.addresses.isActive, true)
        ));
    }

    const [created] = await db
      .insert(schema.addresses)
      .values({ ...fields, userId } as any)
      .returning();

    return created;
  },

  /**
   * Update an existing address. Ownership is enforced by requiring user_id
   * in the WHERE clause rather than a separate look-up.
   */
  async updateAddress(
    userId: string,
    addressId: string,
    updates: Record<string, unknown>
  ) {
    const fields = pickAddressFields(updates);

    if (Object.keys(fields).length === 0) {
      throw new ApiError(400, 'No updatable fields provided');
    }

    if (fields.isDefault) {
      await db
        .update(schema.addresses)
        .set({ isDefault: false })
        .where(and(
          eq(schema.addresses.userId, userId),
          eq(schema.addresses.isActive, true)
        ));
    }

    fields.updatedAt = new Date().toISOString();

    const [updated] = await db
      .update(schema.addresses)
      .set(fields as any)
      .where(and(
        eq(schema.addresses.id, addressId),
        eq(schema.addresses.userId, userId)
      ))
      .returning();

    if (!updated) throw new ApiError(404, 'Address not found');

    return updated;
  },

  /**
   * Soft-delete an address (is_active = false).
   * Hard deletes are not done because address data may be referenced by past orders.
   */
  async deleteAddress(userId: string, addressId: string) {
    const [deleted] = await db
      .update(schema.addresses)
      .set({ isActive: false, updatedAt: new Date().toISOString() })
      .where(and(
        eq(schema.addresses.id, addressId),
        eq(schema.addresses.userId, userId)
      ))
      .returning({ id: schema.addresses.id });

    if (!deleted) throw new ApiError(404, 'Address not found');
  },

  /**
   * Return the user's orders with nested items (same shape as the PostgREST
   * response the frontend was already consuming).
   */
  async getOrders(userId: string) {
    return findOrders({
      where: eq(schema.orders.userId, userId)
    });
  }
};
