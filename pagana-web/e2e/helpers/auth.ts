import type { APIRequestContext, Page } from '@playwright/test';

import { API_BASE_URL, DEMO_CUSTOMER } from './constants';

/** Programmatic login: faster than filling the login form in every spec. */
export async function loginAsCustomer(page: Page, request: APIRequestContext): Promise<void> {
  const response = await request.post(`${API_BASE_URL}/auth/login`, {
    data: DEMO_CUSTOMER,
  });
  if (!response.ok()) {
    throw new Error(`Login failed: ${response.status()} ${await response.text()}`);
  }
  const { access, refresh } = await response.json();

  await page.goto('/');
  await page.evaluate(
    ({ accessToken, refreshToken }) => {
      localStorage.setItem('pagana.access', accessToken);
      localStorage.setItem('pagana.refresh', refreshToken);
    },
    { accessToken: access, refreshToken: refresh },
  );
}

/** Poll the cart API until the expected item count is reached. */
export async function waitForCartItemCount(
  request: APIRequestContext,
  accessToken: string,
  expectedCount: number,
): Promise<void> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const response = await request.get(`${API_BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const cart = await response.json();
    if (cart.items?.length === expectedCount) return;
    await new Promise((r) => setTimeout(r, 300));
  }
  throw new Error(`Cart did not reach ${expectedCount} item(s) within 15s`);
}

export async function clearCustomerCart(
  request: APIRequestContext,
  accessToken: string,
): Promise<void> {
  await request.delete(`${API_BASE_URL}/cart`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}
