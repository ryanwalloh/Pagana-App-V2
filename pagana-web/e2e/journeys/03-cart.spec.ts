import { test, expect } from '@playwright/test';

import {
  clearCustomerCart,
  loginAsCustomer,
  waitForCartItemCount,
} from '../helpers/auth';
import { API_BASE_URL, DEMO_CUSTOMER, MERCHANT_BURGER, MERCHANT_NENA } from '../helpers/constants';

test.describe('Cart management', () => {
  let accessToken: string;

  test.beforeEach(async ({ page, request }) => {
    const loginResponse = await request.post(`${API_BASE_URL}/auth/login`, {
      data: DEMO_CUSTOMER,
    });
    const { access } = await loginResponse.json();
    accessToken = access;
    await clearCustomerCart(request, access);
    await loginAsCustomer(page, request);
  });

  test('add, update quantity, and resolve cross-merchant conflict', async ({ page, request }) => {
    await page.goto(`/merchants/${MERCHANT_NENA.id}`);

    await expect(page.getByRole('heading', { name: MERCHANT_NENA.name })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole('button', { name: /beef rendang/i }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('button', { name: /increase quantity/i }).click();
    await dialog.getByRole('button', { name: /add to cart/i }).click();

    await page.goto('/cart');
    await expect(page.getByText(/beef rendang/i)).toBeVisible();
    const main = page.locator('#main-content');
    await expect(main.getByText('2', { exact: true })).toBeVisible();

    // Decrease back to 1 via stepper on cart row.
    await page.getByRole('button', { name: /decrease quantity of beef rendang/i }).click();
    await expect(main.getByText('1', { exact: true })).toBeVisible();

    // Cross-merchant conflict from Bahay Burger.
    await page.goto(`/merchants/${MERCHANT_BURGER.id}`);
    await page.getByRole('button', { name: /classic cheeseburger/i }).click();
    await page.getByRole('dialog').getByRole('button', { name: /add to cart/i }).click();

    const conflictDialog = page.getByRole('dialog').filter({
      has: page.getByRole('heading', { name: /start a new cart\?/i }),
    });
    await expect(conflictDialog).toBeVisible();
    await conflictDialog.getByRole('button', { name: /clear and add/i }).click();
    await expect(conflictDialog).toBeHidden({ timeout: 15_000 });
    await waitForCartItemCount(request, accessToken, 1);

    await page.goto('/cart');
    await expect(page.getByText(/classic cheeseburger/i)).toBeVisible();
    await expect(page.getByText(/beef rendang/i)).not.toBeVisible();
  });
});
