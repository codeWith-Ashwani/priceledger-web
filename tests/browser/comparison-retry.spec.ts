import { expect, test } from "@playwright/test";

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "ignoreErrors" });
});

test("brief comparison conflict recovers automatically while keeping recorded offers", async ({
  page,
}) => {
  let attempts = 0;
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/products/*/compare", async (route) => {
    attempts++;
    if (attempts === 1) {
      return route.fulfill({
        status: 409,
        headers: {
          "Retry-After": "1",
          "Access-Control-Expose-Headers": "Retry-After",
        },
        json: {
          detail:
            "This product comparison is already running. Try again shortly.",
        },
      });
    }
    await blocked;
    return route.fulfill({
      json: {
        stores: [],
        model_offers: [],
        cached: true,
        checked_at: new Date().toISOString(),
        history_note: "Controlled response; no records inserted",
      },
    });
  });
  try {
    await page.goto("/?product=flipkart%3AMOBHQENASR3JJ8BN");
    const panel = page.locator(".offer-comparison");
    await expect(panel.locator(".offer-card").first()).toBeVisible();
    await expect(panel.locator(".scanning-pill")).toBeVisible();
    release();
    await expect(
      panel.getByRole("button", { name: "Check stores again" }),
    ).toBeEnabled();
    expect(attempts).toBe(2);
    await expect(panel.getByRole("alert")).toHaveCount(0);
  } finally {
    release();
  }
});

test("persistent busy response stops after three retries and retains recorded offers", async ({
  page,
}) => {
  let attempts = 0;
  await page.route("**/api/v1/products/*/compare", async (route) => {
    attempts++;
    return route.fulfill({
      status: 409,
      headers: {
        "Retry-After": "1",
        "Access-Control-Expose-Headers": "Retry-After",
      },
      json: {
        detail:
          "This product comparison is already running. Try again shortly.",
      },
    });
  });
  await page.goto("/?product=flipkart%3AMOBHQENASR3JJ8BN");
  const panel = page.locator(".offer-comparison");
  await expect(panel.getByRole("alert")).toContainText("already running");
  await expect(panel.locator(".offer-card").first()).toBeVisible();
  await expect(
    panel.getByRole("button", { name: "Check stores again" }),
  ).toBeEnabled();
  expect(attempts).toBe(4);
});

test("leaving comparison cancels a scheduled busy retry", async ({ page }) => {
  await page.clock.install();
  let attempts = 0;
  await page.route("**/api/v1/products/*/compare", async (route) => {
    attempts++;
    return route.fulfill({
      status: 409,
      headers: {
        "Retry-After": "15",
        "Access-Control-Expose-Headers": "Retry-After",
      },
      json: { detail: "Comparison is already running" },
    });
  });
  await page.goto("/?product=flipkart%3AMOBHQENASR3JJ8BN");
  await expect.poll(() => attempts).toBe(1);
  await expect(page.locator(".scanning-pill")).toBeVisible();
  await page.getByRole("button", { name: /My targets/ }).click();
  await expect(page.locator(".offer-comparison")).toHaveCount(0);
  await page.clock.fastForward(16_000);
  expect(attempts).toBe(1);
});
