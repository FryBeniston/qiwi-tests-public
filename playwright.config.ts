import { defineConfig } from '@playwright/test';

export default defineConfig({
  use: {
    baseURL: 'https://api-test.qiwi.com/partner/payout/',
    extraHTTPHeaders: {
      'Authorization': `Bearer ${process.env.QIWI_TOKEN}`,
      'Accept': 'application/json',
    },
  },
  testDir: './tests',
  timeout: 10000,
});