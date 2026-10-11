import { expect, test } from "@playwright/test";

const id = "flipkart:MOBHQENASR3JJ8BN";
const apiBase =
  process.env.PRICELEDGER_TEST_API_URL ?? "http://127.0.0.1:8000/api/v1";

test.afterEach(async ({ page }) =>
  page.unrouteAll({ behavior: "ignoreErrors" }),
);

test("filters all offers, recomputes winners and changes recorded-statistics period", async ({
  page,
  request,
}) => {
  // Browser-only contracts based on an existing genuine listing; never persisted.
  const product = await (await request.get(apiBase + "/products/" + id)).json();
  const base = product.offers[0];
  product.offers = [
    {
      ...base,
      id: "small",
      retailer_id: "small",
      retailer_name: "Small Store",
      item_paise: 100000,
      total_paise: 100000,
      shipping_paise: 0,
      in_stock: true,
      stale: false,
      variant_attributes: { storage_gb: 128 },
    },
    {
      ...base,
      id: "large",
      retailer_id: "large",
      retailer_name: "Large Store",
      item_paise: 200000,
      total_paise: 200000,
      shipping_paise: 0,
      in_stock: true,
      stale: false,
      variant_attributes: { storage_gb: 256 },
    },
    {
      ...base,
      id: "sold",
      retailer_id: "sold",
      retailer_name: "Sold Store",
      item_paise: 100,
      total_paise: 100,
      in_stock: false,
      stale: false,
      variant_attributes: { storage_gb: 256 },
    },
  ];
  await page.route("**/api/v1/products/" + encodeURIComponent(id), (route) =>
    route.fulfill({ json: product }),
  );
  await page.route("**/api/v1/products/*/compare", (route) =>
    route.fulfill({
      json: { product_id: id, stores: [], model_offers: [], cached: true },
    }),
  );
  await page.route("**/api/v1/products/*/insights?**", (route) => {
    const days = Number(
      new URL(route.request().url()).searchParams.get("days"),
    );
    const low = {
      price_paise: days === 30 ? 90000 : 80000,
      observed_at: "2026-10-01T12:00:00Z",
      retailer_name: "Small Store",
      source_name: "Recorded contract",
      offer_id: "small",
    };
    return route.fulfill({
      json: {
        product_id: id,
        days,
        low,
        high: { ...low, price_paise: 200000 },
        daily_average_paise: 150000,
        observed_days: 2,
        method: "Daily best",
        source_policy: "Own first",
      },
    });
  });
  await page.goto("/?product=" + encodeURIComponent(id));
  const panel = page.locator(".offer-comparison");
  await expect(panel.locator(".offer-card")).toHaveCount(3);
  await expect(panel.locator(".offer-card-lowest")).toContainText(
    "Small Store",
  );
  await panel.getByLabel("Storage", { exact: true }).selectOption("256");
  await expect(panel.locator(".offer-card")).toHaveCount(2);
  await expect(panel.locator(".offer-card-lowest")).toContainText(
    "Large Store",
  );
  await expect(panel).toContainText("Among filtered offers");
  await panel.getByLabel("Available and fresh only").check();
  await expect(panel.locator(".offer-card")).toHaveCount(1);
  await panel.getByLabel("Store", { exact: true }).selectOption("small");
  await expect(panel).toContainText("No recorded offers match these filters");
  await panel.getByRole("button", { name: "Reset filters" }).click();
  await expect(panel.locator(".offer-card")).toHaveCount(3);
  const stats = page.getByLabel("Recorded price statistics");
  await expect(stats).toContainText("₹800");
  await page.getByRole("button", { name: "30D", exact: true }).click();
  await expect(stats).toContainText("₹900");
  await expect(stats).toContainText("2 observed days");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("saved target reports reached and safely handles unavailable totals", async ({
  page,
  request,
}) => {
  const product = await (await request.get(apiBase + "/products/" + id)).json();
  const base = product.offers[0];
  product.offers = [
    {
      ...base,
      total_paise: 100000,
      item_paise: 100000,
      shipping_paise: 0,
      in_stock: true,
      stale: false,
      retailer_name: "Target Store",
    },
  ];
  await page.addInitScript(
    ({ id }) =>
      localStorage.setItem(
        "priceledger:watches:v2",
        JSON.stringify([
          {
            productId: id,
            title: "Saved genuine listing",
            targetPaise: 110000,
          },
        ]),
      ),
    { id },
  );
  await page.route("**/api/v1/products/" + encodeURIComponent(id), (route) =>
    route.fulfill({ json: product }),
  );
  await page.goto("/");
  await page.getByRole("button", { name: /My targets/ }).click();
  await expect(page.locator(".target-card")).toContainText("Target reached");
  await expect(page.locator(".target-card")).toContainText("Target Store");
  product.offers[0].in_stock = false;
  await page.locator("a.brand").click();
  await page.getByRole("button", { name: /My targets/ }).click();
  await expect(page.locator(".target-card")).toContainText(
    "No fresh, available exact-variant total is confirmed",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
