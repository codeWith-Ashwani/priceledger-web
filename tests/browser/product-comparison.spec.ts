import { expect, test, type Page } from "@playwright/test";
import type { Offer, ProductDetail } from "../../src/api";

const checked = "2026-10-12T10:00:00Z";
function product(index: number): ProductDetail {
  return {
    id: `contract-${index}`,
    title: `Contract model ${index}`,
    brand: "Contract",
    category: "electronics",
    variant_label: "Controlled browser contract",
    attributes: { model: `Model ${index}`, storage_gb: index * 128 },
    illustration: "product",
    image_url: null,
    is_demo: false,
    best_item_price_paise: null,
    best_price_paise: null,
    retailer_count: 1,
    first_observed_at: checked,
    launch_date: null,
    launch_date_verified: false,
    offers: offers(index),
  };
}
function offers(index: number): Offer[] {
  const base: Offer = {
    id: `contract-offer-${index}`,
    product_id: `contract-${index}`,
    title: `Contract model ${index}`,
    retailer_id: "contract-a",
    retailer_name: "Store A",
    color: "#155c45",
    seller: "Recorded seller",
    condition: "new",
    region: "IN",
    item_paise: 10000,
    shipping_paise: null,
    total_paise: null,
    listed_fees: null,
    in_stock: true,
    stale: false,
    observed_at: checked,
    source_name: "Controlled source A",
    is_demo: false,
    product_url: null,
    channel: "online",
    availability: "in_stock",
    rating: null,
  };
  if (index !== 1)
    return [
      { ...base, item_paise: null, in_stock: false, availability: "unknown" },
    ];
  return [
    base,
    {
      ...base,
      id: "contract-b",
      retailer_id: "contract-b",
      retailer_name: "Store B",
      item_paise: 11000,
      shipping_paise: 200,
      total_paise: 11200,
      source_name: "Controlled source B",
      listed_fees: [
        { label: "Handling", amount_paise: 100, evidence: "structured_offer" },
      ],
    },
    {
      ...base,
      id: "stale",
      retailer_name: "Stale store",
      item_paise: 100,
      stale: true,
    },
    {
      ...base,
      id: "unavailable",
      retailer_name: "Unavailable store",
      item_paise: 50,
      in_stock: false,
    },
    ...Array.from({ length: 10 }, (_, i) => ({
      ...base,
      id: `extra-${i}`,
      retailer_name: `Extra store ${i}`,
      item_paise: 20000 + i,
    })),
  ];
}

async function contracts(
  page: Page,
  compare: (
    ids: string[],
  ) => Promise<{ status?: number; json: unknown }> = async (ids) => ({
    json: {
      scope: "independent_exact_variants",
      checked_at: checked,
      products: ids.map((id) => product(Number(id.split("-")[1]))),
      note: "Controlled evidence",
    },
  }),
) {
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname.endsWith("/product-comparison"))
      return route.fulfill(
        await compare(route.request().postDataJSON().product_ids),
      );
    if (url.pathname.endsWith("/lookup"))
      return route.fulfill({
        json: {
          kind: "product",
          product_id: `contract-${route.request().postDataJSON().query.match(/\d/)[0]}`,
          cached: true,
          message: "Controlled lookup",
        },
      });
    if (url.pathname.endsWith("/compare"))
      return route.fulfill({
        json: {
          stores: [],
          model_offers: [],
          cached: true,
          checked_at: checked,
        },
      });
    if (url.pathname.endsWith("/history"))
      return route.fulfill({
        json: { series: [], currency: "INR", max_gap_hours: 48 },
      });
    if (url.pathname.endsWith("/coverage"))
      return route.fulfill({ json: { stores: [] } });
    if (url.pathname.endsWith("/insights"))
      return route.fulfill({
        json: {
          low: null,
          high: null,
          observed_days: 0,
          daily_average_paise: null,
        },
      });
    if (url.pathname.endsWith("/assessment"))
      return route.fulfill({
        status: 503,
        json: { detail: "Assessment excluded" },
      });
    const id = /\/products\/contract-(\d)$/.exec(url.pathname);
    if (id) return route.fulfill({ json: product(Number(id[1])) });
    return route.fulfill({ json: { status: "ok" } });
  });
}
async function select(page: Page, index: number, add = true) {
  await page
    .getByRole("textbox", { name: "Product link or brand and model" })
    .fill(`Contract model ${index}`);
  await page.getByRole("button", { name: "Find prices", exact: true }).click();
  await expect(page.locator(".product-description h2")).toHaveText(
    `Contract model ${index}`,
  );
  if (add)
    await page
      .getByRole("button", { name: "Add to product comparison", exact: true })
      .click();
}

test.afterEach(async ({ page }) =>
  page.unrouteAll({ behavior: "ignoreErrors" }),
);

test("independent columns retain source prices, unknown details and every recorded store", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await contracts(page);
  await page.goto("/");
  await select(page, 1);
  await expect(
    page.getByRole("button", { name: "Added to comparison", exact: true }),
  ).toBeDisabled();
  const panel = page.getByRole("region", {
    name: "Compare selected products",
    exact: true,
  });
  await expect(
    panel.getByRole("button", {
      name: "Compare selected products",
      exact: true,
    }),
  ).toBeDisabled();
  await select(page, 2);
  await panel
    .getByRole("button", { name: "Compare selected products", exact: true })
    .click();
  const table = panel.getByRole("table");
  const item = table.getByRole("row", { name: /Lowest available item/ });
  await expect(item.getByRole("cell").first()).toContainText("₹100");
  await expect(item.getByRole("cell").first()).toContainText("Store A");
  await expect(item.getByRole("cell").first()).not.toContainText("Stale store");
  await expect(item.getByRole("cell").nth(1)).toContainText(
    "No fresh available item price",
  );
  const subtotal = table.getByRole("row", { name: /Lowest known subtotal/ });
  await expect(subtotal.getByRole("cell").first()).toContainText("₹113");
  await expect(subtotal.getByRole("cell").first()).toContainText("Store B");
  await expect(
    table.getByRole("row", { name: /Storage \(GB\)/ }),
  ).toContainText("128");
  await expect(
    table.getByRole("row", { name: /Storage \(GB\)/ }),
  ).toContainText("256");
  await panel
    .getByRole("button", { name: "Hide identical known details" })
    .click();
  await expect(
    table.getByRole("rowheader", { name: "Brand", exact: true }),
  ).toHaveCount(0);
  await expect(table.getByRole("row", { name: /RAM \(GB\)/ })).toContainText(
    "Not recorded",
  );
  await table.getByText("14 recorded offers", { exact: true }).click();
  await expect(table.getByText("Extra store 9", { exact: true })).toBeVisible();
  await expect(table.getByText("Handling: ₹1", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const scroll = panel.getByRole("region", {
    name: "Side-by-side product table",
    exact: true,
  });
  await expect(scroll).toHaveAttribute("tabindex", "0");
  await scroll.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await table
    .getByRole("button", {
      name: "View offers and history for Contract model 1",
      exact: true,
    })
    .click();
  await expect(page.locator(".product-description h2")).toHaveText(
    "Contract model 1",
  );
  expect(errors).toEqual([]);
});

test("selection limit applies to products, and reload clears the visit-only list", async ({
  page,
}) => {
  await contracts(page);
  await page.goto("/");
  for (let index = 1; index <= 4; index++) await select(page, index);
  await select(page, 5, false);
  await expect(
    page.getByRole("button", { name: "Comparison list full", exact: true }),
  ).toBeDisabled();
  const panel = page.getByRole("region", {
    name: "Compare selected products",
    exact: true,
  });
  await expect(panel).toContainText("4/4 selected");
  await panel
    .getByRole("button", {
      name: "Remove Contract model 2 from comparison",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Add to product comparison", exact: true })
    .click();
  await expect(panel).toContainText("4/4 selected");
  await panel
    .getByRole("button", { name: "Compare selected products", exact: true })
    .click();
  await expect(panel.getByRole("columnheader")).toHaveCount(5);
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
  ).not.toContain("contract-");
  await page.reload();
  await expect(panel).toHaveCount(0);
});

test("failed and mismatched reads withdraw results and require a manual reload", async ({
  page,
}) => {
  let calls = 0;
  await contracts(page, async (ids) => {
    calls++;
    if (calls === 2)
      return {
        status: 409,
        json: {
          detail:
            "Two selections belong to the same exact variant. Keep one of them.",
        },
      };
    return {
      json: {
        scope: "independent_exact_variants",
        checked_at: checked,
        products: ids.map((id) =>
          product(calls === 3 ? 5 : Number(id.split("-")[1])),
        ),
      },
    };
  });
  await page.goto("/");
  await select(page, 1);
  await select(page, 2);
  const panel = page.getByRole("region", {
    name: "Compare selected products",
    exact: true,
  });
  await panel
    .getByRole("button", { name: "Compare selected products", exact: true })
    .click();
  await expect(panel.getByRole("table")).toBeVisible();
  await panel
    .getByRole("button", { name: "Reload recorded prices", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText("same exact variant");
  await expect(panel.getByRole("table")).toHaveCount(0);
  expect(calls).toBe(2);
  await panel
    .getByRole("button", { name: "Reload recorded prices", exact: true })
    .click();
  await expect(panel.getByRole("alert")).toContainText("could not be verified");
  await expect(panel.getByRole("table")).toHaveCount(0);
  expect(calls).toBe(3);
});

test("timed-out comparisons allow a manual reload without automatic retries", async ({
  page,
}) => {
  await page.clock.install();
  let calls = 0;
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await contracts(page, async (ids) => {
    calls++;
    if (calls === 1) await pending;
    return {
      json: {
        scope: "independent_exact_variants",
        checked_at: checked,
        products: ids.map((id) => product(Number(id.split("-")[1]))),
      },
    };
  });
  try {
    await page.goto("/");
    await select(page, 1);
    await select(page, 2);
    const panel = page.getByRole("region", {
      name: "Compare selected products",
      exact: true,
    });
    await panel
      .getByRole("button", { name: "Compare selected products", exact: true })
      .click();
    await expect.poll(() => calls).toBe(1);
    await page.clock.fastForward(21000);
    await expect(panel.getByRole("alert")).toContainText("timed out");
    expect(calls).toBe(1);
    await panel
      .getByRole("button", { name: "Reload recorded prices", exact: true })
      .click();
    await expect(panel.getByRole("table")).toBeVisible();
    expect(calls).toBe(2);
  } finally {
    release();
  }
});

test("clearing the selection cancels pending reads and prevents late results", async ({
  page,
}) => {
  let release!: () => void;
  const pending = new Promise<void>((resolve) => {
    release = resolve;
  });
  await contracts(page, async (ids) => {
    await pending;
    return {
      json: {
        scope: "independent_exact_variants",
        products: ids.map(() => product(1)),
      },
    };
  });
  try {
    await page.goto("/");
    await select(page, 1);
    await select(page, 2);
    const panel = page.getByRole("region", {
      name: "Compare selected products",
      exact: true,
    });
    await panel
      .getByRole("button", { name: "Compare selected products", exact: true })
      .click();
    await expect(
      panel.getByText("Loading recorded product comparisons…"),
    ).toBeVisible();
    await panel
      .getByRole("button", { name: "Clear comparison list", exact: true })
      .click();
    release();
    await page.unrouteAll({ behavior: "wait" });
    await expect(panel).toHaveCount(0);
    await expect(
      page.getByText("could not be verified", { exact: false }),
    ).toHaveCount(0);
  } finally {
    release();
  }
});
