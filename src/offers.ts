import type { Offer } from "./api";

export type PriceBasis = "item" | "delivered";

export type OfferSort = "price" | "rating" | "recent";
export function filterOffers(
  offers: Offer[],
  available: boolean,
  store: string,
  storage: string,
) {
  return offers.filter(
    (offer) =>
      (!available || (offer.in_stock && !offer.stale)) &&
      (!store || offer.retailer_id === store) &&
      (!storage ||
        String(offer.variant_attributes?.storage_gb ?? "") === storage),
  );
}

export function sortOffers(offers: Offer[], sort: OfferSort): Offer[] {
  if (sort === "price") return offers;
  const score = (offer: Offer) =>
    sort === "rating"
      ? offer.rating && offer.rating.best > 0
        ? offer.rating.value / offer.rating.best
        : -Infinity
      : offer.observed_at
        ? Date.parse(offer.observed_at) || -Infinity
        : -Infinity;
  return [...offers].sort(
    (a, b) =>
      score(b) - score(a) || a.retailer_name.localeCompare(b.retailer_name),
  );
}

export function comparisonOffers(
  exact: Offer[],
  model: Offer[] = [],
  includeModel = true,
): Offer[] {
  const offers = new Map(exact.map((offer) => [offer.id, offer]));
  if (includeModel) {
    for (const offer of model) {
      if (!offers.has(offer.id)) offers.set(offer.id, offer);
    }
  }
  return [...offers.values()];
}

export function amount(offer: Offer, basis: PriceBasis): number | null {
  if (basis === "item") return offer.item_paise;
  if (offer.item_paise === null || offer.shipping_paise === null) return null;
  return (
    offer.item_paise +
    offer.shipping_paise +
    (offer.listed_fees ?? []).reduce((sum, fee) => sum + fee.amount_paise, 0)
  );
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
