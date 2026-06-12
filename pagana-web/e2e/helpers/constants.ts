/** Shared e2e constants — mirrors seed_demo_data credentials. */
export const API_BASE_URL =
  process.env.PLAYWRIGHT_API_URL ?? 'http://127.0.0.1:8001/api/v1';

export const DEMO_CUSTOMER = {
  email: 'customer@demo.pagana.local',
  password: 'DemoPass123!',
};

export const DEMO_PASSWORD = 'DemoPass123!';

/** Known seeded merchants (stable IDs from seed_demo_data insertion order). */
export const MERCHANT_NENA = { id: 1, name: 'Kusina ni Aling Nena' };
export const MERCHANT_BURGER = { id: 2, name: 'Bahay Burger' };

export const DELIVERY_DETAILS = {
  recipient_name: 'E2E Test User',
  recipient_phone: '+639171234567',
  delivery_address_line_1: '123 Test Street',
  delivery_city: 'Marawi',
  delivery_postal_code: '9700',
};
