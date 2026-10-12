import { expect, test } from "@playwright/test";

const checked = "2026-10-12T10:00:00Z";
const overview = {
  checked_at: checked,
  freshness_hours: 48,
  gap_hours: 48,
  summary: {
    tracked: 26,
    stale: 4,
    failed: 3,
    gap: 5,
    due: 2,
    running: 1,
    paused: 0,
    unscheduled: 2,
    inactive: 1,
  },
  checks_24h: { completed: 18, failed: 2, latest_completed_at: checked },
  note: "Recorded scheduling is not a heartbeat.",
};
const offer = (index: number) => ({
  offer_id: `contract-${index}`,
  product_id: `contract-product-${index}`,
  title: `Contract model ${index}`,
  retailer_name: "Contract retailer",
  current_item_paise: null,
  current_observed_at: null,
  last_evidence_at: null,
  next_run_at: checked,
  job_status: "queued",
  last_check_error: "retailer_blocked",
  last_error_code: null,
  last_check_at: checked,
  blocked_until: "2026-10-12T12:00:00Z",
  remaining_requests: 0,
  source_active: true,
  stale: true,
  gap: true,
  failed: true,
  due: false,
  lease_expired: false,
});

test("owner health filters and paginates real API contracts without storing credentials", async ({
  page,
}) => {
  let collectionReads = 0;
  let fail = false;
  const requests: URL[] = [];
  await page.route("**/api/v1/admin/**", async (route) => {
    const url = new URL(route.request().url());
    expect(route.request().headers()["x-admin-token"]).toBe(
      "contract-health-secret",
    );
    if (!url.pathname.includes("/collection/"))
      return route.fulfill({ json: [] });
    collectionReads++;
    requests.push(url);
    expect(route.request().method()).toBe("GET");
    if (fail)
      return route.fulfill({
        status: 503,
        json: { detail: "Collection health unavailable" },
      });
    if (url.pathname.endsWith("/overview"))
      return route.fulfill({ json: overview });
    const offset = Number(url.searchParams.get("offset"));
    if (url.pathname.endsWith("/offers"))
      return route.fulfill({
        json: {
          checked_at: checked,
          total: url.searchParams.get("status") === "gap" ? 1 : 26,
          limit: 25,
          offset,
          items: [offer(offset + 1)],
        },
      });
    return route.fulfill({
      json: {
        checked_at: checked,
        total: 26,
        limit: 25,
        offset,
        daily_budget: 500,
        items: [
          {
            id: `source-${offset}`,
            name: `Contract source ${offset}`,
            active: false,
            blocked_until: "2026-10-12T12:00:00Z",
            remaining_requests: 0,
            tracked: 4,
            completed_24h: 8,
            failed_24h: 3,
            latest_completed_at: checked,
          },
        ],
      },
    });
  });
  await page.goto("/?admin=imports");
  const panel = page.getByRole("region", {
    name: "Collection health",
    exact: true,
  });
  await expect(panel).toHaveCount(0);
  expect(collectionReads).toBe(0);
  await page.getByLabel("Admin token").fill("contract-health-secret");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(panel).toContainText("18 completed checks");
  await expect(panel).toContainText(
    "Scheduling does not confirm a worker is running",
  );
  const tracked = panel.getByRole("region", { name: "Tracked offer health" });
  await expect(tracked).toContainText("Unavailable");
  await expect(tracked).toContainText("retailer_blocked");
  await expect(tracked).toContainText("0 requests remaining");
  await expect(tracked).toContainText("Cooldown until");
  await expect(tracked).not.toContainText("Ready for collection");
  await panel.getByRole("button", { name: "Next offers", exact: true }).click();
  await expect(tracked).toContainText("Contract model 26");
  await expect(
    panel.getByRole("button", { name: "Next offers", exact: true }),
  ).toBeDisabled();
  await panel.getByLabel("Show tracked offers").selectOption("gap");
  await expect(tracked).toContainText("Contract model 1");
  expect(
    requests.some(
      (url) =>
        url.searchParams.get("status") === "gap" &&
        url.searchParams.get("offset") === "0",
    ),
  ).toBe(true);
  await panel
    .getByRole("button", { name: "Next sources", exact: true })
    .click();
  await expect(
    panel.getByRole("region", { name: "Source health", exact: true }),
  ).toContainText("Contract source 25");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  fail = true;
  await panel.getByRole("button", { name: "Refresh health" }).click();
  await expect(panel.getByRole("alert")).toHaveText(
    "Collection health unavailable",
  );
  await expect(panel.locator(".collection-metrics")).toHaveCount(0);
  fail = false;
  await panel.getByRole("button", { name: "Refresh health" }).click();
  await expect(panel).toContainText("18 completed checks");
  expect(
    await page.evaluate(
      () =>
        Object.values(localStorage).join() +
        Object.values(sessionStorage).join(),
    ),
  ).not.toContain("contract-health-secret");
  expect(page.url()).not.toContain("contract-health-secret");
  await page.getByRole("button", { name: "Disconnect", exact: true }).click();
  await expect(panel).toHaveCount(0);
});

test("disconnect cancels a pending health read and prevents late errors", async ({
  page,
}) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/admin/**", async (route) => {
    if (route.request().url().includes("/collection/")) {
      await pending;
      return route
        .fulfill({ status: 503, json: { detail: "Late health error" } })
        .catch(() => {});
    }
    return route.fulfill({ json: [] });
  });
  try {
    await page.goto("/?admin=imports");
    await page.getByLabel("Admin token").fill("contract-health-secret");
    await page.getByRole("button", { name: "Connect", exact: true }).click();
    await expect(page.getByText("Loading collection health…")).toBeVisible();
    await page.getByRole("button", { name: "Disconnect", exact: true }).click();
    await expect(
      page.getByRole("region", { name: "Collection health", exact: true }),
    ).toHaveCount(0);
    release();
    await page.unrouteAll({ behavior: "wait" });
    await expect(page.getByText("Late health error")).toHaveCount(0);
  } finally {
    release();
  }
});
