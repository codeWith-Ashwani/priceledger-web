import { expect, test } from "@playwright/test";

const link =
  "https://www.flipkart.com/nothing-phone-4a-blue-128-gb/p/itm47712249513d4?pid=MOBHQENASR3JJ8BN";
const productId = "flipkart:MOBHQENASR3JJ8BN";
const productRoute = `/?product=${encodeURIComponent(productId)}`;

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
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Product link or brand and model" })
    .fill(link);
  await page.getByRole("button", { name: "Find prices" }).click();
  await expect(page.locator(".product-description h2")).toHaveText(
    "Nothing Phone (4a) (Blue, 128 GB)",
  );
  await expect(page.locator(".offers-table tbody tr")).toHaveCount(1);
  await expect(page.locator(".offers-table")).toContainText("Online");
  await expect(page.locator(".offers-table")).toContainText(
    "Flipkart product page",
  );
  await expect(page.locator(".observed-date")).toContainText("IST");
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
        .locator(".real-product-image img")
        .evaluate(
          (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
        ),
    )
    .toBe(true);
  const image = await page.locator(".real-product-image img").boundingBox();
  const container = await page.locator(".real-product-image").boundingBox();
  expect(image!.height).toBeLessThanOrEqual(container!.height);
  await page.screenshot({
    path: info.outputPath("live-product.png"),
    fullPage: true,
  });
});

test("rejects unsupported links without showing a fake product", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Product link or brand and model" })
    .fill("https://example.com/product");
  await page.getByRole("button", { name: "Find prices" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Use an Amazon India, Flipkart or Meesho product link.",
  );
  await expect(page.locator("#comparison")).toHaveCount(0);
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
