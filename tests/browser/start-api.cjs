const { randomUUID } = require("node:crypto");
const { api, web, database, webhookSecret } = require("./fixture.cjs");
const Stripe = require("stripe");

// Keep Stripe's real signature verifier. Only the external session service is simulated.
const sessions = new Map();
class FixtureStripe extends Stripe {
  constructor(key) {
    super(key);
    this.checkout.sessions.create = async (params) => {
      const id = "cs_test_" + randomUUID();
      const session = { id, client_reference_id: params.client_reference_id, metadata: params.metadata,
        url: web + "/checkout/success?session_id=" + id, payment_status: "paid" };
      sessions.set(id, session);
      return session;
    };
    this.checkout.sessions.retrieve = async (id) => {
      if (!sessions.has(id)) throw new Error("Unknown fixture checkout session");
      return sessions.get(id);
    };
  }
}
require.cache[require.resolve("stripe")].exports = FixtureStripe;
Object.assign(process.env, {
  NODE_ENV: "test", BIND_HOST: "127.0.0.1", PORT: new URL(api).port, FRONTEND_URL: web,
  CORS_ORIGIN: web, DATABASE_URL: database, REDIS_URL: "redis://127.0.0.1:16387",
  QUEUE_PREFIX: "marketobrowser", JWT_ACCESS_SECRET: "browser-local-access-only", JWT_REFRESH_SECRET: "browser-local-refresh-only",
  STRIPE_SECRET_KEY: "sk_test_fixture", STRIPE_WEBHOOK_SECRET: webhookSecret,
  GMAIL_USER: "", GMAIL_APP_PASSWORD: "", ADMIN_TOTP_SECRETS: JSON.stringify({ [process.env.MARKETO_E2E_ADMIN_ID]: process.env.MARKETO_E2E_ADMIN_KEY })
});
require("../../apps/api/dist/main.js");
