import { defineConfig } from "@playwright/test";

// Happy path against a running stack (`docker compose up --build`, or both dev servers with API_URL set).
// BASE_URL defaults to the compose frontend; ADMIN_TOKEN to the compose default.
export default defineConfig({
  testDir: "e2e",
  timeout: 90_000,
  workers: 1, // one stack, and the flow writes simulated submissions
  reporter: "list",
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: { viewport: { width: 1280, height: 800 } } },
    { name: "mobile", use: { viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true } },
  ],
});
