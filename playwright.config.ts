import { defineConfig } from "@playwright/test";

const baseURL =
  process.env.PRICELEDGER_TEST_BASE_URL ?? "http://127.0.0.1:5173";
export default defineConfig({
  testDir: "./tests/browser",
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: "list",
  use: {
    baseURL,
    channel: process.env.CI ? undefined : "chrome",
    trace: "retain-on-failure",
  },
  webServer:
    process.env.CI && !process.env.PRICELEDGER_TEST_EXTERNAL_SERVER
      ? {
          command: "npm run preview -- --port 4173 --strictPort",
          url: baseURL,
          reuseExistingServer: false,
          timeout: 30_000,
        }
      : undefined,
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "mobile",
      use: {
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
});
