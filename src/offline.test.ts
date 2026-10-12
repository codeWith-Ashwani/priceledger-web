import { describe, expect, it } from "vitest";
import { shopPaise } from "./offline";

describe("shop quote INR entry", () => {
  it("keeps integer paise for decimal amounts and the supported ceiling", () => {
    expect(shopPaise("1.01")).toBe(101);
    expect(shopPaise(" 1234.5 ")).toBe(123450);
    expect(shopPaise("0")).toBe(0);
    expect(shopPaise("20000000")).toBe(2_000_000_000);
  });
  it("rejects ambiguous or invalid currency input", () => {
    for (const value of [
      "",
      "1,234",
      "₹100",
      "-1",
      "1.001",
      "1e2",
      "NaN",
      "Infinity",
      "20000000.01",
    ]) {
      expect(shopPaise(value)).toBeNull();
    }
  });
});
