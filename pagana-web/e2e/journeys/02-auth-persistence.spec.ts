import { test, expect } from '@playwright/test';

import { DEMO_PASSWORD } from '../helpers/constants';

test.describe('Registration and session persistence', () => {
  test('register persists session across reload', async ({ page }) => {
    const email = `e2e-${Date.now()}@demo.pagana.local`;

    await page.goto('/register');
    await page.getByLabel(/^email$/i).fill(email);
    await page.getByLabel(/^password$/i).fill(DEMO_PASSWORD);
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: /welcome back/i })).toBeVisible();

    await page.reload();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.locator('#main-content').getByText(email)).toBeVisible();
  });
});
