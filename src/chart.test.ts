import { describe, expect, it } from "vitest";
import { stepSegments } from "./chart";
import type { HistoryPoint } from "./api";
import { parseTarget } from "./watchlist";

const point = (day: number, amount: number | null): HistoryPoint => ({
  at: new Date(Date.UTC(2026, 9, day)).toISOString(),
  total_paise: amount,
  item_paise: amount,
  shipping_paise: 0,
  in_stock: amount !== null,
});

describe("history evidence", () => {
  it("breaks the graph at stock or missing observation gaps", () => {
    const segments = stepSegments(
      [
        point(1, 100),
        point(2, 200),
        point(3, null),
        point(4, 100),
        point(9, 300),
      ],
      (x) => x,
      (y) => y,
      48,
    );
    expect(segments).toHaveLength(3);
    expect(segments[0].path).toContain("H");
    expect(segments[1].path).not.toContain("H");
  });
  it("does not discard an observed zero price", () => {
    expect(
      stepSegments(
        [point(1, 0)],
        (x) => x,
        (y) => y,
        48,
      ),
    ).toHaveLength(1);
  });
  it("breaks at a failed check even within the normal collection interval", () => {
    const result = stepSegments(
      [point(1, 100), { ...point(2, 100), gap_before: true }],
      (x) => x,
      (y) => y,
      48,
    );
    expect(result).toHaveLength(2);
    expect(result.every((segment) => !segment.path.includes("H"))).toBe(true);
  });
});

describe("target price input", () => {
  it("preserves paise and rejects ambiguous amounts", () => {
    expect(parseTarget("1499.95")).toBe(149995);
    for (const value of [
      "0",
      "-2",
      "abc",
      "1.234",
      "1e4",
      "1,000",
      "999999999999",
    ])
      expect(parseTarget(value)).toBeNull();
  });
});
