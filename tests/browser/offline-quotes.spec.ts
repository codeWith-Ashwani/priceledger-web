import { expect, test, type Page } from "@playwright/test";

// Contract responses are intercepted in the browser; nothing is inserted into a catalog.
const product = "flipkart:MOBHQENASR3JJ8BN";
const apiBase =
  process.env.PRICELEDGER_TEST_API_URL ?? "http://127.0.0.1:8000/api/v1";
const checked = "2026-10-12T10:00:00Z";
const city = "a".repeat(32);
const otherCity = "b".repeat(32);
const shopId = "8a1a6e02-bdd1-40cf-8ce3-e4f3342168de";
const quoteId = "c95099ca-fc79-48ad-a2bb-72b07808a603";
const secondId = "a80991ce-bb2b-4adb-af86-884072c27eb7";
const pageOf = (
  items: unknown[],
  total = items.length,
  offset = 0,
  limit = 25,
) => ({ items, total, offset, limit });
const shop = {
  id: shopId,
  name: "Contract shop",
  city: "Contract City",
  state: "Contract State",
  area: "Contract Market",
  source_active: true,
};
const quote = {
  id: quoteId,
  product_id: product,
  shop_id: shopId,
  shop_name: shop.name,
  city: shop.city,
  state: shop.state,
  area: shop.area,
  product_snapshot: {
    title: "Contract exact model",
    brand: "Contract",
    attributes: { storage_gb: 128 },
  },
  item_paise: 10001,
  condition: "new",
  in_stock: true,
  observed_at: checked,
  valid_until: "2026-10-14T10:00:00Z",
  updated_at: checked,
  evidence_reference: "PRIVATE receipt evidence <img src=x onerror=alert(1)>",
  status: "draft",
  revision: 1,
};
const localItem = (index: number, current = false) => ({
  id: `contract-${index}`,
  shop_id: `${shopId}-${index}`,
  shop_name: `Documented contract shop ${index}`,
  city: shop.city,
  state: shop.state,
  area: shop.area,
  item_paise: index === 1 ? 12000 : 10000 + index * 100,
  condition: "new",
  in_stock: true,
  observed_at: checked,
  valid_until: quote.valid_until,
  reviewed_at: checked,
  source_name: "Documented merchant quote",
  current,
});
const localResponse = (items: unknown[] = [], count = 0) => ({
  product_id: product,
  read_at: checked,
  city_id: city,
  condition: "new",
  cities: [
    { city_id: city, city: shop.city, state: shop.state },
    { city_id: otherCity, city: "Other City", state: shop.state },
  ],
  days: 90,
  freshness_days: 7,
  summary: {
    current_shop_count: count,
    range_ready: count >= 2,
    low_paise: count >= 2 ? 10000 : null,
    high_paise: count >= 2 ? 12000 : null,
  },
  items,
  total: items.length,
  limit: 10,
  offset: 0,
});

test.afterEach(async ({ page }) =>
  page.unrouteAll({ behavior: "ignoreErrors" }),
);

async function publicProduct(page: Page) {
  await page.route("**/api/v1/products/*/compare", (route) =>
    route.fulfill({
      json: {
        stores: [],
        model_offers: [],
        cached: true,
        checked_at: checked,
        history_note: "Browser contract only",
      },
    }),
  );
  await page.goto(`/?product=${encodeURIComponent(product)}`);
  const panel = page.getByRole("complementary", { name: "Local shop quotes" });
  await expect(panel).toBeVisible();
  return panel;
}

test("local quotes separate cities, condition, pagination and dated evidence", async ({
  page,
}, info) => {
  const reads: URL[] = [];
  await page.route("**/api/v1/products/*/offline-quotes?*", (route) => {
    const url = new URL(route.request().url());
    reads.push(url);
    const offset = Number(url.searchParams.get("offset"));
    const condition = url.searchParams.get("condition");
    const selectedCity = url.searchParams.get("city_id") || city;
    const count = condition === "used" ? 0 : selectedCity === otherCity ? 1 : 2;
    const items = offset
      ? [localItem(11)]
      : Array.from({ length: 10 }, (_, i) => localItem(i, i < count));
    return route.fulfill({
      json: {
        ...localResponse(items, count),
        condition,
        days: Number(url.searchParams.get("days")),
        city_id: selectedCity,
        offset,
        total: 11,
      },
    });
  });
  const panel = await publicProduct(page);
  await expect(panel.getByRole("status")).toContainText("₹100 – ₹120");
  await expect(panel).toContainText("2 current shop quotes");
  await expect(panel).toContainText("3:30 pm IST");
  await expect(panel).not.toContainText("PRIVATE");
  await expect(panel.locator("svg circle")).toHaveCount(10);
  await expect(panel.locator("svg path")).toHaveCount(0);
  await panel.getByRole("button", { name: "Next quotes" }).click();
  await expect(panel).toContainText("11–11 of 11");
  await expect(panel).toContainText("Historical / no longer current");
  await panel.getByLabel("Quote history").selectOption("365");
  await expect(panel).toContainText("1–10 of 11");
  expect(reads.at(-1)?.searchParams.get("days")).toBe("365");
  await panel
    .getByRole("combobox", { name: "City", exact: true })
    .selectOption(otherCity);
  await expect(panel).toContainText("One current shop quote");
  await expect(panel).toContainText("1–10 of 11");
  await panel.getByLabel("Product condition").selectOption("used");
  await expect(panel).toContainText("No local estimate for this variant yet.");
  expect(reads.at(-1)?.searchParams.has("city_id")).toBe(false);
  await panel.getByLabel("Product condition").selectOption("new");
  await expect(panel.getByRole("status")).toContainText("₹100 – ₹120");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await panel.screenshot({
    path: `../docs/.qa/phase22-public-contract-${info.project.name}.png`,
  });
});

test("local quote errors and mismatched response identities cannot show a range", async ({
  page,
}) => {
  let requests = 0;
  let stage = "error";
  await page.route("**/api/v1/products/*/offline-quotes?*", (route) => {
    requests++;
    if (stage === "error")
      return route.fulfill({ status: 503, json: { detail: "Unavailable" } });
    return route.fulfill({
      json: {
        ...localResponse([], 2),
        product_id: stage === "mismatch" ? "wrong-product" : product,
      },
    });
  });
  const panel = await publicProduct(page);
  await expect(panel.getByRole("alert")).toBeVisible();
  const before = requests;
  stage = "mismatch";
  await panel.getByRole("button", { name: "Retry local quotes" }).click();
  await expect.poll(() => requests).toBeGreaterThan(before);
  await expect(panel.getByRole("alert")).toBeVisible();
  await expect(panel.getByText("₹100 – ₹120")).toHaveCount(0);
  stage = "ok";
  await panel.getByRole("button", { name: "Retry local quotes" }).click();
  await expect(panel.getByRole("status")).toContainText("₹100 – ₹120");
});

test("genuine catalog has no invented offline estimates", async ({ page }) => {
  const panel = await publicProduct(page);
  await expect(panel).toContainText("No local estimate for this variant yet.");
  await expect(panel.locator(".local-quote-list li")).toHaveCount(0);
  await expect(
    panel.getByRole("button", { name: "Refresh local quotes" }),
  ).toBeVisible();
});

test("local evidence deadline supports a retry and discards a late response", async ({
  page,
}) => {
  await page.clock.install();
  let hold = true;
  let started = 0;
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route("**/api/v1/products/*/offline-quotes?*", async (route) => {
    started++;
    const wasHeld = hold;
    if (wasHeld) await blocked;
    await route
      .fulfill({ json: localResponse([], wasHeld ? 2 : 0) })
      .catch(() => {});
  });
  try {
    const panel = await publicProduct(page);
    await expect.poll(() => started).toBeGreaterThan(0);
    await page.clock.fastForward(21000);
    await expect(panel.getByRole("alert")).toBeVisible();
    hold = false;
    await panel.getByRole("button", { name: "Retry local quotes" }).click();
    await expect(panel).toContainText(
      "No local estimate for this variant yet.",
    );
    release();
    await expect(panel.getByText("₹100 – ₹120")).toHaveCount(0);
  } finally {
    release();
  }
});

async function ownerWorkspace(
  page: Page,
  handler: (url: URL, body?: any) => any,
) {
  let offlineReads = 0;
  await page.route("**/api/v1/admin/**", (route) => {
    expect(route.request().headers()["x-admin-token"]).toBe(
      "offline-contract-secret",
    );
    const url = new URL(route.request().url());
    if (url.pathname.includes("/offline/")) {
      offlineReads++;
      const response = handler(
        url,
        route.request().method() === "POST"
          ? route.request().postDataJSON()
          : undefined,
      );
      return Promise.resolve(response)
        .then((result) => route.fulfill(result))
        .catch(() => {});
    }
    if (url.pathname.endsWith("/offers") && url.searchParams.has("q"))
      return route.fulfill({
        json: [
          {
            product_id: product,
            offer_id: "contract-offer",
            title: "Tracked exact variant",
            variant_attributes: {},
          },
        ],
      });
    return route.fulfill(
      url.pathname.includes("/collection/")
        ? { status: 503, json: { detail: "Other panel excluded" } }
        : url.pathname.endsWith("/reports")
          ? { json: pageOf([]) }
          : { json: [] },
    );
  });
  await page.goto("/?admin=imports");
  await page.getByLabel("Admin token").fill("offline-contract-secret");
  await page.getByRole("button", { name: "Connect", exact: true }).click();
  await expect(page.getByText("Admin session connected")).toBeVisible();
  expect(offlineReads).toBe(0);
  await page
    .getByText("Record and review local shop quotes", { exact: true })
    .click();
  const panel = page.getByRole("region", { name: "Offline quote workspace" });
  await expect(panel).toBeVisible();
  return panel;
}

test("owner publishes with safe retries, scoped identities, private audit and withdrawal", async ({
  page,
}, info) => {
  const states: Record<string, any> = {
    [quoteId]: { ...quote },
    [secondId]: { ...quote, id: secondId },
  };
  const writes: any[] = [];
  let lostAcknowledgement = true;
  const panel = await ownerWorkspace(page, (url, body) => {
    const offset = Number(url.searchParams.get("offset"));
    if (url.pathname.endsWith("/shops")) return { json: pageOf([shop]) };
    if (url.pathname.endsWith("/quotes"))
      return { json: pageOf(Object.values(states), 26, offset) };
    const id = url.pathname.split("/")[6];
    if (body) {
      writes.push(body);
      const current = states[id];
      current.status = body.action === "publish" ? "published" : "withdrawn";
      current.revision = body.expected_revision + 1;
      if (lostAcknowledgement) {
        lostAcknowledgement = false;
        return {
          status: 503,
          json: { detail: "Receipt unavailable; retry the same action" },
        };
      }
      return {
        json: {
          id,
          revision: current.revision,
          status: current.status,
          replayed: writes.length === 2,
        },
      };
    }
    return {
      json: {
        quote: states[id],
        events: pageOf(
          [
            {
              revision: offset ? 1 : states[id].revision,
              status: states[id].status,
              at: checked,
              note: "PRIVATE owner audit",
            },
          ],
          11,
          offset,
          10,
        ),
      },
    };
  });
  await panel
    .getByRole("button", { name: /Contract exact model/ })
    .first()
    .click();
  const review = panel.getByRole("region", { name: "Shop quote review" });
  await expect(review).toContainText("Contract Market");
  await expect(review).toContainText("₹100.01");
  await expect(review.locator("img")).toHaveCount(0);
  await review
    .getByLabel("Private review note")
    .fill("Verified the actual receipt");
  await review.getByRole("button", { name: "Next audit" }).click();
  await expect(review.getByLabel("Private review note")).toHaveValue(
    "Verified the actual receipt",
  );
  await review.getByRole("button", { name: "Publish reviewed quote" }).click();
  await expect(panel.getByRole("alert")).toContainText("retry the same action");
  await expect(
    panel.getByText("Quote publication confirmed.", { exact: true }),
  ).toHaveCount(0);
  await review.getByRole("button", { name: "Publish reviewed quote" }).click();
  await expect(panel.getByRole("status")).toContainText(
    "Quote publication confirmed.",
  );
  expect(writes[0]).toEqual(writes[1]);
  await expect(review).toContainText("published · revision 2");
  await panel
    .getByRole("button", { name: /Contract exact model.*draft/ })
    .click();
  await review
    .getByLabel("Private review note")
    .fill("Verified the actual receipt");
  await review.getByRole("button", { name: "Publish reviewed quote" }).click();
  await expect(review).toContainText("published · revision 2");
  expect(writes[2].request_id).not.toBe(writes[1].request_id);
  await review.getByRole("button", { name: "Withdraw quote" }).click();
  await expect(panel.getByRole("status")).toContainText(
    "Quote withdrawal confirmed.",
  );
  await expect(review).toContainText("withdrawn · revision 3");
  await expect(
    review.getByRole("button", { name: "Publish reviewed quote" }),
  ).toBeDisabled();
  await expect(
    review.getByRole("button", { name: "Withdraw quote" }),
  ).toBeDisabled();
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
  ).not.toContain("offline-contract-secret");
  await review.screenshot({
    path: `../docs/.qa/phase22-owner-contract-${info.project.name}.png`,
  });
});

test("owner registers real-input shop permissions and creates an unpublished exact-variant draft", async ({
  page,
  request,
}) => {
  const detail = await (
    await request.get(`${apiBase}/products/` + encodeURIComponent(product))
  ).json();
  let registered: any = null;
  let saved: any = null;
  const writes: string[] = [];
  const panel = await ownerWorkspace(page, (url, body) => {
    if (body) {
      writes.push(url.pathname);
      if (url.pathname.endsWith("/shops")) {
        registered = { ...shop, id: body.request_id, name: body.name };
        expect(body.rights_confirmed).toBe(true);
        expect(body.approval_reference).toBe("PRIVATE permission reference");
        return { status: 201, json: { id: body.request_id, replayed: false } };
      }
      saved = {
        ...quote,
        id: body.request_id,
        shop_id: body.shop_id,
        product_snapshot: detail,
        item_paise: body.item_paise,
      };
      expect(body.variant_attributes).toEqual(detail.attributes);
      expect(body.item_paise).toBe(12345);
      expect(body.in_stock).toBe(true);
      for (const key of [
        "exact_variant_confirmed",
        "includes_tax",
        "unconditional_price",
      ])
        expect(body[key]).toBe(true);
      expect(body.observed_at).toMatch(/Z$/);
      return { status: 201, json: { quote: saved, replayed: false } };
    }
    if (url.pathname.endsWith("/shops"))
      return { json: pageOf(registered ? [registered] : []) };
    if (url.pathname.endsWith("/quotes"))
      return { json: pageOf(saved ? [saved] : []) };
    return {
      json: {
        quote: saved,
        events: pageOf(
          [
            {
              revision: 1,
              status: "draft",
              note: "Privately recorded draft",
              at: checked,
            },
          ],
          1,
          0,
          10,
        ),
      },
    };
  });
  await panel.getByText("Register a documented shop", { exact: true }).click();
  for (const [label, value] of [
    ["Shop name", "Contract shop"],
    ["City", "Contract City"],
    ["State / union territory", "Contract State"],
    ["Public shop area or address", "Contract Market"],
    ["Private permission reference", "PRIVATE permission reference"],
  ])
    await panel.getByLabel(label, { exact: true }).fill(value);
  await panel.getByLabel(/I confirmed permission/).check();
  await panel
    .getByRole("button", { name: "Register shop", exact: true })
    .click();
  await expect(panel.getByRole("status")).toContainText("registered");
  await panel.getByRole("button", { name: "Find tracked products" }).click();
  await panel.getByLabel("Exact tracked product").selectOption(product);
  await expect(panel.getByText(/^Verify:/)).toBeVisible();
  await panel.getByLabel("In-store item price (INR)").fill("123.45");
  await panel.getByLabel("Quoted condition").selectOption("new");
  await panel.getByLabel("Shop-reported availability").selectOption("in_stock");
  await panel
    .getByLabel("Quoted at (your local time)")
    .fill("2026-10-12T12:00");
  await panel
    .getByLabel("Valid until (your local time)")
    .fill("2026-10-14T12:00");
  await panel
    .getByLabel("Private quote evidence reference")
    .fill("PRIVATE receipt reference");
  await panel.getByLabel(/I verified this exact variant/).check();
  await panel.getByRole("button", { name: "Record private draft" }).click();
  await expect(panel.getByRole("status")).toContainText(
    "Draft recorded privately",
  );
  await expect(
    panel.getByRole("region", { name: "Shop quote review" }),
  ).toContainText("draft · revision 1");
  expect(writes).toHaveLength(2);
  expect(writes.some((path) => path.endsWith("/review"))).toBe(false);
});

test("owner conflict reload preserves the pending note and disconnect cancels late responses", async ({
  page,
}) => {
  let revision = 1;
  let hold = false;
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const panel = await ownerWorkspace(page, async (url, body) => {
    if (url.pathname.endsWith("/shops")) return { json: pageOf([shop]) };
    if (url.pathname.endsWith("/quotes")) return { json: pageOf([quote]) };
    if (body) {
      revision = 2;
      return {
        status: 409,
        json: { detail: "Quote changed; reload before reviewing" },
      };
    }
    if (hold) await blocked;
    return {
      json: { quote: { ...quote, revision }, events: pageOf([], 0, 0, 10) },
    };
  });
  try {
    await panel.getByRole("button", { name: /Contract exact model/ }).click();
    const review = panel.getByRole("region", { name: "Shop quote review" });
    await review
      .getByLabel("Private review note")
      .fill("Unsaved private evidence review");
    await review
      .getByRole("button", { name: "Publish reviewed quote" })
      .click();
    await expect(panel.getByRole("alert")).toContainText("reload");
    await review.getByRole("button", { name: "Reload selected quote" }).click();
    await expect(review).toContainText("revision 2");
    await expect(review.getByLabel("Private review note")).toHaveValue(
      "Unsaved private evidence review",
    );
    hold = true;
    await review.getByRole("button", { name: "Reload selected quote" }).click();
    await page.getByRole("button", { name: "Disconnect", exact: true }).click();
    release();
    await expect(panel).toHaveCount(0);
    await expect(page.getByText("Unsaved private evidence review")).toHaveCount(
      0,
    );
    await expect(
      page.getByRole("heading", { name: "Connect to the import workspace" }),
    ).toBeVisible();
  } finally {
    release();
  }
});

test("owner review deadline retries the same receipt without premature publication", async ({
  page,
}) => {
  await page.clock.install();
  let hold = true;
  let release!: () => void;
  const blocked = new Promise<void>((resolve) => {
    release = resolve;
  });
  const writes: any[] = [];
  const panel = await ownerWorkspace(page, async (url, body) => {
    if (url.pathname.endsWith("/shops")) return { json: pageOf([shop]) };
    if (url.pathname.endsWith("/quotes")) return { json: pageOf([quote]) };
    if (body) {
      writes.push(body);
      if (hold) await blocked;
      return {
        json: { id: quoteId, revision: 2, status: "published", replayed: true },
      };
    }
    return { json: { quote, events: pageOf([], 0, 0, 10) } };
  });
  try {
    await panel.getByRole("button", { name: /Contract exact model/ }).click();
    const review = panel.getByRole("region", { name: "Shop quote review" });
    await review
      .getByLabel("Private review note")
      .fill("Verified contract evidence");
    await review
      .getByRole("button", { name: "Publish reviewed quote" })
      .click();
    await expect.poll(() => writes.length).toBe(1);
    await expect(
      panel.getByText("Quote publication confirmed.", { exact: true }),
    ).toHaveCount(0);
    await page.clock.fastForward(21000);
    await expect(panel.getByRole("alert")).toContainText(
      "Retry the same action",
    );
    hold = false;
    await review
      .getByRole("button", { name: "Publish reviewed quote" })
      .click();
    await expect(panel.getByRole("status")).toContainText(
      "Quote publication confirmed.",
    );
    expect(writes[1]).toEqual(writes[0]);
  } finally {
    release();
  }
});
