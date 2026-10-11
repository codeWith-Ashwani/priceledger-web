import { describe, expect, it } from "vitest";
import {
  comparisonOffers,
  filterOffers,
  rankOffers,
  sortOffers,
} from "./offers";
import { targetProgress } from "./watchlist";
import type { Offer } from "./api";

const offer = (
  id: string,
  item: number,
  extra: Partial<Offer> = {},
): Offer => ({
  id,
  retailer_id: id,
  retailer_name: id,
  item_paise: item,
  shipping_paise: 0,
  total_paise: item,
  in_stock: true,
  stale: false,
  availability: "in_stock",
  channel: "online",
  product_url: null,
  observed_at: null,
  seller: "test",
  condition: "new",
  region: "IN",
  color: "#155c45",
  source_name: "test",
  is_demo: false,
  ...extra,
});

describe("verified offer ranking", () => {
  it("recomputes winners within storage filters without guessing missing attributes", () => {
    const offers = [
      offer("small", 1000, { variant_attributes: { storage_gb: 128 } }),
      offer("large", 2000, { variant_attributes: { storage_gb: 256 } }),
      offer("unknown", 100),
    ];
    const filtered = filterOffers(offers, false, "", "256");
    expect(filtered.map((item) => item.id)).toEqual(["large"]);
    expect([...rankOffers(filtered, "item").winners]).toEqual(["large"]);
    expect(filterOffers(offers, false, "", "")).toHaveLength(3);
    expect(
      filterOffers(offers, true, "small", "").map((item) => item.id),
    ).toEqual(["small"]);
  });
  it("sorts ratings by their scale, keeps missing ratings last and does not change winners", () => {
    const offers = [
      offer("five", 1000, { rating: { value: 4, best: 5, count: 2 } }),
      offer("ten", 2000, { rating: { value: 9, best: 10, count: 10 } }),
      offer("missing", 500),
    ];
    const ranked = rankOffers(offers, "item");
    expect(sortOffers(ranked.sorted, "rating").map((item) => item.id)).toEqual([
      "ten",
      "five",
      "missing",
    ]);
    expect([...ranked.winners]).toEqual(["missing"]);
    expect(
      sortOffers(
        [
          offer("older", 1, { observed_at: "2026-10-01T10:00:00Z" }),
          offer("invalid", 1, { observed_at: "bad" }),
          offer("newer", 1, { observed_at: "2026-10-02T10:00:00Z" }),
        ],
        "recent",
      ).map((item) => item.id),
    ).toEqual(["newer", "older", "invalid"]);
  });
  it("reports targets using available exact online item plus shipping, excluding extras", () => {
    const offers = [
      offer("stale", 1, { stale: true }),
      offer("offline", 1, { channel: "offline" }),
      offer("model", 1, { match_scope: "model" }),
      offer("sold", 1, { in_stock: false }),
      offer("unknown", 1, { total_paise: null }),
      offer("valid", 1000, {
        total_paise: 1100,
        listed_fees: [
          { label: "Fee", amount_paise: 500, evidence: "page_price_breakdown" },
        ],
      }),
    ];
    expect(targetProgress(1100, offers)).toMatchObject({
      reached: true,
      remaining: 0,
      best: { id: "valid" },
    });
    expect(targetProgress(1000, offers)).toMatchObject({
      reached: false,
      remaining: 100,
    });
    expect(targetProgress(1100, offers.slice(0, -1))).toBeNull();
  });
  it("includes observed fees in subtotal ranking while keeping item winners separate", () => {
    const offers = [
      offer("lower-item", 1000, {
        listed_fees: [
          {
            label: "Protect Promise Fee",
            amount_paise: 100,
            evidence: "page_price_breakdown",
          },
        ],
      }),
      offer("lower-subtotal", 1050),
    ];
    expect([...rankOffers(offers, "item").winners]).toEqual(["lower-item"]);
    expect([...rankOffers(offers, "delivered").winners]).toEqual([
      "lower-subtotal",
    ]);
    expect(rankOffers(offers, "delivered").lowest).toBe(1050);
  });
  it("deduplicates model alternatives and restores exact ranking on request", () => {
    const original = offer("exact", 3000);
    const related = offer("variant", 2000, { match_scope: "model" });
    const model = comparisonOffers(
      [original],
      [related, { ...original, item_paise: 100 }],
    );
    expect(model).toHaveLength(2);
    expect(rankOffers(model, "item").lowest).toBe(2000);
    expect(
      rankOffers(comparisonOffers([original], [related], false), "item").lowest,
    ).toBe(3000);
  });
  it("excludes stale, unavailable and offline quotes from current online winners", () => {
    const ranked = rankOffers(
      [
        offer("valid", 1000),
        offer("stale", 100, { stale: true }),
        offer("sold", 50, { in_stock: false }),
        offer("offline", 10, { channel: "offline" }),
      ],
      "item",
    );
    expect([...ranked.winners]).toEqual(["valid"]);
    expect(ranked.storeCount).toBe(3);
    expect(ranked.sorted[0].id).toBe("valid");
  });
  it("keeps unknown delivery out of total winners without treating it as free", () => {
    const offers = [
      offer("unknown", 500, { shipping_paise: null, total_paise: null }),
      offer("known", 900),
    ];
    expect([...rankOffers(offers, "item").winners]).toEqual(["unknown"]);
    const total = rankOffers(offers, "delivered");
    expect([...total.winners]).toEqual(["known"]);
    expect(total.availableStores).toBe(2);
    expect(total.comparableStores).toBe(1);
  });
  it("shows ties and counts distinct stores", () => {
    const ranked = rankOffers(
      [
        offer("a", 1000),
        offer("b", 1000),
        offer("c", 1200, { retailer_id: "a" }),
      ],
      "item",
    );
    expect(ranked.winners.size).toBe(2);
    expect(ranked.comparableStores).toBe(2);
  });
  it("does not recommend an offer when every current price is unavailable", () => {
    expect(
      rankOffers([offer("sold", 500, { in_stock: false })], "item").lowest,
    ).toBeNull();
  });
});
