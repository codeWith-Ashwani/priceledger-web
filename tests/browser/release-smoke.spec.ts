import { expect, test } from "@playwright/test";

test.afterEach(async ({ page }) =>
  page.unrouteAll({ behavior: "ignoreErrors" }),
);

test("compiled entry starts empty and has keyboard-accessible lookup", async ({
  page,
}) => {
  let lookups = 0;
  await page.route("**/api/v1/**", (route) => {
    lookups++;
    return route.fulfill({
      status: 503,
      json: { detail: "Contract unavailable" },
    });
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Start with the product you want." }),
  ).toBeVisible();
  await expect(page.locator(".offer-card")).toHaveCount(0);
  expect(lookups).toBe(0);
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to content" }),
  ).toBeFocused();
  await page
    .getByRole("textbox", { name: "Product link or brand and model" })
    .fill("Contract brand model");
  await page.getByRole("button", { name: "Find prices" }).click();
  await expect(page.getByRole("alert")).toContainText("Contract unavailable");
  await expect(page.getByRole("button", { name: "Find prices" })).toBeEnabled();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("unreadable gateway responses expose no response internals", async ({
  page,
}) => {
  await page.route("**/api/v1/lookup", (route) =>
    route.fulfill({
      status: 502,
      contentType: "text/html",
      body: "<h1>PRIVATE gateway diagnostics</h1>",
    }),
  );
  await page.goto("/");
  await page
    .getByRole("textbox", { name: "Product link or brand and model" })
    .fill("Contract brand model");
  await page.getByRole("button", { name: "Find prices" }).click();
  await expect(page.getByRole("alert")).toContainText("unreadable response");
  await expect(page.locator("body")).not.toContainText(
    "PRIVATE gateway diagnostics",
  );
});

test("unexpected render failures offer a working reload", async ({ page }) => {
  let malformed = true;
  await page.route("**/api/v1/**", (route) => {
    if (
      route.request().url().endsWith("/products/contract-render-failure") &&
      malformed
    )
      return route.fulfill({
        json: { id: "contract-render-failure", offers: null },
      });
    return route.fulfill({
      status: 404,
      json: { detail: "Contract record unavailable" },
    });
  });
  await page.goto("/?product=contract-render-failure");
  await expect(page.getByRole("alert")).toContainText(
    "PriceLedger couldn’t display this page.",
  );
  malformed = false;
  await page.getByRole("button", { name: "Reload PriceLedger" }).click();
  await expect(
    page.getByRole("textbox", { name: "Product link or brand and model" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Reload PriceLedger" }),
  ).toHaveCount(0);
});
