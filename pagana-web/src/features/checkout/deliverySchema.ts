import { z } from 'zod';

/**
 * Mirrors the API's CheckoutPrepareSerializer constraints exactly
 * (max lengths 255/32/120/2; line 2, state, and notes optional).
 *
 * Country decision (WBS M4-F2-T2): single-country launch — delivery_country
 * is fixed to "PH" and rendered read-only, never free text.
 */
export const DEFAULT_COUNTRY = 'PH';

export const deliverySchema = z.object({
  recipient_name: z
    .string()
    .min(1, 'Recipient name is required.')
    .max(255, 'Name is too long.'),
  recipient_phone: z
    .string()
    .min(7, 'Enter a valid phone number.')
    .max(32, 'Phone number is too long.')
    .regex(/^\+?[0-9 ()-]+$/, 'Enter a valid phone number.'),
  delivery_address_line_1: z
    .string()
    .min(1, 'Street address is required.')
    .max(255, 'Address is too long.'),
  delivery_address_line_2: z.string().max(255, 'Address is too long.').optional(),
  delivery_city: z.string().min(1, 'City is required.').max(120, 'City is too long.'),
  delivery_state: z.string().max(120, 'Province is too long.').optional(),
  delivery_postal_code: z
    .string()
    .min(1, 'Postal code is required.')
    .max(32, 'Postal code is too long.'),
  delivery_country: z
    .string()
    .length(2, 'Country must be an ISO-2 code.')
    .regex(/^[A-Z]{2}$/, 'Country must be an ISO-2 code.'),
  delivery_notes: z.string().optional(),
});

export type DeliveryFormValues = z.infer<typeof deliverySchema>;

export const emptyDeliveryValues: DeliveryFormValues = {
  recipient_name: '',
  recipient_phone: '',
  delivery_address_line_1: '',
  delivery_address_line_2: '',
  delivery_city: '',
  delivery_state: '',
  delivery_postal_code: '',
  delivery_country: DEFAULT_COUNTRY,
  delivery_notes: '',
};
