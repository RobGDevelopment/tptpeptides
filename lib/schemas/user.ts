import { z } from 'zod';

export const shippingAddressSchema = z.object({
  institution: z.string().min(1, 'Institution name is required'),
  labName: z.string().optional(),
  line1: z.string().min(1, 'Address is required'),
  line2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  state: z.string().min(1, 'State is required'),
  postalCode: z.string().min(3, 'Postal code is required'),
  country: z.string().min(1).default('US'),
});

export type ShippingAddress = z.infer<typeof shippingAddressSchema>;

export const userProfileUpdateSchema = z.object({
  shippingAddress: shippingAddressSchema.optional(),
  institutionVerified: z.boolean().optional(),
});

export type UserProfileUpdate = z.infer<typeof userProfileUpdateSchema>;
