import { base } from "./api";

export type ShopCondition = "new" | "used" | "refurbished";
export interface ShopQuote {
  id: string;
  shop_id: string;
  shop_name: string;
  city: string;
  state: string;
  area: string;
  item_paise: number;
  condition: ShopCondition;
  in_stock: boolean;
  observed_at: string;
  valid_until: string;
  reviewed_at: string;
  source_name: string;
  current: boolean;
}
export interface LocalQuotes {
  product_id: string;
  read_at: string;
  city_id: string | null;
  condition: ShopCondition;
  cities: { city_id: string; city: string; state: string }[];
  days: number;
  freshness_days: number;
  summary: {
    current_shop_count: number;
    range_ready: boolean;
    low_paise: number | null;
    high_paise: number | null;
  };
  items: ShopQuote[];
  total: number;
  limit: number;
  offset: number;
}
export interface DocumentedShop {
  id: string;
  name: string;
  city: string;
  state: string;
  area: string;
  source_active: boolean;
}
export interface OwnerQuote {
  id: string;
  product_id: string;
  shop_id: string;
  shop_name?: string;
  city?: string;
  state?: string;
  area?: string;
  product_snapshot: {
    title: string;
    brand: string;
    attributes: Record<string, unknown>;
  };
  item_paise: number;
  condition: ShopCondition;
  in_stock: boolean;
  observed_at: string;
  valid_until: string;
  evidence_reference: string;
  status: "draft" | "published" | "withdrawn";
  revision: number;
  updated_at: string;
}
export interface OwnerQuoteDetail {
  quote: OwnerQuote;
  events: Page<{ revision: number; status: string; note: string; at: string }>;
}
export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

export function shopPaise(value: string): number | null {
  if (!/^\d{1,8}(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ""] = value.trim().split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  return amount <= 2_000_000_000 ? amount : null;
}

const quoteDate = new Intl.DateTimeFormat("en-IN", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Kolkata",
});
export const shopTime = (value: string) =>
  `${quoteDate.format(new Date(value))} IST`;

export async function localQuotes(
  productId: string,
  city: string,
  condition: ShopCondition,
  offset: number,
  days: number,
  signal?: AbortSignal,
): Promise<LocalQuotes> {
  const query = new URLSearchParams({
    condition,
    offset: String(offset),
    limit: "10",
    days: String(days),
  });
  if (city) query.set("city_id", city);
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timer = setTimeout(abort, 20_000);
  try {
    const response = await fetch(
      `${base}/products/${encodeURIComponent(productId)}/offline-quotes?${query}`,
      { signal: controller.signal, cache: "no-store" },
    );
    if (!response.ok)
      throw new Error("Local shop evidence could not load. Try again.");
    const data: LocalQuotes = await response.json();
    if (
      data.product_id !== productId ||
      data.condition !== condition ||
      data.offset !== offset ||
      data.days !== days ||
      (city && data.city_id !== city)
    ) {
      throw new Error(
        "The local shop response belongs to another selection. Reload it.",
      );
    }
    return data;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}
