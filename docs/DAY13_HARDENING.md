# Marketplace security patch

## Administrator enrollment and recovery

Deploy the additive Prisma migration before starting the new API. Provision every existing admin before switching traffic. Buyers and sellers keep their current sign-in flow. An administrator signs in with their password and a six-digit code from an authenticator app.

1. Identify the administrator by immutable database user ID. Verify the person's identity through your existing operator channel. For promotion, provision the factor before assigning the ADMIN role.
2. Generate a separate 160-bit random Base32 secret in an approved secret manager for each administrator. Register it in the person's authenticator through a private handoff (TOTP, SHA-1, six digits, 30 seconds). Use the app's manual setup option. Keep the API servers' clocks synchronized.
3. Store a JSON object mapping each user ID to its 32-character uppercase Base32 key in the API host's private `ADMIN_TOTP_SECRETS` setting. Supply the same mapping to every API instance. Keep keys out of the repository, command history, logs, the web build and support tickets.
4. Apply `npm run prisma:deploy -w apps/api`, deploy all API instances and the storefront, then verify an admin sign-in and refresh. Drain old API versions before reopening admin traffic. Missing enrollment blocks admin access. Legacy admin sessions require a fresh sign-in.
5. For loss or suspected compromise, verify identity out of band, replace that one key, securely enroll the new device and restart/drain all API instances with the new mapping. Prior administrator access and refresh tokens lose their binding after rollout. A password reset alone cannot replace a factor. Wait for a fresh code if the last accepted time step is still active.

## Shared request limits

Each API instance uses the same Redis URL, database and queue prefix in a deployment. The global limit increments the client counter and starts its expiry in one Redis operation. A Redis outage returns HTTP 503 for covered routes. Keep the existing webhook exemption and check the configured trusted proxy topology before deployment. The local fallback applies to development without Redis. The separate account-specific login and email limiters still use process memory.

## Running the integration checks

Use disposable PostgreSQL 16 at loopback port 15438 (database `marketotest`, user `postgres`, password `local_day13_fixture`) and Redis at loopback port 16387. These credentials are exclusively for the local fixture. The browser tests create distinct records in this database on each run. The dedicated GitHub Actions job supplies both services.

Run `npm ci`, set `DATABASE_URL` to `postgresql://postgres:local_day13_fixture@127.0.0.1:15438/marketotest`, set `NEXT_PUBLIC_API_URL` to `http://127.0.0.1:15131/api`, then run `npm run prisma:deploy -w apps/api` and `npm run build`. Install Chromium with `npx playwright install chromium`, then run `npm run test:browser` and `node --test tests/shared-limit.cjs`. Set `PLAYWRIGHT_CHANNEL=chrome` to use an installed Google Chrome. The browser suite starts its own storefront and API. Real PostgreSQL and Redis back the tests. A local Stripe fixture simulates provider session creation and retrieval. The API checks the SDK-signed test event and writes the order.

## Hosted verification

After a staging deployment, confirm administrator enrollment and recovery, shared Redis enforcement, private database/network settings, and restoration to a separate database. Use the Stripe test-mode dashboard to verify a provider-delivered event against a test order. Record the deployment revision and sanitized results before promoting to production.
