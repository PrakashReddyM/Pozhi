import { z } from 'zod';

// ==========================================
// PROFILE VALIDATION
// ==========================================

export const updateProfileSchema = z.object({
  full_name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number").optional(),
  avatar_url: z.string().url().optional(),
  // Add other profile fields as needed
});

// ==========================================
// ADDRESS VALIDATION
// ==========================================

// Base schema for address fields
const addressFields = {
  label: z.string().min(1, "Label is required (e.g. Home, Office)"),
  recipient_name: z.string().min(2, "Recipient name is required"),
  phone: z.string().min(10, "Valid phone number is required"),
  street_line1: z.string().min(5, "Street address is required"),
  street_line2: z.string().optional(),
  city: z.string().min(2, "City is required"),
  state: z.string().min(2, "State is required"),
  zip_code: z.string().regex(/^[0-9]{6}$/, "Invalid PIN code"), // India format
  country: z.string().default('India'),
  is_default: z.boolean().optional()
};

// Schema for adding a new address (All fields required)
export const addAddressSchema = z.object(addressFields);

// Schema for updating (All fields optional but validated if present)
export const updateAddressSchema = z.object(addressFields).partial();