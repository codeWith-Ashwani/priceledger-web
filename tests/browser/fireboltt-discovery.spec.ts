import { expect, test } from "@playwright/test";
import type { Offer } from "../../src/api";

// Optional real-catalog regression: IDs are supplied by isolated live API QA.
// No fixtures, intercepted prices, or synthetic observations are stored.
const ids = (process.env.PRICELEDGER_TEST_FIREBOLTT_IDS ?? "")
  .split(",")
  .filter(Boolean);
const api = process.env.PRICELEDGER_TEST_API_URL ?? "http://127.0.0.1:8000/api/v1";

test("verified official watch evidence and matching marketplace offers render together", async ({ page, request }, info) => {
  test.skip(ids.length === 0, "Provide genuine Fire-Boltt product IDs after live adapter QA");
  test.setTimeout(90_000);
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  for (const id of ids) {
    const response = await request.get(`${api}/products/${encodeURIComponent(id)}`);
    expect(response.ok()).toBe(true);
    const product = await response.json();
    expect(product.brand).toBe("Fire-Boltt");
    const checked = page.waitForResponse(response => response.url().endsWith("/compare") && response.status() === 200);
    await page.goto(`/?product=${encodeURIComponent(id)}`);
    const scan = await (await checked).json();
    await expect(page.locator(".product-description h2")).toHaveText(product.title);
    const panel = page.locator(".offer-comparison");
    const official = panel.getByRole("article", { name: "Fire-Boltt Official Store offer", exact: true });
    await expect(official).toBeVisible();
    const own = product.offers.find((offer: { retailer_name: string }) => offer.retailer_name === "Fire-Boltt Official Store");
    expect(own).toBeTruthy();
    if (own.availability === "out_of_stock") {
      await expect(official).toContainText("Out of stock");
      await expect(official.locator(".offer-lowest-badge")).toHaveCount(0);
    }
    if (own.shipping_paise === null) await expect(official).toContainText("DeliveryNot confirmed");
    const returned: Offer[] = [...new Map<string, Offer>([...product.offers, ...scan.model_offers].map((offer: Offer) => [offer.id, offer])).values()];
    const unique = new Set(returned.map(offer => offer.id));
    await expect(panel.locator(".offer-card")).toHaveCount(unique.size);
    for (const offer of scan.model_offers) {
      await expect(panel).toContainText(offer.title);
    }
    const available = returned.filter(offer => offer.channel === "online" && offer.in_stock && !offer.stale && offer.item_paise !== null);
    const lowest = available.length ? Math.min(...available.map(offer => offer.item_paise!)) : null;
    const winners = available.filter(offer => offer.item_paise === lowest);
    await expect(panel.locator(".offer-lowest-badge")).toHaveCount(winners.length);
    for (const offer of winners) await expect(panel.locator(".offer-recommendation")).toContainText(offer.retailer_name);
    const history = await (await request.get(`${api}/products/${encodeURIComponent(id)}/history`)).json();
    expect(history.series.every((series: { retailer_id: string }) => series.retailer_id === own.retailer_id)).toBe(true);
    await panel.getByRole("button", { name: "Exact variant", exact: true }).click();
    await expect(panel.locator(".offer-card")).toHaveCount(product.offers.length);
    await panel.getByRole("button", { name: "Same model", exact: true }).click();
    await expect(panel.locator(".offer-card")).toHaveCount(unique.size);
    await expect.poll(() => official.locator("img").evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth > 0)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await panel.screenshot({ path: info.outputPath(`${product.attributes.model.replaceAll(" ", "-")}-stores.png`) });
  }
  expect(errors).toEqual([]);
});
