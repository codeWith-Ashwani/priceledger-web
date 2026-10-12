/** Bounded JSON transport; private headers never follow an API redirect. */
export async function requestJson(
  url: string,
  options: RequestInit = {},
  timeout = 20_000,
): Promise<{ response: Response; data: unknown }> {
  const controller = new AbortController();
  const cancel = () => controller.abort();
  options.signal?.addEventListener("abort", cancel, { once: true });
  if (options.signal?.aborted) cancel();
  let expired = false;
  const timer = setTimeout(() => {
    expired = true;
    cancel();
  }, timeout);
  try {
    controller.signal.throwIfAborted();
    const response = await fetch(url, {
      cache: "no-store",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      ...options,
      redirect: "error",
      signal: controller.signal,
    });
    let data: unknown;
    try {
      data = await response.json();
    } catch (failure) {
      if (controller.signal.aborted) throw failure;
      throw new Error(
        "The service returned an unreadable response. Try again.",
      );
    }
    controller.signal.throwIfAborted();
    return { response, data };
  } catch (failure) {
    if (expired && !options.signal?.aborted)
      throw new Error(
        "The request timed out. Try again; the previous action may have completed.",
      );
    throw failure;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", cancel);
  }
}

export function responseMessage(data: unknown, fallback: string): string {
  const detail =
    data && typeof data === "object" && "detail" in data ? data.detail : null;
  if (typeof detail === "string") return detail;
  if (
    detail &&
    typeof detail === "object" &&
    "message" in detail &&
    typeof detail.message === "string"
  )
    return detail.message;
  if (Array.isArray(detail)) {
    const messages = detail
      .filter(
        (error) =>
          error && Array.isArray(error.loc) && typeof error.msg === "string",
      )
      .map((error) => `${error.loc.join(".")}: ${error.msg}`);
    if (messages.length) return messages.join("; ");
  }
  return fallback;
}
