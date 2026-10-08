export interface Watch {
  productId: string;
  title: string;
  targetPaise: number;
}
const key = "priceledger:watches:v1";

export function readWatches(): Watch[] {
  try {
    const data: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    if (!Array.isArray(data)) return [];
    return data.filter(
      (item): item is Watch =>
        item !== null &&
        typeof item === "object" &&
        typeof item.productId === "string" &&
        typeof item.title === "string" &&
        Number.isSafeInteger(item.targetPaise) &&
        item.targetPaise > 0,
    );
  } catch {
    return [];
  }
}

export function saveWatches(watches: Watch[]): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(watches));
    return true;
  } catch {
    return false;
  }
}

export function parseTarget(value: string): number | null {
  if (!/^\d+(\.\d{1,2})?$/.test(value.trim())) return null;
  const paise = Math.round(Number(value) * 100);
  return Number.isSafeInteger(paise) && paise > 0 && paise <= 2_000_000_000
    ? paise
    : null;
}
