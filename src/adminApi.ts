import { base } from "./api";

export interface ImportSource {
  id: string;
  name: string;
  approval_reference: string | null;
  expires_at: string | null;
}
export interface ImportOffer {
  offer_id: string;
  product_id: string;
  title: string;
  retailer_id: string;
  retailer_listing_id: string;
  variant_attributes: Record<string, string | number | boolean>;
  seller: string;
  condition: string;
  region: string;
}
export interface ImportPreview {
  import_id: string | null;
  can_commit: boolean;
  source_name: string;
  expires_at: string | null;
  ready: number;
  duplicates: number;
  errors: number;
  rows: {
    row: number;
    status: "ready" | "duplicate" | "error";
    message: string;
    offer_id?: string;
    product_id?: string;
    title?: string;
    retailer_id?: string;
    observed_at?: string;
    item_paise?: number | null;
  }[];
}
export interface ImportResult {
  import_id: string;
  inserted: number;
  duplicates: number;
  product_ids: string[];
  replayed: boolean;
}
export interface ImportAudit {
  id: string;
  source_name: string;
  file_name: string;
  status: string;
  created_at: string;
  committed_at: string | null;
  content_sha256: string;
  result: ImportResult | null;
}

export async function adminRequest<T>(
  token: string,
  path: string,
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const response = await fetch(`${base}/admin${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      "X-Admin-Token": token,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    cache: "no-store",
    signal,
  });
  const data = await response.json();
  if (!response.ok) {
    const detail = data.detail;
    throw new Error(
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
          ? detail
              .map(
                (error: { loc: string[]; msg: string }) =>
                  `${error.loc.join(".")}: ${error.msg}`,
              )
              .join("; ")
          : "The owner request could not complete.",
    );
  }
  return data as T;
}

export function downloadTemplate(offer: ImportOffer) {
  const { product_id, title, ...mapping } = offer;
  void product_id;
  void title;
  const content = JSON.stringify(
    [
      {
        ...mapping,
        external_event_id: "",
        observed_at: "",
        item_paise: null,
        shipping_paise: null,
        mrp_paise: null,
        in_stock: null,
        currency: "INR",
        price_type: "listing",
        evidence_reference: "",
      },
    ],
    null,
    2,
  );
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "priceledger-history-template.json";
  anchor.click();
  URL.revokeObjectURL(url);
}
