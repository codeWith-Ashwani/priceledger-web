import { describe, expect, it } from "vitest";
import { rankOffers } from "./offers";
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
