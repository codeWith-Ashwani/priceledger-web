import type { Offer } from "./api";

export type PriceBasis = "item" | "delivered";

export function amount(offer: Offer, basis: PriceBasis): number | null {
  return basis === "item" ? offer.item_paise : offer.total_paise;
}

export function rankOffers(offers: Offer[], basis: PriceBasis) {
  const online = offers.filter((offer) => offer.channel === "online");
  const available = online.filter((offer) => offer.in_stock && !offer.stale);
  const eligible = available.filter((offer) => amount(offer, basis) !== null);
  const eligibleIds = new Set(eligible.map((offer) => offer.id));
  const lowest = eligible.length
    ? Math.min(...eligible.map((offer) => amount(offer, basis)!))
    : null;
  const winners = new Set(
    eligible
      .filter((offer) => amount(offer, basis) === lowest)
      .map((offer) => offer.id),
  );
  return {
    lowest,
    winners,
    availableStores: new Set(available.map((offer) => offer.retailer_id)).size,
    comparableStores: new Set(eligible.map((offer) => offer.retailer_id)).size,
    storeCount: new Set(online.map((offer) => offer.retailer_id)).size,
    sorted: [...online].sort(
      (a, b) =>
        Number(!eligibleIds.has(a.id)) - Number(!eligibleIds.has(b.id)) ||
        (amount(a, basis) ?? Infinity) - (amount(b, basis) ?? Infinity) ||
        a.retailer_name.localeCompare(b.retailer_name),
    ),
  };
}
