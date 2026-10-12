import { expect, test, type Page } from "@playwright/test";

const product = "flipkart:MOBHQENASR3JJ8BN";
const checked = "2026-10-12T10:00:00+00:00";
const reportId = "f34fcb18-772b-4616-b530-3cb55edf0ce7";
const snapshot = {
  product_id: product,
  title: "Captured contract model",
  brand: "Contract",
  retailer_name: "Contract store",
  source_name: "Controlled source",
  product_url: "https://example.org/contract",
  item_paise: 10000,
  shipping_paise: null,
  observed_at: checked,
  in_stock: true,
  condition: "unknown",
  seller: "unknown",
  region: "IN",
  variant_attributes: { storage: "128 GB" },
  comparison: {
    product_id: product,
    title: "Compared contract model",
    brand: "Contract",
    variant_attributes: { storage: "256 GB" },
  },
};
const report = {
  id: reportId,
  offer_id: "contract-offer",
  reason: "wrong_product",
  status: "open",
  revision: 1,
  created_at: checked,
  updated_at: checked,
  details:
    "<img src=x onerror=alert(1)> Model differs from the submitted listing.",
  snapshot,
};
const pageOf = (
  items: unknown[],
  total = items.length,
  offset = 0,
  limit = 25,
) => ({ items, total, offset, limit });

test.afterEach(async ({ page }) =>
  page.unrouteAll({ behavior: "ignoreErrors" }),
);

async function openReport(page: Page) {
  await page.route("**/api/v1/products/*/compare", (route) =>
    route.fulfill({
      json: {
        stores: [],
        model_offers: [],
        cached: true,
        checked_at: checked,
        history_note: "Controlled comparison; no records inserted",
      },
    }),
  );
  await page.goto(`/?product=${encodeURIComponent(product)}`);
  await page
    .locator(".offer-card")
    .first()
    .getByRole("button", { name: "Report an issue" })
    .click();
  const dialog = page.getByRole("dialog", { name: "Report an offer issue" });
  await expect(dialog).toBeVisible();
  return dialog;
}

test("public report retries reuse the submission identity and confirm only accepted receipts", async ({
  page,
}) => {
  const bodies: Record<string, unknown>[] = [];
  await page.route("**/api/v1/reports", async (route) => {
    bodies.push(route.request().postDataJSON());
    expect(route.request().headers()["x-admin-token"]).toBeUndefined();
    if (bodies.length === 1)
      return route.fulfill({
        status: 503,
        json: { detail: "Try the same submission again." },
      });
    return route.fulfill({
      status: 200,
      json: { report_id: reportId, recorded_at: checked, replayed: true },
    });
  });
  const dialog = await openReport(page);
  await dialog.getByLabel("What needs checking?").selectOption("wrong_product");
  await dialog
    .getByLabel("Issue details")
    .fill("The model on this offer is different.");
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByRole("alert")).toHaveText(
    "Try the same submission again.",
  );
  await expect(
    dialog.getByText("Report received", { exact: true }),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByRole("status")).toContainText(reportId);
  expect(bodies).toHaveLength(2);
  expect(bodies[1]).toEqual(bodies[0]);
  expect(bodies[0].request_id).toMatch(/^[a-f0-9-]{36}$/);
  expect(bodies[0].comparison_product_id).toBe(product);
  expect(bodies[0].offer_id).toBeTruthy();
  expect(typeof bodies[0].in_stock).toBe("boolean");
  expect(Object.keys(bodies[0]).sort()).toEqual([
    "comparison_product_id",
    "details",
    "in_stock",
    "item_paise",
    "observed_at",
    "offer_id",
    "reason",
    "request_id",
  ]);
  expect(
    await page.evaluate(
      () =>
        Object.values(localStorage).join() +
        Object.values(sessionStorage).join(),
    ),
  ).not.toContain("The model on this offer is different.");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await dialog.getByRole("button", { name: "Done", exact: true }).click();
  await expect(dialog).toHaveCount(0);
});

test("changed quotes and invalid receipts remain errors; edited reports get a new identity", async ({
  page,
}) => {
  const bodies: Record<string, unknown>[] = [];
  await page.route("**/api/v1/reports", (route) => {
    bodies.push(route.request().postDataJSON());
    return route.fulfill(
      bodies.length === 1
        ? {
            status: 409,
            json: {
              detail:
                "The recorded offer changed. Refresh prices before reporting.",
            },
          }
        : { status: 201, json: {} },
    );
  });
  const dialog = await openReport(page);
  await dialog.getByLabel("Issue details").fill("The price needs checking.");
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByRole("alert")).toContainText("Refresh prices");
  await dialog
    .getByLabel("Issue details")
    .fill("The price and stock need checking.");
  await dialog.getByRole("button", { name: "Send report" }).click();
  await expect(dialog.getByRole("alert")).toContainText(
    "could not be confirmed",
  );
  expect(bodies).toHaveLength(2);
  expect(bodies[0].request_id).not.toBe(bodies[1].request_id);
  await expect(
    dialog.getByText("Report received", { exact: true }),
  ).toHaveCount(0);
});

test("report timeout supports a manual retry with the same identity", async ({
  page,
}) => {
  await page.clock.install();
  const bodies: Record<string, unknown>[] = [];
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/reports", async (route) => {
    bodies.push(route.request().postDataJSON());
    if (bodies.length === 1) await blocked;
    return route
      .fulfill({
        status: 200,
        json: { report_id: reportId, recorded_at: checked, replayed: true },
      })
      .catch(() => {});
  });
  try {
    const dialog = await openReport(page);
    await dialog.getByLabel("Issue details").fill("Please verify this quote.");
    await dialog.getByRole("button", { name: "Send report" }).click();
    await expect.poll(() => bodies.length).toBe(1);
    await expect(
      dialog.getByRole("button", { name: "Close report dialog" }),
    ).toBeDisabled();
    await page.clock.fastForward(16000);
    await expect(dialog.getByRole("alert")).toContainText("timed out");
    await dialog.getByRole("button", { name: "Send report" }).click();
    await expect(dialog.getByRole("status")).toContainText("Report received");
    expect(bodies[1]).toEqual(bodies[0]);
  } finally {
    release();
  }
});

test("owner queue paginates, reviews snapshots and audits with optimistic revisions", async ({
  page,
}) => {
  let revision = 1;
  let status = "open";
  let savedNote = "";
  let conflict = true;
  const reads: URL[] = [];
  await page.route("**/api/v1/admin/**", async (route) => {
    const url = new URL(route.request().url());
    expect(route.request().headers()["x-admin-token"]).toBe(
      "contract-report-secret",
    );
    if (!url.pathname.includes("/reports"))
      return route.fulfill(
        url.pathname.includes("/collection/")
          ? {
              status: 503,
              json: { detail: "Other panel excluded from this contract" },
            }
          : { json: [] },
      );
    if (url.pathname.endsWith("/review")) {
      const body = route.request().postDataJSON();
      expect(body).toEqual({
        expected_revision: revision,
        status: "resolved",
        note: "Verified the model difference against source evidence.",
      });
      if (conflict) {
        conflict = false;
        revision = 2;
        status = "in_review";
        return route.fulfill({
          status: 409,
          json: {
            detail:
              "This report changed in another session. Reload it before reviewing.",
          },
        });
      }
      revision++;
      status = body.status;
      savedNote = body.note;
      return route.fulfill({ json: { ...report, revision, status } });
    }
    reads.push(url);
    const offset = Number(url.searchParams.get("offset"));
    if (url.pathname.endsWith("/reports"))
      return route.fulfill({
        json: pageOf(
          [
            {
              ...report,
              id: offset ? "last-report" : reportId,
              revision,
              status,
            },
          ],
          26,
          offset,
        ),
      });
    return route.fulfill({
      json: {
        report: { ...report, revision, status },
        events: pageOf(
          [
            {
              revision: offset ? 1 : revision,
              from_status: offset ? null : "open",
              to_status: offset ? "open" : status,
              note: offset ? "" : savedNote,
              created_at: checked,
            },
          ],
          11,
          offset,
          10,
        ),
      },
    });
  });
  await page.goto("/?admin=imports");
  const queue = page.getByRole("region", {
    name: "Offer issue reports",
    exact: true,
  });
  await expect(queue).toHaveCount(0);
  await page.getByLabel("Admin token").fill("contract-report-secret");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(queue).toContainText("Captured contract model");
  await queue
    .getByRole("button", { name: "Next reports", exact: true })
    .click();
  await expect(
    queue.getByRole("button", { name: "Review report last-report" }),
  ).toBeVisible();
  await queue.getByLabel("Report status", { exact: true }).selectOption("all");
  await queue
    .getByRole("button", { name: `Review report ${reportId}`, exact: true })
    .click();
  const review = queue.getByRole("region", {
    name: "Review report",
    exact: true,
  });
  await expect(review).toContainText(report.details);
  await expect(review.locator("blockquote img")).toHaveCount(0);
  await expect(review).toContainText("3:30 pm IST");
  await review
    .getByLabel("Review status", { exact: true })
    .selectOption("resolved");
  await review
    .getByLabel("Private review note")
    .fill("Verified the model difference against source evidence.");
  await review
    .getByRole("button", { name: "Next review events", exact: true })
    .click();
  await expect(review.getByLabel("Private review note")).toHaveValue(
    "Verified the model difference against source evidence.",
  );
  await expect(review.getByLabel("Review status", { exact: true })).toHaveValue(
    "resolved",
  );
  await review
    .getByRole("button", { name: "Save review", exact: true })
    .click();
  await expect(review.getByRole("alert")).toContainText("another session");
  await review
    .getByRole("button", { name: "Reload report", exact: true })
    .click();
  await expect(review).toContainText("Revision 2");
  await expect(review.getByLabel("Private review note")).toHaveValue(
    "Verified the model difference against source evidence.",
  );
  await review
    .getByLabel("Review status", { exact: true })
    .selectOption("resolved");
  await review
    .getByRole("button", { name: "Save review", exact: true })
    .click();
  await expect(review).toContainText(
    "Review saved. Recorded prices and matches are unchanged.",
  );
  await expect(review).toContainText("Revision 3");
  await expect(review.locator("ol")).toContainText(savedNote);
  expect(
    reads.some(
      (url) =>
        url.searchParams.get("status") === "all" &&
        url.searchParams.get("offset") === "0",
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(
    await page.evaluate(
      () =>
        Object.values(localStorage).join() +
        Object.values(sessionStorage).join(),
    ),
  ).not.toContain("contract-report-secret");
  expect(page.url()).not.toContain("contract-report-secret");
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(queue).toHaveCount(0);
});

test("disconnect drops pending report reads and late errors", async ({
  page,
}) => {
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/admin/**", async (route) => {
    if (new URL(route.request().url()).pathname.endsWith("/reports")) {
      await blocked;
      return route
        .fulfill({ status: 503, json: { detail: "Late report error" } })
        .catch(() => {});
    }
    return route.fulfill(
      route.request().url().includes("/collection/")
        ? {
            status: 503,
            json: { detail: "Other panel excluded from this contract" },
          }
        : { json: [] },
    );
  });
  try {
    await page.goto("/?admin=imports");
    await page.getByLabel("Admin token").fill("contract-report-secret");
    await page.getByRole("button", { name: "Connect", exact: true }).click();
    await expect(page.getByText("Loading issue reports…")).toBeVisible();
    await page.getByRole("button", { name: "Disconnect", exact: true }).click();
    release();
    await page.unrouteAll({ behavior: "wait" });
    await expect(page.getByText("Late report error")).toHaveCount(0);
    await expect(
      page.getByRole("region", { name: "Offer issue reports", exact: true }),
    ).toHaveCount(0);
  } finally {
    release();
  }
});
