import { defineConfig } from "@playwright/test";

import { randomUUID } from "node:crypto";
import { Secret } from "otpauth";
process.env.MARKETO_E2E_ADMIN_ID ??= randomUUID();
process.env.MARKETO_E2E_ADMIN_KEY ??= new Secret({ size: 20 }).base32;

const web = "http://127.0.0.1:15130";
const api = "http://127.0.0.1:15131/api";
export default defineConfig({
  testDir: "tests/browser",
  workers: 1,
  timeout: 90000,
  expect: { timeout: 20000 },
  use: { baseURL: web, viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1.5, channel: process.env.PLAYWRIGHT_CHANNEL || undefined },
  webServer: [
    { command: "node tests/browser/start-api.cjs", url: api + "/health" },
    { cwd: "apps/web", command: "node ../../node_modules/next/dist/bin/next start --hostname 127.0.0.1 --port 15130",
      url: web + "/login", timeout: 120000, env: { NEXT_PUBLIC_API_URL: api, NEXT_TELEMETRY_DISABLED: "1" } }
  ]
});
