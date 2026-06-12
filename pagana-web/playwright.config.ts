import { defineConfig, devices } from '@playwright/test';

const API_PORT = 8001;
const WEB_PORT = 5174;

export default defineConfig({
  testDir: './e2e/journeys',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: [
        'cd ../pagana-api',
        '&& rm -f e2e.sqlite3',
        '&& DATABASE_NAME=e2e.sqlite3 .venv/bin/python manage.py migrate --no-input',
        '&& DATABASE_NAME=e2e.sqlite3 .venv/bin/python manage.py seed_demo_data',
        '&& DATABASE_NAME=e2e.sqlite3 .venv/bin/python manage.py runserver 127.0.0.1:8001 --noreload',
      ].join(' '),
      url: `http://127.0.0.1:${API_PORT}/api/v1/merchants`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        CORS_ALLOWED_ORIGINS: `http://127.0.0.1:${WEB_PORT}`,
      },
    },
    {
      command: `npm run dev -- --port ${WEB_PORT} --strictPort`,
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: !process.env.CI,
      env: {
        VITE_API_BASE_URL: `http://127.0.0.1:${API_PORT}/api/v1`,
      },
    },
  ],
});
