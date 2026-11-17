import { defineConfig } from '@playwright/test';

// بنختبر النسخة المبنية (build + preview) علشان الـservice worker والـoffline يتختبروا بجد
export default defineConfig({
  testDir: 'tests',
  timeout: 60_000,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: 'http://localhost:4173/',
    viewport: { width: 360, height: 740 },
    isMobile: true,
    hasTouch: true,
    locale: 'ar-EG',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
