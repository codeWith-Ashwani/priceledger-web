import { base } from "./api";

export const reportReasons = {
  wrong_price: "Incorrect price",
  wrong_product: "Wrong product or model",
  outdated_price: "Outdated quote",
  stock_status: "Incorrect stock status",
  broken_link: "Store link does not work",
};
export const reportStatuses = {
  open: "Open",
  in_review: "Under review",
  resolved: "Resolved",
  dismissed: "Dismissed",
};
export type ReportReason = keyof typeof reportReasons;
export type ReportStatus = keyof typeof reportStatuses;
export interface ReportSubmission {
  request_id: string;
  offer_id: string;
  comparison_product_id: string;
  reason: ReportReason;
  details: string;
  observed_at: string | null;
  item_paise: number | null;
  in_stock: boolean;
}
export interface ReportReceipt {
  report_id: string;
  recorded_at: string;
  replayed: boolean;
}
export interface OfferReport {
  id: string;
  offer_id: string;
  reason: ReportReason;
  status: ReportStatus;
  revision: number;
  created_at: string;
  updated_at: string;
  details?: string;
  snapshot: {
    product_id: string;
    title: string;
    brand: string;
    retailer_name: string;
    source_name: string;
    product_url: string | null;
    item_paise: number | null;
    shipping_paise: number | null;
    observed_at: string | null;
    in_stock: boolean;
    condition: string;
    seller: string;
    region: string;
    variant_attributes: Record<string, unknown>;
    comparison: {
      product_id: string;
      title: string;
      brand: string;
      variant_attributes: Record<string, unknown>;
    };
  };
}
export interface ReportPage<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
export interface ReportDetail {
  report: OfferReport;
  events: ReportPage<{
    revision: number;
    from_status: ReportStatus | null;
    to_status: ReportStatus;
    note: string;
    created_at: string;
  }>;
}
export const reportTime = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " IST"
    : "Not recorded";

export async function submitReport(
  body: ReportSubmission,
  signal: AbortSignal,
): Promise<ReportReceipt> {
  const response = await fetch(`${base}/reports`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
    cache: "no-store",
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "The report could not be accepted. Check its details and try again.",
    );
  if (
    typeof data.report_id !== "string" ||
    typeof data.recorded_at !== "string" ||
    typeof data.replayed !== "boolean"
  ) {
    throw new Error(
      "The report response could not be confirmed. Retry to check the same submission.",
    );
  }
  return data as ReportReceipt;
}
