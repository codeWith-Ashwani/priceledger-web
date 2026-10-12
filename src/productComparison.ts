import { base, type Offer, type Product } from "./api";

export const comparisonLimit = 4;
export interface ProductComparison {
  checked_at: string;
  scope: "independent_exact_variants";
  note: string;
  products: (Product & { offers: Offer[] })[];
}
export const comparisonFacts = [
  ["brand", "Brand"],
  ["category", "Category"],
  ["model", "Recorded model"],
  ["color", "Colour"],
  ["ram_gb", "RAM (GB)"],
  ["storage_gb", "Storage (GB)"],
  ["size", "Size"],
  ["pack", "Pack"],
  ["mpn", "Part number"],
] as const;

export function factValue(product: Product, key: string): string | null {
  const value =
    key === "brand"
      ? product.brand
      : key === "category"
        ? product.category
        : product.attributes[key];
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number")
    return Number.isFinite(value) ? String(value) : null;
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return null;
}

export function identicalKnownFact(products: Product[], key: string): boolean {
  const values = products.map((product) =>
    factValue(product, key)?.toLowerCase(),
  );
  return (
    values.length > 1 &&
    values.every((value) => value !== undefined && value === values[0])
  );
}

export async function loadProductComparison(
  ids: string[],
  signal: AbortSignal,
): Promise<ProductComparison> {
  const response = await fetch(`${base}/product-comparison`, {
    redirect: "error",
    credentials: "omit",
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_ids: ids }),
    cache: "no-store",
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(
      typeof data.detail === "string"
        ? data.detail
        : "The selected products could not be compared. Try again.",
    );
  if (
    data.scope !== "independent_exact_variants" ||
    typeof data.checked_at !== "string" ||
    Number.isNaN(Date.parse(data.checked_at)) ||
    !Array.isArray(data.products) ||
    data.products.length !== ids.length ||
    data.products.some(
      (product: Product & { offers: Offer[] }, index: number) =>
        !product ||
        typeof product !== "object" ||
        !product.attributes ||
        product.id !== ids[index] ||
        product.is_demo ||
        !Array.isArray(product.offers),
    )
  )
    throw new Error(
      "The comparison response could not be verified. Try again.",
    );
  return data as ProductComparison;
}
