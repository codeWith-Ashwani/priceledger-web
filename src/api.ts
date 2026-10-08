export interface Product {
  id: string;
  title: string;
  brand: string;
  category: string;
  variant_label: string;
  attributes: Record<string, string | number | boolean>;
  illustration: string;
  is_demo: boolean;
  image_url: string | null;
  best_item_price_paise: number | null;
  best_price_paise: number | null;
  retailer_count: number;
}

export interface Offer {
  product_url: string | null;
  channel: "online" | "offline";
  availability: "in_stock" | "out_of_stock" | "unknown";
  id: string;
  retailer_id: string;
  retailer_name: string;
  color: string;
  seller: string;
  condition: string;
  region: string;
  item_paise: number | null;
  shipping_paise: number | null;
  total_paise: number | null;
  in_stock: boolean;
  stale: boolean;
  observed_at: string | null;
  source_name: string;
  is_demo: boolean;
}

export interface ProductDetail extends Product {
  offers: Offer[];
  first_observed_at: string | null;
  launch_date: string | null;
  launch_date_verified: boolean;
}

export interface HistoryPoint {
  price_paise?: number | null;
  at: string;
  total_paise: number | null;
  item_paise: number | null;
  shipping_paise: number | null;
  in_stock: boolean;
}

export interface HistorySeries {
  channel: string;
  source_name: string;
  product_url: string | null;
  offer_id: string;
  retailer_id: string;
  name: string;
  color: string;
  points: HistoryPoint[];
}

export interface PriceHistory {
  price_basis: "item" | "delivered";
  product_id: string;
  days: number;
  currency: "INR";
  series: HistorySeries[];
  max_gap_hours: number;
}

export interface Assessment {
  verdict:
    "insufficient_history" | "below_usual" | "above_usual" | "near_usual";
  current_paise: number | null;
  baseline_paise: number | null;
  savings_percent: number | null;
  recorded_low_paise: number | null;
  recorded_high_paise: number | null;
  recent_high_paise: number | null;
  recent_rise_then_drop: boolean;
  reference_days_observed: number;
  reference_days_required: number;
  reference_start: string;
  reference_end: string;
  method: string;
  algorithm_version: string;
  history_window_days: number;
  offer_id: string | null;
  retailer_name: string | null;
  is_demo: boolean;
  advertised_discount_percent: number | null;
}

const base = (
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8000/api/v1"
).replace(/\/$/, "");

export interface SearchStore {
  retailer: string;
  retailer_name: string;
  status: string;
  message: string;
  search_url: string;
  items: {
    title: string;
    url: string;
    retailer: string;
    retailer_name: string;
  }[];
}

export interface ComparisonScan {
  product_id: string;
  checked_at: string;
  cached: boolean;
  history_note: string;
  stores: {
    retailer: string;
    retailer_name: string;
    status: string;
    message: string;
    search_url: string;
    items: {
      product_id: string;
      title: string;
      url: string;
      item_paise: number;
      shipping_paise: number | null;
      availability: string;
      condition: string;
      match_status: string;
      reason: string;
      source_name: string;
      observed_at: string;
    }[];
  }[];
}

export type LookupResult =
  | { kind: "product"; product_id: string; cached: boolean; message: string }
  | { kind: "search"; query: string; stores: SearchStore[]; message: string };

async function get<T>(route: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${base}${route}`, { signal });
  if (!response.ok)
    throw new Error(
      response.status === 404
        ? "This product is not available."
        : "The comparison service could not load this data.",
    );
  return response.json() as Promise<T>;
}

export const api = {
  comparison: async (
    id: string,
    signal?: AbortSignal,
  ): Promise<ComparisonScan> => {
    const response = await fetch(
      `${base}/products/${encodeURIComponent(id)}/compare`,
      { method: "POST", signal },
    );
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : (data.detail?.message ?? "Other stores could not be checked."),
      );
    return data as ComparisonScan;
  },
  lookup: async (
    query: string,
    signal?: AbortSignal,
  ): Promise<LookupResult> => {
    const response = await fetch(`${base}/lookup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
      signal,
    });
    const data = await response.json();
    if (!response.ok)
      throw new Error(
        typeof data.detail === "string"
          ? data.detail
          : (data.detail?.message ?? "The product lookup could not complete."),
      );
    return data as LookupResult;
  },
  health: (signal?: AbortSignal) =>
    get<{ status: string; demo_mode: boolean }>("/health", signal),
  categories: (signal?: AbortSignal) =>
    get<{ id: string; name: string; count: number }[]>("/categories", signal),
  products: (q = "", category = "", offset = 0, signal?: AbortSignal) =>
    get<{ items: Product[]; total: number; limit: number; offset: number }>(
      `/products?${new URLSearchParams({ q, category, offset: String(offset), limit: "24" })}`,
      signal,
    ),
  product: (id: string, signal?: AbortSignal) =>
    get<ProductDetail>(`/products/${encodeURIComponent(id)}`, signal),
  history: (id: string, days: number, signal?: AbortSignal) =>
    get<PriceHistory>(
      `/products/${encodeURIComponent(id)}/history?days=${days}&basis=item`,
      signal,
    ),
  assessment: (id: string, signal?: AbortSignal) =>
    get<Assessment>(`/products/${encodeURIComponent(id)}/assessment`, signal),
};
