import { afterEach, expect, it, vi } from "vitest";
import { api } from "./api";
import { comparisonRetryDelay, retryComparison } from "./comparisonRetry";

afterEach(() => vi.unstubAllGlobals());

it("recovers only short server-directed comparison conflicts and caps retries", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ detail: "Comparison already running" }),
    { status: 409, headers: { "Retry-After": "7" } },
  )));
  const error = await api.comparison("contract-id").catch((reason: Error) => reason);
  expect(error).toBeInstanceOf(Error);
  if (!(error instanceof Error)) throw new Error("Expected conflict");
  expect(error.message).toBe("Comparison already running");
  expect(comparisonRetryDelay(0, error)).toBe(7_000);
  expect(retryComparison(0, error)).toBe(true);
  expect(retryComparison(2, error)).toBe(true);
  expect(retryComparison(3, error)).toBe(false);
});

it.each([
  [409, null], [409, "bad"], [409, "-1"], [409, "1.5"], [409, "60"],
  [429, "1"], [403, "1"], [502, "1"],
])("does not retry status %s with Retry-After %s", async (status, header) => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ detail: { message: "Explicit failure" } }),
    { status: Number(status), headers: header === null ? {} : { "Retry-After": String(header) } },
  )));
  const error = await api.comparison("contract-id").catch((reason: Error) => reason);
  if (!(error instanceof Error)) throw new Error("Expected failure");
  expect(error.message).toBe("Explicit failure");
  expect(retryComparison(0, error)).toBe(false);
});

it("does not auto-retry network failures", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Network unavailable")));
  const error = await api.comparison("contract-id").catch((reason: Error) => reason);
  if (!(error instanceof Error)) throw new Error("Expected failure");
  expect(retryComparison(0, error)).toBe(false);
});
