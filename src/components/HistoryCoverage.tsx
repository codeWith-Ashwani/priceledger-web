import type { UseQueryResult } from "@tanstack/react-query";
import type { HistoryCoverage as Coverage } from "../api";

function date(value: string | null) {
  return value
    ? new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " IST"
    : "No observation";
}

export default function HistoryCoverage({
  query,
}: {
  query: UseQueryResult<Coverage, Error>;
}) {
  return (
    <section className="panel coverage-panel" aria-label="History coverage">
      <div className="panel-heading">
        <div>
          <h3>How much history do we have?</h3>
          <p>Observed days and collection status for this exact product.</p>
        </div>
        <span className="pill">Recorded evidence</span>
      </div>
      {query.isPending ? (
        <p role="status">Loading history coverage…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>History coverage could not be loaded.</p>
          <button className="text-button" onClick={() => void query.refetch()}>
            Retry coverage
          </button>
        </div>
      ) : (
        query.data && (
          <>
            <div className="coverage-grid">
              {query.data.stores.map((store) => (
                <article key={store.offer_id}>
                  <strong>
                    {store.retailer_name} ·{" "}
                    {store.channel === "offline" ? "Offline" : "Online"}
                  </strong>
                  <p>
                    {store.observations} observations across{" "}
                    {store.observed_days} observed days
                  </p>
                  <dl>
                    <dt>First evidence</dt>
                    <dd>{date(store.first_observed_at)}</dd>
                    <dt>Latest evidence</dt>
                    <dd>{date(store.latest_observed_at)}</dd>
                    <dt>Collection</dt>
                    <dd>
                      {store.collection_status === "paused"
                        ? "Paused for review"
                        : store.collection_status === "running"
                          ? "Check in progress"
                          : store.collection_status === "queued"
                            ? "Scheduled"
                            : store.collection_status === "awaiting_retry"
                              ? "Awaiting retry"
                              : "Not scheduled"}
                    </dd>
                    {store.next_eligible_check_at && (
                      <>
                        <dt>Next eligible check</dt>
                        <dd>{date(store.next_eligible_check_at)}</dd>
                      </>
                    )}
                  </dl>
                  {store.last_check?.outcome === "failure" && (
                    <p className="coverage-failure">
                      Latest check failed at {date(store.last_check.at)}. The
                      last recorded price remains visible; failed checks add no
                      price to the timeline.
                    </p>
                  )}
                  {store.imported_observations > 0 && (
                    <p>
                      {store.imported_observations} sourced historical imports
                    </p>
                  )}
                  <small>{store.source_name}</small>
                </article>
              ))}
            </div>
            <p className="coverage-note">
              {query.data.history_note} Scheduled checks require the collector
              to be running.
            </p>
          </>
        )
      )}
    </section>
  );
}
