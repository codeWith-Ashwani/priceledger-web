import { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";
import { rupees } from "../format";
import "./CollectionDashboard.css";

const filters = {
  all: "All offers",
  stale: "Stale or missing prices",
  failed: "Failed checks",
  gap: "History gaps",
  due: "Ready for collection",
  paused: "Paused jobs",
  unscheduled: "Unscheduled offers",
  inactive: "Inactive sources",
};
type Filter = keyof typeof filters;
interface Overview {
  checked_at: string;
  summary: Record<
    | "tracked"
    | "stale"
    | "gap"
    | "failed"
    | "due"
    | "running"
    | "paused"
    | "unscheduled"
    | "inactive",
    number
  >;
  checks_24h: {
    completed: number;
    failed: number;
    latest_completed_at: string | null;
  };
  freshness_hours: number;
  gap_hours: number;
  note: string;
}
interface TrackedOffer {
  offer_id: string;
  product_id: string;
  title: string;
  retailer_name: string;
  current_item_paise: number | null;
  current_observed_at: string | null;
  last_evidence_at: string | null;
  next_run_at: string | null;
  job_status: string | null;
  last_check_error: string | null;
  last_error_code: string | null;
  last_check_at: string | null;
  blocked_until: string | null;
  remaining_requests: number;
  source_active: boolean;
  stale: boolean;
  gap: boolean;
  failed: boolean;
  due: boolean;
  lease_expired: boolean;
}
interface CollectionSource {
  id: string;
  name: string;
  active: boolean;
  blocked_until: string | null;
  remaining_requests: number;
  tracked: number;
  completed_24h: number;
  failed_24h: number;
  latest_completed_at: string | null;
}
interface Page<T> {
  checked_at: string;
  items: T[];
  total: number;
  limit: number;
  offset: number;
}
type SourcePage = Page<CollectionSource> & { daily_budget: number };

const time = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " IST"
    : "Not recorded";
const cooling = (until: string | null, checked: string) =>
  Boolean(until && Date.parse(until) > Date.parse(checked));

function Pagination({
  name,
  page,
  busy,
  change,
}: {
  name: string;
  page: Page<unknown>;
  busy: boolean;
  change: (offset: number) => void;
}) {
  return (
    <nav className="collection-pagination" aria-label={`${name} pages`}>
      <span>
        {page.total
          ? `${page.offset + 1}–${Math.min(page.offset + page.items.length, page.total)} of ${page.total}`
          : "0 results"}
      </span>
      <button
        type="button"
        disabled={busy || page.offset === 0}
        onClick={() => change(Math.max(0, page.offset - page.limit))}
        aria-label={`Previous ${name}`}
      >
        Previous
      </button>
      <button
        type="button"
        disabled={busy || page.offset + page.limit >= page.total}
        onClick={() => change(page.offset + page.limit)}
        aria-label={`Next ${name}`}
      >
        Next
      </button>
    </nav>
  );
}

export default function CollectionDashboard({ token }: { token: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [offerOffset, setOfferOffset] = useState(0);
  const [sourceOffset, setSourceOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<{
    overview: Overview;
    offers: Page<TrackedOffer>;
    sources: SourcePage;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    setData(null);
    const read = <T,>(path: string) =>
      adminRequest<T>(
        token,
        `/collection/${path}`,
        undefined,
        controller.signal,
      );
    void Promise.all([
      read<Overview>("overview"),
      read<Page<TrackedOffer>>(
        `offers?status=${filter}&limit=25&offset=${offerOffset}`,
      ),
      read<SourcePage>(`sources?limit=25&offset=${sourceOffset}`),
    ])
      .then(([overview, offers, sources]) => {
        if (!controller.signal.aborted) {
          if (
            !overview.summary ||
            !Array.isArray(offers.items) ||
            !Array.isArray(sources.items)
          )
            throw new Error("Collection health returned an invalid response.");
          setData({ overview, offers, sources });
        }
      })
      .catch((failure: Error) => {
        if (!controller.signal.aborted) setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [token, filter, offerOffset, sourceOffset, revision]);

  return (
    <section
      className="panel import-panel collection-dashboard"
      aria-label="Collection health"
      aria-busy={busy}
    >
      <div className="collection-heading">
        <div>
          <span className="eyebrow">OWNER WORKSPACE</span>
          <h2>Collection health</h2>
          <p>
            Recorded collection activity, source limits and gaps in price
            evidence.
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => setRevision((value) => value + 1)}
        >
          Refresh health
        </button>
      </div>
      {busy && <p role="status">Loading collection health…</p>}
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <div className="collection-metrics">
            {(
              [
                ["tracked", "Tracked offers"],
                ["stale", "Stale prices"],
                ["failed", "Offers with failures"],
                ["gap", "History gaps"],
                ["due", "Ready for collection"],
              ] as const
            ).map(([key, label]) => (
              <div key={key}>
                <span>{label}</span>
                <strong>{data.overview.summary[key]}</strong>
              </div>
            ))}
          </div>
          <p>
            {data.overview.checks_24h.completed} completed checks in the last 24
            hours · {data.overview.checks_24h.failed} failed. Last completion:{" "}
            {time(data.overview.checks_24h.latest_completed_at)}.
          </p>
          <p>
            {data.overview.summary.running} leased jobs ·{" "}
            {data.overview.summary.paused} paused ·{" "}
            {data.overview.summary.unscheduled} unscheduled ·{" "}
            {data.overview.summary.inactive} inactive source offers.
          </p>
          <p className="collection-note">
            Missing prices count as stale; recorded prices become stale after{" "}
            {data.overview.freshness_hours} hours. History gaps mean no approved
            price observation in {data.overview.gap_hours} hours. Scheduling
            does not confirm a worker is running.
          </p>
          <label className="collection-filter">
            Show tracked offers
            <select
              value={filter}
              onChange={(event) => {
                setFilter(event.target.value as Filter);
                setOfferOffset(0);
              }}
            >
              {Object.entries(filters).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <div
            className="collection-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Tracked offer health"
          >
            <table>
              <thead>
                <tr>
                  <th>Product / store</th>
                  <th>Recorded price</th>
                  <th>Evidence / schedule</th>
                  <th>Collection state</th>
                </tr>
              </thead>
              <tbody>
                {data.offers.items.map((offer) => (
                  <tr key={offer.offer_id}>
                    <td>
                      <a
                        href={`/?product=${encodeURIComponent(offer.product_id)}`}
                      >
                        {offer.title}
                      </a>
                      <span>{offer.retailer_name}</span>
                    </td>
                    <td>
                      {rupees(offer.current_item_paise)}
                      <span>{time(offer.current_observed_at)}</span>
                      {offer.stale && <span>Stale price</span>}
                    </td>
                    <td>
                      Last approved: {time(offer.last_evidence_at)}
                      <span>Scheduled: {time(offer.next_run_at)}</span>
                      {offer.gap && <span>History gap</span>}
                    </td>
                    <td>
                      {offer.job_status ?? "Unscheduled"}
                      {offer.failed && (
                        <span>
                          Failed:{" "}
                          {offer.last_check_error ??
                            offer.last_error_code ??
                            "No error code"}
                        </span>
                      )}
                      {offer.lease_expired && <span>Lease expired</span>}
                      {offer.due && <span>Ready for collection</span>}
                      {!offer.source_active && <span>Source inactive</span>}
                      {cooling(offer.blocked_until, data.offers.checked_at) && (
                        <span>Cooldown until {time(offer.blocked_until)}</span>
                      )}
                      <span>
                        {offer.remaining_requests} requests remaining today
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.offers.items.length && (
              <p>No tracked offers match this filter.</p>
            )}
          </div>
          <Pagination
            name="offers"
            page={data.offers}
            busy={busy}
            change={setOfferOffset}
          />
          <h3>Source health</h3>
          <div
            className="collection-table-scroll"
            tabIndex={0}
            role="region"
            aria-label="Source health"
          >
            <table>
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Access / budget</th>
                  <th>Checks in 24 hours</th>
                </tr>
              </thead>
              <tbody>
                {data.sources.items.map((source) => (
                  <tr key={source.id}>
                    <td>
                      {source.name}
                      <span>{source.tracked} tracked offers</span>
                    </td>
                    <td>
                      {source.active ? "Source active" : "Source inactive"}
                      <span>
                        {source.remaining_requests} /{" "}
                        {data.sources.daily_budget} requests remaining today
                      </span>
                      {cooling(
                        source.blocked_until,
                        data.sources.checked_at,
                      ) && (
                        <span>Cooldown until {time(source.blocked_until)}</span>
                      )}
                    </td>
                    <td>
                      {source.completed_24h} completed · {source.failed_24h}{" "}
                      failed
                      <span>
                        Last completion: {time(source.latest_completed_at)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!data.sources.items.length && (
              <p>No public-page sources recorded yet.</p>
            )}
          </div>
          <Pagination
            name="sources"
            page={data.sources}
            busy={busy}
            change={setSourceOffset}
          />
          <p className="collection-note">
            Checked {time(data.overview.checked_at)}. This view is read-only;
            refresh does not contact retailers or change their budgets.
          </p>
        </>
      )}
    </section>
  );
}
