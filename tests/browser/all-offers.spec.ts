import { expect, test } from "@playwright/test";

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("shows all twelve matched stores and ranks across the full set", async ({ page }) => {
  // Controlled browser responses only; these offers are never persisted.
  await page.route("**/api/v1/products/*/compare", route => route.fulfill({ json: {
    product_id: "flipkart:MOBHQENASR3JJ8BN", checked_at: new Date().toISOString(),
    cached: false, stores: [], model_offers: [], history_note: "Controlled coverage contract",
  } }));
  await page.route("**/api/v1/products/*", async route => {
    if (route.request().method() !== "GET" || /\/(history|assessment|compare)/.test(route.request().url())) {
      return route.continue();
    }
    const product = await (await route.fetch()).json();
    const base = product.offers[0];
    product.offers = Array.from({ length: 12 }, (_, index) => ({
      ...base, id: `coverage-${index}`, retailer_id: `coverage-${index}`,
      retailer_name: `Coverage Store ${index + 1}`, product_url: null,
      item_paise: index === 10 ? 100 : index === 11 ? 100000 : 200000 + index * 100,
      shipping_paise: 0, listed_fees: null, stale: false,
      in_stock: index !== 10, availability: index === 10 ? "out_of_stock" : "in_stock",
    }));
    await route.fulfill({ json: product });
  });
  await page.goto("/?product=flipkart%3AMOBHQENASR3JJ8BN");
  const panel = page.locator(".offer-comparison");
  await expect(panel.locator(".offer-card")).toHaveCount(12);
  await expect(panel).toContainText("12 stores matched");
  await expect(panel).toContainText("All verified offers from connected stores");
  await expect(panel.getByRole("article", { name: "Coverage Store 12 offer", exact: true })
    .locator(".offer-lowest-badge")).toBeVisible();
  await expect(panel.getByRole("article", { name: "Coverage Store 11 offer", exact: true })
    .locator(".offer-lowest-badge")).toHaveCount(0);
  await expect(panel).toContainText("11 currently available stores");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
