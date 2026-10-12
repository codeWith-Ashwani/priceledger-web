import { expect, test } from "@playwright/test";

const link =
  "https://www.flipkart.com/nothing-phone-4a-blue-128-gb/p/itm47712249513d4?pid=MOBHQENASR3JJ8BN";
const productId = "flipkart:MOBHQENASR3JJ8BN";
const productRoute = `/?product=${encodeURIComponent(productId)}`;

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

// These live checks use the actual user-supplied listing recorded by the local API.
// Failure and search-discovery contracts are intercepted where stated.
test("starts with user input and no sample catalog", async ({ page }) => {
  let lookups = 0;
  page.on("request", (request) => {
    if (request.url().endsWith("/lookup")) lookups++;
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Start with the product you want." }),
  ).toBeVisible();
  await expect(page.locator(".product-card")).toHaveCount(0);
  await expect(page.locator("#comparison")).toHaveCount(0);
  await expect(page.getByText("Sample workspace.")).toHaveCount(0);
  expect(lookups).toBe(0);
});

test("looks up the user's actual link with dated Flipkart evidence", async ({
  page,
}, info) => {
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("same key")) {
      errors.push(message.text());
    }
  });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Product link or brand and model" })
    .fill(link);
  await page.getByRole("button", { name: "Find prices" }).click();
  await expect(page.locator(".product-description h2")).toHaveText(
    "Nothing Phone (4a) (Blue, 128 GB)",
    { timeout: 45_000 },
  );
  await expect(
    page.locator(".offers-panel .offers-table tbody tr"),
  ).toHaveCount(1);
  await expect(page.locator(".offers-panel .offers-table")).toContainText(
    "Online",
  );
  await expect(page.locator(".offers-panel .offers-table")).toContainText(
    "Flipkart product page",
  );
  await expect(page.locator(".offers-panel .observed-date")).toContainText(
    "IST",
  );
  await expect(page.locator(".history-svg")).toBeVisible();
  expect(
    await page.locator(".history-svg circle").count(),
  ).toBeGreaterThanOrEqual(1);
  await expect(
    page.getByText("No local estimate for this variant yet."),
  ).toBeVisible();
  await expect(page.locator(".store-name a")).toHaveAttribute("href", link);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
  await expect
    .poll(async () =>
      page
        .locator(".product-overview .real-product-image img")
        .evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
    )
    .toBe(true);
  const image = await page
    .locator(".product-overview .real-product-image img")
    .boundingBox();
  const container = await page
    .locator(".product-overview .real-product-image")
    .boundingBox();
  expect(image!.height).toBeLessThanOrEqual(container!.height);
  await expect(page.locator(".cross-store-result")).toHaveCount(4, {
    timeout: 45000,
  });
  await expect(
    page.getByRole("heading", { name: "Where that price was recorded" }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("live-product.png"),
    fullPage: true,
  });
  await page.locator(".offer-comparison").screenshot({
    path: info.outputPath("live-offer-cards.png"),
    style: ".site-header, .skip-link { visibility: hidden !important; }",
  });
});

test("four-store card contract compares ratings and available prices without leaving the page", async ({
  page,
}, info) => {
  // Controlled API response only: these offers never enter the real product database.
  await page.route("**/api/v1/products/*/compare", (route) =>
    route.fulfill({
      json: {
        product_id: productId,
        checked_at: new Date().toISOString(),
        cached: false,
        stores: [],
        history_note: "Controlled comparison contract",
      },
    }),
  );
  await page.route("**/api/v1/products/*", async (route) => {
    if (
      route.request().method() !== "GET" ||
      /\/(history|assessment|compare)/.test(route.request().url())
    )
      return route.continue();
    const data = await (await route.fetch()).json();
    const base = data.offers[0];
    data.offers = [
      { name: "Store Alpha", price: 3200000, shipping: null, available: true },
      { name: "Store Beta", price: 3300000, shipping: 20000, available: true },
      { name: "Store Gamma", price: 3400000, shipping: 0, available: true },
      { name: "Store Delta", price: 3000000, shipping: 0, available: false },
    ].map((item, index) => ({
      ...base,
      id: `contract-${index}`,
      retailer_id: `contract-${index}`,
      retailer_name: item.name,
      title: data.title,
      image_url: data.image_url,
      item_paise: item.price,
      shipping_paise: item.shipping,
      total_paise: item.shipping === null ? null : item.price + item.shipping,
      listed_fees: null,
      in_stock: item.available,
      availability: item.available ? "in_stock" : "out_of_stock",
      stale: false,
      rating: index === 3 ? null : { value: 4.3, best: 5, count: 120 },
      product_url: null,
    }));
    await route.fulfill({ json: data });
  });
  await page.goto(productRoute);
  const panel = page.locator(".offer-comparison");
  await expect(panel.locator(".offer-card")).toHaveCount(4);
  await expect(panel).toContainText("4 stores matched");
  const alpha = page.getByRole("article", {
    name: "Store Alpha offer",
    exact: true,
  });
  const beta = page.getByRole("article", {
    name: "Store Beta offer",
    exact: true,
  });
  const delta = page.getByRole("article", {
    name: "Store Delta offer",
    exact: true,
  });
  await expect(alpha.getByRole("heading")).toHaveText(
    "Nothing Phone (4a) (Blue, 128 GB)",
  );
  await expect(alpha.locator(".real-product-image img")).toHaveCount(1);
  await expect(alpha.locator(".offer-rating")).toContainText("4.3/5");
  await expect(alpha.locator(".offer-rating")).toContainText(
    "120 feedback entries",
  );
  await expect(delta).toContainText("Rating not provided by this store");
  await expect(delta).toContainText("Out of stock");
  await expect(alpha.locator(".offer-lowest-badge")).toBeVisible();
  await expect(delta.locator(".offer-lowest-badge")).toHaveCount(0);
  await expect(panel.locator(".offer-recommendation")).toContainText(
    "Store Alpha · ₹32,000",
  );
  await panel
    .getByRole("button", { name: "Known subtotal", exact: true })
    .click();
  await expect(beta.locator(".offer-lowest-badge")).toBeVisible();
  await expect(alpha.locator(".offer-lowest-badge")).toHaveCount(0);
  await expect(panel.locator(".offer-recommendation")).toContainText(
    "Store Beta · ₹33,200",
  );
  await expect(panel.locator(".offer-recommendation")).toContainText(
    "unknown delivery are excluded",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await panel.screenshot({
    path: info.outputPath("controlled-offer-cards.png"),
    style: ".site-header, .skip-link { visibility: hidden !important; }",
  });
});

test("rejects unsupported links without showing a fake product", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Product link or brand and model" })
    .fill("http://127.0.0.1/private");
  await page.getByRole("button", { name: "Find prices" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Use a public ecommerce product link",
  );
  await expect(page.locator("#comparison")).toHaveCount(0);
});

test("single-store results explain unreadable searches and blocked retailers", async ({
  page,
}) => {
  // Explicit discovery-failure contract; no offers or prices are inserted.
  await page.route("**/api/v1/products/*/compare", (route) =>
    route.fulfill({
      json: {
        product_id: productId,
        checked_at: new Date().toISOString(),
        cached: false,
        history_note: "Controlled failure contract",
        stores: [
          {
            retailer: "croma",
            retailer_name: "Croma",
            status: "retailer_blocked",
            message: "The store did not allow this lookup.",
            search_url: "https://www.croma.com/searchB",
            items: [],
          },
          {
            retailer: "amazon",
            retailer_name: "Amazon",
            status: "no_matches",
            message:
              "The search returned no readable candidates. The store may still stock this product.",
            search_url: "https://www.amazon.in/s",
            items: [],
          },
        ],
      },
    }),
  );
  await page.goto(productRoute);
  const checks = page.locator(".store-check-details");
  await expect(checks).toHaveAttribute("open", "");
  await expect(
    checks.getByText("Store blocked access", { exact: true }),
  ).toBeVisible();
  await expect(
    checks.getByText("No readable candidates", { exact: true }),
  ).toBeVisible();
  await expect(checks).toContainText("may still stock this product");
});

test("actual iQOO listing compares Amazon with the exact official-store SKU", async ({
  page,
}, info) => {
  // Genuine recorded retailer observations; the local API must have this lookup available.
  await page.goto("/?product=amazon%3AB0H1WY1D37");
  await expect(page.locator(".product-description h2")).toContainText(
    "Solar Flame, 4GB RAM, 128GB Storage",
  );
  const official = page
    .getByRole("article", {
      name: "iQOO Official Store offer",
      exact: true,
    })
    .filter({ hasText: "4GB+128GB Solar Flame" });
  await expect(official).toBeVisible({ timeout: 45000 });
  await expect(official.getByRole("heading")).toContainText(
    "4GB+128GB Solar Flame",
  );
  await official.scrollIntoViewIfNeeded();
  await expect
    .poll(
      async () =>
        official
          .locator(".real-product-image img")
          .evaluate(
            (image: HTMLImageElement) =>
              image.complete && image.naturalWidth > 0,
          ),
      { timeout: 15000 },
    )
    .toBe(true);
  await expect(
    official.getByRole("link", { name: "Visit store" }),
  ).toHaveAttribute("href", "https://shop.iqoo.com/in/product/2077?skuId=8478");
  await expect(
    page.getByRole("article", { name: "Amazon offer", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Exact variant", exact: true })
    .click();
  await expect(official).toBeVisible();
  await expect(page.locator(".offer-recommendation")).toContainText(
    "Among exact variants.",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".offer-comparison").screenshot({
    path: info.outputPath("actual-iqoo-offers.png"),
    style: ".site-header, .skip-link { visibility: hidden !important; }",
  });
});

test("model scope ranks labelled variants without changing exact history", async ({
  page,
}) => {
  // Controlled comparison payload only; no synthetic prices enter persistent storage.
  await page.route("**/api/v1/products/*/compare", async (route) => {
    const response = await page.request.get(
      route
        .request()
        .url()
        .replace(/\/compare$/, ""),
    );
    const detail = await response.json();
    await route.fulfill({
      json: {
        product_id: productId,
        stores: [],
        checked_at: new Date().toISOString(),
        cached: false,
        history_note: "Controlled model comparison contract",
        model_offers: [
          {
            ...detail.offers[0],
            id: "controlled-model-offer",
            product_id: "controlled-model-variant",
            retailer_id: "controlled",
            retailer_name: "Variant store",
            title: "Nothing Phone (4a) (Red, 256 GB)",
            match_scope: "model",
            differences: [
              { attribute: "storage_gb", requested: 128, offered: 256 },
            ],
            item_paise: 1000000,
            shipping_paise: null,
            total_paise: null,
            in_stock: true,
            availability: "in_stock",
            stale: false,
            observed_at: new Date().toISOString(),
          },
        ],
      },
    });
  });
  await page.goto(productRoute);
  const variant = page.getByRole("article", {
    name: "Variant store offer",
    exact: true,
  });
  await expect(variant).toBeVisible();
  await expect(variant).toContainText("Storage (GB): 256 (requested 128)");
  await expect(
    variant.getByRole("link", { name: "This variant’s history" }),
  ).toHaveAttribute("href", "/?product=controlled-model-variant");
  await expect(page.locator(".offer-recommendation")).toContainText(
    "Variant store · ₹10,000",
  );
  await expect(page.locator(".offers-panel tbody tr")).toHaveCount(1);
  await expect(page.locator(".chart-legend")).not.toContainText(
    "Variant store",
  );
  await page
    .getByRole("button", { name: "Exact variant", exact: true })
    .click();
  await expect(variant).toHaveCount(0);
  await expect(page.locator(".offer-recommendation")).toContainText(
    "Among exact variants.",
  );
  await page.getByRole("button", { name: "Same model", exact: true }).click();
  await expect(variant).toBeVisible();
  await page
    .getByRole("button", { name: "Known subtotal", exact: true })
    .click();
  await expect(variant.locator(".offer-lowest-badge")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("shows retailer access failure and lets the user try another input", async ({
  page,
}) => {
  await page.route("**/api/v1/lookup", (route) =>
    route.fulfill({
      status: 502,
      contentType: "application/json",
      body: JSON.stringify({
        detail: {
          code: "retailer_blocked",
          message: "Meesho did not allow this lookup. No price was recorded.",
        },
      }),
    }),
  );
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Product link or brand and model" })
    .fill("https://www.meesho.com/test/p/123");
  await page.getByRole("button", { name: "Find prices" }).click();
  await expect(page.getByRole("alert")).toContainText("No price was recorded.");
  await expect(page.locator("#comparison")).toHaveCount(0);
  await page.unroute("**/api/v1/lookup");
  await page
    .getByRole("textbox", { name: "Product link or brand and model" })
    .fill(link);
  await page.getByRole("button", { name: "Find prices" }).click();
  await expect(page.locator(".product-description h2")).toContainText(
    "Nothing Phone",
  );
});

test("brand/model candidates require an exact listing selection", async ({
  page,
}) => {
  await page.route("**/api/v1/lookup", (route) => {
    if (route.request().postDataJSON().query !== "Nothing Phone 4a")
      return route.continue();
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        kind: "search",
        query: "Nothing Phone 4a",
        message: "Choose an exact listing.",
        stores: [
          {
            retailer: "flipkart",
            retailer_name: "Flipkart",
            status: "ok",
            message: "Choose the exact variant.",
            search_url: "https://www.flipkart.com/search?q=Nothing+Phone+4a",
            items: [
              {
                title: "Nothing Phone (4a) (Blue, 128 GB)",
                url: link,
                retailer: "flipkart",
                retailer_name: "Flipkart",
              },
            ],
          },
        ],
      }),
    });
  });
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Product link or brand and model" })
    .fill("Nothing Phone 4a");
  await page.getByRole("button", { name: "Find prices" }).click();
  await expect(page.locator(".listing-result")).toHaveCount(1);
  await expect(page.locator("#comparison")).toHaveCount(0);
  await page.locator(".listing-result").click();
  await expect(page.locator(".product-description h2")).toContainText(
    "Nothing Phone",
  );
});

test("inspects recorded dates and requests the complete recorded range", async ({
  page,
}) => {
  await page.goto(productRoute);
  await expect(page.locator(".history-svg")).toBeVisible();
  const request = page.waitForRequest(
    (request) =>
      request.url().includes("days=36500") &&
      request.url().includes("basis=item"),
  );
  await page.getByRole("button", { name: "All", exact: true }).click();
  await request;
  await page.getByRole("slider", { name: "Inspect history date" }).focus();
  await expect(page.locator(".chart-tooltip")).toBeVisible();
  await expect(page.locator(".chart-tooltip")).toContainText("IST");
  await expect(page.locator(".chart-tooltip")).toContainText("Flipkart");
});

test("saves and removes a real product target", async ({ page }) => {
  await page.goto(productRoute);
  await page.getByRole("button", { name: "Set my target" }).click();
  await page
    .getByRole("textbox", { name: "Target price in rupees" })
    .fill("35000");
  await page.getByRole("button", { name: "Save target" }).click();
  await page.reload();
  await page.getByRole("button", { name: /My targets/ }).click();
  await expect(page.locator(".target-card")).toContainText("Nothing Phone");
  await expect(page.locator(".target-card")).toContainText("₹35,000");
  await page.getByRole("button", { name: /Remove target for/ }).click();
  await expect(page.locator(".target-card")).toHaveCount(0);
});

test("verified-match UI contract shows two retailers and their past price rows", async ({
  page,
}) => {
  // Explicit intercepted contract, isolated from real retailer observations and storage.
  await page.route("**/api/v1/products/*/compare", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        product_id: productId,
        checked_at: new Date().toISOString(),
        cached: false,
        history_note: "Recorded evidence only",
        stores: [
          {
            retailer: "contract",
            retailer_name: "Contract store",
            status: "verified",
            message: "Matching offer joined the comparison.",
            search_url: "https://store.example.org/search",
            items: [],
          },
        ],
      }),
    }),
  );
  await page.route("**/api/v1/products/*/history?*", async (route) => {
    const data = await (await route.fetch()).json();
    const series = data.series[0];
    data.series.push({
      ...series,
      series_id: "contract-series",
      offer_id: "contract-offer",
      retailer_id: "contract",
      name: "Contract store",
      source_name: "Controlled browser contract",
      product_url: null,
      color: "#155c45",
      points: series.points.map((point: Record<string, unknown>) => ({
        ...point,
        item_paise: 3500000,
        total_paise: 3500000,
        price_paise: 3500000,
        listed_fees: null,
      })),
    });
    await route.fulfill({ json: data });
  });
  await page.route("**/api/v1/products/*", async (route) => {
    if (
      route.request().method() !== "GET" ||
      /\/(history|assessment|compare)/.test(route.request().url())
    )
      return route.continue();
    const data = await (await route.fetch()).json();
    data.offers.push({
      ...data.offers[0],
      id: "contract-offer",
      retailer_id: "contract",
      retailer_name: "Contract store",
      source_name: "Controlled browser contract",
      product_url: null,
      item_paise: 3500000,
      total_paise: 3500000,
      listed_fees: null,
    });
    data.best_price_paise = 3500000;
    await route.fulfill({ json: data });
  });
  await page.goto(productRoute);
  await expect(page.locator(".offers-panel tbody tr")).toHaveCount(2);
  await expect(page.locator(".chart-legend")).toContainText("Contract store");
  await expect(page.locator(".ledger-panel")).toContainText(
    "Controlled browser contract",
  );
  await expect(page.locator(".best-price strong")).toHaveText("₹35,000");
});

test("shows genuine history coverage and expandable price evidence", async ({
  page,
}) => {
  await page.goto(productRoute);
  const panel = page.getByRole("region", { name: "History coverage" });
  await expect(
    panel.getByRole("heading", { name: "How much history do we have?" }),
  ).toBeVisible();
  await expect(panel).toContainText("Flipkart");
  await expect(panel).toContainText(/observed days?/);
  await expect(panel).toContainText(
    "no automatic historical provider is connected",
  );
  await expect(panel).toContainText("Next eligible check");
  const evidence = page.locator(".price-evidence").first();
  await evidence.locator("summary").click();
  await expect(evidence).toContainText(/variant was not saved|sku:/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("failed collection keeps evidence separate from the last recorded price", async ({
  page,
}) => {
  // Exercise a failure UI contract using the real coverage response; no database prices are inserted.
  await page.route("**/products/*/coverage", async (route) => {
    const response = await route.fetch();
    const data = await response.json();
    data.stores = data.stores.map((store: Record<string, unknown>) => ({
      ...store,
      collection_status: "queued",
      consecutive_failures: 1,
      last_check: {
        outcome: "failure",
        error_code: "connection_failed",
        at: new Date().toISOString(),
      },
    }));
    await route.fulfill({ response, json: data });
  });
  await page.goto(productRoute);
  await expect(page.locator(".coverage-failure")).toContainText(
    "failed checks add no price",
  );
  await expect(page.locator(".offers-panel .offers-table")).toContainText(
    "Flipkart product page",
  );
  expect(await page.locator(".history-svg circle").count()).toBeGreaterThan(0);
});
