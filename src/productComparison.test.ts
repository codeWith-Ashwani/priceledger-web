import { describe, expect, it } from "vitest";
import type { Product } from "./api";
import { factValue, identicalKnownFact } from "./productComparison";

const product = (attributes: Product["attributes"]) =>
  ({ brand: "Test", category: "electronics", attributes }) as Product;

describe("recorded comparison facts", () => {
  it("keeps missing, invalid and numeric facts distinct", () => {
    expect(factValue(product({}), "storage_gb")).toBeNull();
    expect(factValue(product({ storage_gb: 128 }), "storage_gb")).toBe("128");
    expect(factValue(product({ color: "  " }), "color")).toBeNull();
    expect(factValue(product({ storage_gb: NaN }), "storage_gb")).toBeNull();
  });
  it("hides only identical known facts, preserving uncertainty", () => {
    expect(
      identicalKnownFact(
        [product({ color: "Blue" }), product({ color: "blue " })],
        "color",
      ),
    ).toBe(true);
    expect(
      identicalKnownFact([product({ color: "Blue" }), product({})], "color"),
    ).toBe(false);
    expect(identicalKnownFact([product({}), product({})], "color")).toBe(false);
    expect(
      identicalKnownFact(
        [product({ storage_gb: 128 }), product({ storage_gb: 256 })],
        "storage_gb",
      ),
    ).toBe(false);
  });
});
