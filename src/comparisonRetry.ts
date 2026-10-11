// Bound automatic recovery to the API's short comparison-lease retry contract.
const MAX_RETRIES = 3;
const MAX_WAIT_SECONDS = 15;

export class ComparisonBusyError extends Error {
  constructor(message: string, readonly retryAfterMs: number) {
    super(message);
    this.name = "ComparisonBusyError";
  }
}

export function comparisonError(message: string, response: Response): Error {
  const header = response.headers.get("Retry-After");
  if (response.status === 409 && header !== null && /^\d+$/.test(header)) {
    const seconds = Number(header);
    if (seconds <= MAX_WAIT_SECONDS) {
      return new ComparisonBusyError(message, Math.max(1, seconds) * 1_000);
    }
  }
  return new Error(message);
}

export const retryComparison = (failureCount: number, error: Error) =>
  failureCount < MAX_RETRIES && error instanceof ComparisonBusyError;

export const comparisonRetryDelay = (_failureCount: number, error: Error) =>
  error instanceof ComparisonBusyError ? error.retryAfterMs : 0;
