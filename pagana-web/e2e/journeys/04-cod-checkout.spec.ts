import { test, expect } from '@playwright/test';

import { clearCustomerCart, loginAsCustomer } from '../helpers/auth';
import { API_BASE_URL, DELIVERY_DETAILS, DEMO_CUSTOMER, MERCHANT_NENA } from '../helpers/constants';

test.describe('COD checkout', () => {
  test.beforeEach(async ({ page, request }) => {
    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: DEMO_CUSTOMER,
    });
    const { access } = await loginResponse.json();
    await clearCustomerCart(request, access);
    await loginAsCustomer(page, request);
  });

  test('places a COD order visible in history and detail', async ({ page }) => {
    await page.goto(`/merchants/${MERCHANT_NENA.id}`);
    await expect(page.getByRole('heading', { name: MERCHANT_NENA.name })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: /beef rendang/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /add to cart/i }).click();

    await page.goto('/checkout');
    await expect(page.getByRole('heading', { name: /^checkout$/i })).toBeVisible();

    await page.getByLabel(/recipient name/i).fill(DELIVERY_DETAILS.recipient_name);
    await page.getByLabel(/^phone number$/i).fill(DELIVERY_DETAILS.recipient_phone);
    await page.getByLabel(/street address/i).fill(DELIVERY_DETAILS.delivery_address_line_1);
    await page.getByLabel(/^city$/i).fill(DELIVERY_DETAILS.delivery_city);
    await page.getByLabel(/postal code/i).fill(DELIVERY_DETAILS.delivery_postal_code);
    await page.getByRole('button', { name: /continue to review/i }).click();

    await expect(page.getByText(/your order from/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole('radio', { name: /cash on delivery/i }).check();
    await page.getByRole('button', { name: /^place order$/i }).click();

    await expect(page.getByRole('heading', { name: /order placed!/i })).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole('link', { name: /track your order/i }).click();

    await expect(page.getByRole('heading', { name: MERCHANT_NENA.name })).toBeVisible();
    await expect(page.getByText(/beef rendang/i)).toBeVisible();
    await expect(page.getByText(/delivering to/i)).toBeVisible();
  });
});
