import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

const token = process.env.PRICELEDGER_QA_ADMIN_TOKEN;
const evidenceFile = process.env.PRICELEDGER_QA_HISTORY_FILE;
const qaBase = process.env.PRICELEDGER_QA_API_BASE;

test("admin workspace starts locked and keeps credentials out of storage", async ({
  page,
}) => {
  await page.goto("/?admin=imports");
  await expect(
    page.getByRole("heading", { name: "Connect to the import workspace" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Preview import" }),
  ).toHaveCount(0);
  await page.getByLabel("Admin token").fill("unconfigured-test-only");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(/disabled|credentials/);
  await expect(
    page.getByRole("heading", { name: "Connect to the import workspace" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        Object.values(localStorage).join(" ") +
        Object.values(sessionStorage).join(" "),
    ),
  ).not.toContain("unconfigured-test-only");
});

test("reviews and imports genuine evidence into an isolated QA catalog", async ({
  page,
  request,
}, info) => {
  test.skip(
    !token || !evidenceFile || !qaBase,
    "Requires an isolated API and a genuine local observation export",
  );
  const records = JSON.parse(readFileSync(evidenceFile!, "utf8"));
  records[0].external_event_id += `-${info.project.name}`;
  const productId = records[0].offer_id.replace(/:public-page$/, "");
  const before = await (
    await request.get(`${qaBase}/products/${encodeURIComponent(productId)}`)
  ).json();
  await page.route("**/api/v1/**", async (route) => {
    if (route.request().url().endsWith("/compare"))
      return route.fulfill({
        json: {
          product_id: productId,
          stores: [],
          cached: true,
          checked_at: new Date().toISOString(),
          history_note:
            "QA uses existing genuine evidence; discovery is isolated.",
        },
      });
    const response = await route.fetch({
      url: route
        .request()
        .url()
        .replace(/https?:\/\/[^/]+\/api\/v1/, qaBase!),
    });
    await route.fulfill({ response });
  });
  await page.goto("/?admin=imports");
  await page.getByLabel("Admin token").fill(token!);
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByText("Admin session connected")).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        Object.values(localStorage).join(" ") +
        Object.values(sessionStorage).join(" "),
    ),
  ).not.toContain(token!);
  await page.getByText("Register an approved source", { exact: true }).click();
  const sourceId = `own-export-${info.project.name}-${Date.now()}`;
  await page.getByLabel("Source ID", { exact: true }).fill(sourceId);
  await page
    .getByLabel("Source name", { exact: true })
    .fill(`Own collection export ${info.project.name}`);
  await page
    .getByLabel("Permission or ownership reference")
    .fill(
      "PriceLedger's own recorded observation, used only in an isolated QA replica",
    );
  await page.getByLabel(/I have verified permission/).check();
  await page
    .getByRole("button", { name: "Register source", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Approved source", exact: true }),
  ).toHaveValue(sourceId);
  await page
    .getByRole("combobox", { name: "Tracked listing", exact: true })
    .selectOption(records[0].offer_id);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download JSON template" }).click();
  expect((await download).suggestedFilename()).toBe(
    "priceledger-history-template.json",
  );
  const upload = (rows: unknown) =>
    page.getByLabel("History file", { exact: true }).setInputFiles({
      name: "own-observations.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(rows)),
    });
  await upload([{ ...records[0], retailer_listing_id: "wrong-variant" }]);
  await page
    .getByRole("button", { name: "Preview import", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Import preview" }),
  ).toContainText("1 errors");
  await expect(
    page.getByRole("button", { name: "Commit reviewed import" }),
  ).toBeDisabled();
  await upload(records);
  await page
    .getByRole("button", { name: "Preview import", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Import preview" }),
  ).toContainText("1 new");
  await expect(
    page.getByRole("button", { name: "Commit reviewed import" }),
  ).toBeEnabled();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({
    path: info.outputPath("import-preview.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "Commit reviewed import" }).click();
  await expect(
    page.getByText("Import complete", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Import preview" }),
  ).toContainText("1 observation added");
  const after = await (
    await request.get(`${qaBase}/products/${encodeURIComponent(productId)}`)
  ).json();
  expect(after.offers).toEqual(before.offers);
  await upload(records);
  await page
    .getByRole("button", { name: "Preview import", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Import preview" }),
  ).toContainText("0 new · 1 duplicates");
  await page.getByRole("button", { name: "Commit reviewed import" }).click();
  await expect(
    page.getByRole("region", { name: "Import preview" }),
  ).toContainText("0 observations added");
  await page
    .getByRole("link", { name: "View recorded history", exact: true })
    .click();
  await expect(page.locator(".chart-legend")).toContainText(
    `Own collection export ${info.project.name}`,
  );
  await expect(page.locator(".ledger-panel")).toContainText(
    "Historical import",
  );
  await expect(page.locator(".offers-panel tbody tr")).toHaveCount(
    before.offers.length,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
  ).toBe(false);
  await page.screenshot({
    path: info.outputPath("imported-history.png"),
    fullPage: true,
  });
  await page.goto("/?admin=imports");
  await expect(page.getByLabel("Admin token")).toHaveValue("");
  await expect(
    page.getByRole("heading", { name: "Connect to the import workspace" }),
  ).toBeVisible();
});
