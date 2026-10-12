import { afterEach, describe, expect, it, vi } from "vitest";
import { requestJson, responseMessage } from "./request";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("API transport", () => {
  it("does not forward private headers through redirects or attach browser cookies", async () => {
    const fetcher = vi.fn(
      async (_url: string, _options?: RequestInit) =>
        new Response(JSON.stringify({ ok: true })),
    );
    vi.stubGlobal("fetch", fetcher);
    const result = await requestJson("https://api.example.org/admin/imports", {
      headers: { "X-Admin-Token": "contract-only" },
      redirect: "follow",
    });
    expect(result.data).toEqual({ ok: true });
    expect(fetcher.mock.calls[0][1]).toMatchObject({
      redirect: "error",
      credentials: "omit",
      cache: "no-store",
      headers: { "X-Admin-Token": "contract-only" },
    });
  });

  it.each(["headers", "body"])(
    "bounds a stalled response during %s",
    async (stage) => {
      vi.useFakeTimers();
      vi.stubGlobal("fetch", (_url: string, options: RequestInit) => {
        const pending = new Promise((_, reject) =>
          options.signal!.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          ),
        );
        return stage === "headers"
          ? pending
          : Promise.resolve({ json: () => pending });
      });
      const result = requestJson("https://api.example.org/lookup", {}, 1000);
      const assertion = expect(result).rejects.toThrow("timed out");
      await vi.advanceTimersByTimeAsync(1001);
      await assertion;
      expect(vi.getTimerCount()).toBe(0);
    },
  );

  it("cancels an abandoned request without converting it to a timeout", async () => {
    vi.useFakeTimers();
    const parent = new AbortController();
    vi.stubGlobal(
      "fetch",
      (_url: string, options: RequestInit) =>
        new Promise((_, reject) => {
          options.signal!.addEventListener(
            "abort",
            () => reject(new DOMException("Aborted", "AbortError")),
            { once: true },
          );
        }),
    );
    const result = requestJson("https://api.example.org/products", {
      signal: parent.signal,
    });
    const assertion = expect(result).rejects.toMatchObject({
      name: "AbortError",
    });
    parent.abort();
    await assertion;
    expect(vi.getTimerCount()).toBe(0);
  });

  it("does not start a fetch for an already cancelled request", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const parent = new AbortController();
    parent.abort();
    await expect(
      requestJson("https://api.example.org/products", {
        signal: parent.signal,
      }),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("keeps unreadable gateway bodies out of errors and clears the deadline", async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      "fetch",
      async () => new Response("PRIVATE gateway internals", { status: 502 }),
    );
    await expect(requestJson("https://api.example.org/lookup")).rejects.toThrow(
      "unreadable response",
    );
    expect(vi.getTimerCount()).toBe(0);
  });

  it("keeps structured server errors useful and ignores malformed error shapes", () => {
    expect(
      responseMessage(
        { detail: [{ loc: ["body", "records", 0], msg: "Invalid variant" }] },
        "Fallback",
      ),
    ).toBe("body.records.0: Invalid variant");
    expect(
      responseMessage({ detail: { message: "Retry later" } }, "Fallback"),
    ).toBe("Retry later");
    expect(responseMessage(null, "Fallback")).toBe("Fallback");
    expect(responseMessage({ detail: [null, { msg: 4 }] }, "Fallback")).toBe(
      "Fallback",
    );
  });
});
