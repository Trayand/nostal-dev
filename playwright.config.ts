import { defineConfig, devices } from "@playwright/test";

// Smoke tests run against the production build (out/) served statically,
// because the service worker only exists in production builds.
export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: 0,
  use: {
    baseURL: "http://localhost:4173",
    ...devices["Pixel 7"],
    browserName: "chromium",
    // Use an installed browser instead of the downloaded one: PW_CHANNEL=chrome or msedge
    channel: process.env.PW_CHANNEL || undefined,
  },
  webServer: {
    command: "npm run preview",
    url: "http://localhost:4173",
    reuseExistingServer: true,
  },
});
