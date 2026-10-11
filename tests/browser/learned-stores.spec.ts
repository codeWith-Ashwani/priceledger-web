import { expect, test } from "@playwright/test";

test("owner can pause learned discovery without storing credentials", async ({ page }) => {
  let enabled = true;
  await page.route("**/api/v1/admin/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/status")) {
      expect(route.request().headers()["x-admin-token"]).toBe("contract-only-secret");
      enabled = route.request().postDataJSON().enabled;
      return route.fulfill({ json: { retailer_id: "site-test", enabled } });
    }
    if (path.endsWith("/discovery-stores")) return route.fulfill({ json: [{ retailer_id: "site-test", host: "shop.example.org", brands: ["Test"], enabled, source_active: true }] });
    return route.fulfill({ json: [] });
  });
  await page.goto("/?admin=imports");
  await page.getByLabel("Admin token").fill("contract-only-secret");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  const panel = page.getByRole("region", { name: "Learned stores" });
  await expect(panel).toContainText("Discovery active");
  await panel.getByRole("button", { name: "Pause shop.example.org" }).click();
  await expect(panel).toContainText("Discovery paused");
  expect(enabled).toBe(false);
  await panel.getByRole("button", { name: "Resume shop.example.org" }).click();
  await expect(panel).toContainText("Discovery active");
  expect(await page.evaluate(() => Object.values(localStorage).join() + Object.values(sessionStorage).join())).not.toContain("contract-only-secret");
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(panel).toHaveCount(0);
});

test("observed extra fee changes the subtotal winner inside the comparison", async ({ page, request }) => {
  const id = "flipkart:MOBHQENASR3JJ8BN";
  const original = await (await request.get(`http://127.0.0.1:8100/api/v1/products/${encodeURIComponent(id)}`)).json();
  const base = original.offers[0];
  await page.route(`**/api/v1/products/${encodeURIComponent(id)}`, (route) => route.fulfill({ json: { ...original, offers: [
    { ...base, id: "fee-store", retailer_id: "fee-store", retailer_name: "Fee store", item_paise: 100000, shipping_paise: 0, total_paise: 100000, stale: false, in_stock: true, listed_fees: [{ label: "Protect Promise Fee", amount_paise: 10000, evidence: "page_price_breakdown" }] },
    { ...base, id: "subtotal-store", retailer_id: "subtotal-store", retailer_name: "Subtotal store", item_paise: 105000, shipping_paise: 0, total_paise: 105000, stale: false, in_stock: true, listed_fees: null },
  ] } }));
  await page.route("**/compare", (route) => route.fulfill({ json: { product_id: id, checked_at: new Date().toISOString(), cached: true, history_note: "Controlled browser contract; no observations inserted", stores: [], model_offers: [] } }));
  await page.goto(`/?product=${encodeURIComponent(id)}`);
  const panel = page.locator(".cross-store-panel");
  await expect(panel.locator(".offer-recommendation")).toContainText("Fee store · ₹1,000");
  await expect(panel.getByRole("article", { name: "Fee store offer" })).toContainText("Protect Promise Fee");
  await panel.getByRole("button", { name: "Known subtotal", exact: true }).click();
  await expect(panel.locator(".offer-recommendation")).toContainText("Subtotal store · ₹1,050");
  await expect(panel).toContainText("Other checkout charges may remain unknown");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("pending store check keeps recommendation readable on mobile", async ({ page }) => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => { release = resolve; });
  await page.route("**/compare", async (route) => {
    await blocked;
    await route.fulfill({ json: { stores: [], model_offers: [], cached: true, checked_at: new Date().toISOString() } });
  });
  try {
    await page.goto("/?product=flipkart%3AMOBHQENASR3JJ8BN");
    await expect(page.locator(".scanning-pill")).toBeVisible();
    const bounds = await page.locator(".offer-recommendation > div").boundingBox();
    expect(bounds!.width).toBeGreaterThan(180);
  } finally {
    release();
    await page.unrouteAll({ behavior: "wait" });
  }
});
