import { test, expect } from '@playwright/test';

import { MERCHANT_NENA } from '../helpers/constants';

test.describe('Guest storefront browse', () => {
  test('guest can browse merchants and open a product dialog', async ({ page }) => {
    await page.goto('/#restaurants');

    await expect(page.getByRole('heading', { name: /order from local favorites/i })).toBeVisible();
    await expect(page.getByText(/couldn't load restaurants/i)).not.toBeVisible({ timeout: 15_000 });

    const merchantLink = page.getByRole('link', { name: new RegExp(MERCHANT_NENA.name, 'i') });
    await expect(merchantLink).toBeVisible({ timeout: 15_000 });
    await merchantLink.click();

    await expect(page).toHaveURL(new RegExp(`/merchants/${MERCHANT_NENA.id}`));
    await expect(page.getByRole('heading', { name: MERCHANT_NENA.name })).toBeVisible();

    await page.getByRole('button', { name: /beef rendang/i }).click();

    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('heading', { name: /beef rendang/i })).toBeVisible();
    await expect(dialog.getByRole('link', { name: /sign in to order/i })).toBeVisible();
  });
});
