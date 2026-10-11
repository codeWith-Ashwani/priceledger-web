import { expect, test } from "@playwright/test";
import type { ComparisonScan, ProductDetail } from "../../src/api";

// Genuine owner-submitted product. Run after looking it up with the updated API.
// Retailer access and live stock can change; no synthetic catalog records are created.
test("actual iPhone link includes automatic reseller discovery and honest availability", async ({ page }, info) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  const detailResponse = page.waitForResponse(response =>
    /\/products\/flipkart(?::|%3A)MOBHQV9YDG7CGRAM$/.test(response.url()),
  );
  const scanResponse = page.waitForResponse(response =>
    response.url().includes("MOBHQV9YDG7CGRAM/compare") && response.request().method() === "POST",
    { timeout: 90000 },
  );
  await page.goto("/?product=flipkart%3AMOBHQV9YDG7CGRAM");
  const detail = await (await detailResponse).json() as ProductDetail;
  const scan = await (await scanResponse).json() as ComparisonScan;
  await expect(page.locator(".product-description h2")).toContainText("iPhone 17");
  const panel = page.locator(".offer-comparison");
  for (const store of ["Flipkart", "Amazon", "iPlanet", "Imagine"]) {
    const cards = panel.getByRole("article", { name: store + " offer", exact: true });
    await expect(cards.first()).toBeVisible();
    await cards.first().scrollIntoViewIfNeeded();
    await expect.poll(() => cards.first().locator(".real-product-image img").evaluate(
      (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
    )).toBe(true);
  }
  await expect(panel).toContainText("4 stores matched");
  await expect(panel).not.toContainText("AppleCare");
  const offers = [...detail.offers, ...scan.model_offers];
  const available = offers.filter(offer => offer.channel === "online" && offer.in_stock && !offer.stale && offer.item_paise !== null);
  const minimum = Math.min(...available.map(offer => offer.item_paise!));
  for (const offer of offers) {
    const card = panel.getByRole("article", { name: offer.retailer_name + " offer", exact: true })
      .filter({ has: page.getByRole("heading", { name: offer.title ?? detail.title, exact: true }) });
    const winner = available.some(item => item.id === offer.id) && offer.item_paise === minimum;
    await expect(card.locator(".offer-lowest-badge")).toHaveCount(winner ? 1 : 0);
    if (offer.availability === "out_of_stock") await expect(card).toContainText("Out of stock");
  }
  await page.getByRole("button", { name: "Exact variant", exact: true }).click();
  await expect(panel.locator(".offer-card")).toHaveCount(detail.offers.length);
  await page.getByRole("button", { name: "Same model", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
  await panel.screenshot({ path: info.outputPath("actual-iphone-stores.png"), style: ".site-header, .skip-link { visibility: hidden !important; }" });
});
