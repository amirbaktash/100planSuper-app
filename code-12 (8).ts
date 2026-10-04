import { defineConfig } from "@playwright/test";
export default defineConfig({
  timeout: 60_000,
  retries: 1,
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    extraHTTPHeaders: { "x-test-run": process.env.RUN_ID ?? "local" } },
  webServer: { command: "docker compose -f deployment/docker-compose.prod.yml up -d",
    port: 3000, reuseExistingServer: true, timeout: 120_000 },
  projects: [{ name: "api", testDir: "./" }]
});
