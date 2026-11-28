import { test, expect, Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import Stripe from "stripe";
import { TOTP } from "otpauth";
const { api, web, database, webhookSecret } = require("./fixture.cjs");
const db = new PrismaClient({ datasourceUrl: database });
const run = randomUUID();
const password = randomUUID();
const buyer = "buyer-" + run + "@example.invalid";
const seller = "seller-" + run + "@example.invalid";
let buyerId: string;
let ownId: string;
let otherId: string;

test.beforeAll(async () => {
  const passwordHash = await hash(password, 8);
  const category = await db.category.create({ data: { name: "Fixture", slug: run } });
  async function createSeller(email: string, label: string) {
    const user = await db.user.create({ data: { email, fullName: label, passwordHash, role: "SELLER" } });
    const profile = await db.sellerProfile.create({ data: { userId: user.id, status: "APPROVED" } });
    const store = await db.store.create({ data: { sellerProfileId: profile.id, name: label, slug: user.id, description: label } });
    return db.product.create({ data: { storeId: store.id, categoryId: category.id, title: label, slug: store.id,
      description: label, priceCents: 1250, stockQuantity: 4, status: "APPROVED" } });
  }
  ownId = (await createSeller(seller, "Fixture seller product")).id;
  otherId = (await createSeller("other-" + run + "@example.invalid", "Second store product")).id;
  const user = await db.user.create({ data: { email: buyer, fullName: "Fixture Buyer", passwordHash } });
  buyerId = user.id;
  await db.address.create({ data: { userId: user.id, label: "Home", line1: "Test Street", city: "Test City", country: "US", isDefault: true } });
  await db.cart.create({ data: { userId: user.id, items: { create: { productId: ownId, quantity: 1 } } } });
});
test.afterAll(() => db.$disconnect());

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  const [response] = await Promise.all([
    page.waitForResponse(r => r.url() === api + "/auth/login"),
    page.getByRole("button", { name: "Sign in" }).click()
  ]);
  expect(response.ok()).toBeTruthy();
  await expect(page).toHaveURL(/\/dashboard$/);
  return (await response.json()).data.accessToken as string;
}

test("promotion requires an authenticator and older buyer sessions cannot acquire admin access", async ({ page, request }) => {
  const id = process.env.MARKETO_E2E_ADMIN_ID!;
  const email = id + "@example.invalid";
  await db.user.create({ data: { id, email, fullName: "Fixture Administrator", passwordHash: await hash(password, 8) } });
  const login = await request.post(api + "/auth/login", { data: { email, password } });
  expect(login.ok()).toBeTruthy();
  await db.user.update({ where: { id }, data: { role: "ADMIN" } });
  const refreshed = await request.post(api + "/auth/refresh", { headers: { Origin: web }, data: {} });
  expect(refreshed.status()).toBe(401);
  expect((await refreshed.json()).message).toBe("Sign in with your administrator authenticator.");

  await page.goto("/login");
  await page.getByLabel("Email", { exact: true }).fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Sign in" }).click();
  const codeField = page.getByLabel("Authenticator code");
  await expect(codeField).toBeVisible();
  if (process.env.MARKETO_E2E_SCREENSHOT) await page.screenshot({
    path: process.env.MARKETO_E2E_SCREENSHOT, maskColor: "#cbd5e1", mask: [page.getByLabel("Email", { exact: true }), page.getByLabel("Password", { exact: true })]
  });
  const otp = new TOTP({ secret: process.env.MARKETO_E2E_ADMIN_KEY! }).generate();
  await codeField.fill(otp);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
  const replay = await request.post(api + "/auth/login", { data: { email, password, otp } });
  expect(replay.status()).toBe(401);
  await page.reload();
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.goto("/dashboard/admin");
  await expect(page.getByText("Loading your workspace...")).toHaveCount(0);
  await expect(page).toHaveURL(/\/dashboard\/admin$/);
});

test("seller workspace only exposes products owned by that seller", async ({ page, request }) => {
  const token = await signIn(page, seller);
  await page.goto("/dashboard/seller/products");
  await expect(page.getByText("Fixture seller product", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Second store product", { exact: true })).toHaveCount(0);
  const headers = { Authorization: "Bearer " + token };
  expect((await request.get(api + "/seller/products/" + ownId, { headers })).status()).toBe(200);
  expect((await request.get(api + "/seller/products/" + otherId, { headers })).status()).toBe(404);
});

test("buyer checks out and the signed payment fixture creates one paid order", async ({ page, request }) => {
  await signIn(page, buyer);
  await page.goto("/checkout");
  await page.getByRole("button", { name: "Continue to Stripe" }).click();
  await expect(page.getByRole("heading", { name: "Payment session completed" })).toBeVisible();
  const id = new URL(page.url()).searchParams.get("session_id");
  expect(id).toMatch(/^cs_test_/);
  const stripe = new Stripe("sk_test_fixture");
  const payload = JSON.stringify({ id: "evt_" + run, type: "checkout.session.completed", data: { object: { id } } });
  const signature = stripe.webhooks.generateTestHeaderString({ payload, secret: webhookSecret });
  for (const duplicate of [false, true]) {
    const result = await request.post(api + "/checkout/webhooks/stripe", {
      headers: { "Content-Type": "application/json", "stripe-signature": signature }, data: payload
    });
    expect(result.status()).toBe(200);
    expect((await result.json()).data.duplicate).toBe(duplicate);
  }
  expect(await db.order.count({ where: { buyerId, status: "PAID" } })).toBe(1);
  expect((await db.product.findUniqueOrThrow({ where: { id: ownId } })).stockQuantity).toBe(3);
});
