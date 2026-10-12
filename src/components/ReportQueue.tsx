import { useEffect, useRef, useState } from "react";
import { adminRequest } from "../adminApi";
import { rupees } from "../format";
import {
  reportReasons,
  reportStatuses,
  reportTime,
  type OfferReport,
  type ReportDetail,
  type ReportPage,
  type ReportStatus,
} from "../reports";
import "./Reports.css";

function Pages<T>({
  page,
  name,
  change,
}: {
  page: ReportPage<T>;
  name: string;
  change: (offset: number) => void;
}) {
  return (
    <nav className="report-pages" aria-label={`${name} pagination`}>
      <span>
        {page.items.length
          ? `${page.offset + 1}–${Math.min(page.offset + page.items.length, page.total)} of ${page.total}`
          : "0 results"}
      </span>
      <button
        onClick={() => change(Math.max(0, page.offset - page.limit))}
        disabled={!page.offset}
        aria-label={`Previous ${name}`}
      >
        Previous
      </button>
      <button
        onClick={() => change(page.offset + page.limit)}
        disabled={page.offset + page.limit >= page.total}
        aria-label={`Next ${name}`}
      >
        Next
      </button>
    </nav>
  );
}

function Review({
  token,
  id,
  onClose,
  onUpdated,
}: {
  token: string;
  id: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [data, setData] = useState<ReportDetail | null>(null);
  const [status, setStatus] = useState<ReportStatus>("in_review");
  const [note, setNote] = useState("");
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const pending = useRef<AbortController | null>(null);
  const loadedRevision = useRef<number | null>(null);
  useEffect(() => () => pending.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    setData(null);
    void adminRequest<ReportDetail>(
      token,
      `/reports/${encodeURIComponent(id)}?limit=10&offset=${offset}`,
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          setData(result);
          if (loadedRevision.current !== result.report.revision) {
            setStatus(result.report.status);
            loadedRevision.current = result.report.revision;
          }
        }
      })
      .catch((failure: Error) => {
        if (!controller.signal.aborted) setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [token, id, offset, revision]);
  async function save() {
    if (!data || pending.current) return;
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      await adminRequest<OfferReport>(
        token,
        `/reports/${encodeURIComponent(id)}/review`,
        { expected_revision: data.report.revision, status, note: note.trim() },
        controller.signal,
      );
      if (!controller.signal.aborted) {
        setNote("");
        setOffset(0);
        setRevision((value) => value + 1);
        setSaved("Review saved. Recorded prices and matches are unchanged.");
        onUpdated();
      }
    } catch (failure) {
      if (!controller.signal.aborted) setError((failure as Error).message);
    } finally {
      pending.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }
  return (
    <section
      className="report-review"
      aria-label="Review report"
      aria-busy={busy}
    >
      <div className="report-queue-head">
        <h3>Review report</h3>
        <button onClick={onClose} disabled={busy}>
          Close review
        </button>
      </div>
      <button
        onClick={() => {
          setSaved("");
          setRevision((value) => value + 1);
        }}
        disabled={busy}
      >
        Reload report
      </button>
      {busy && <p role="status">Loading report…</p>}
      {error && <p role="alert">{error}</p>}
      {saved && <p role="status">{saved}</p>}
      {data && (
        <>
          <p>
            Reference: <code>{data.report.id}</code> · Revision{" "}
            {data.report.revision}
          </p>
          <h4>{reportReasons[data.report.reason]}</h4>
          <blockquote>{data.report.details}</blockquote>
          <p>
            <strong>{data.report.snapshot.title}</strong> ·{" "}
            {data.report.snapshot.retailer_name}
          </p>
          <p>
            Reported item price: {rupees(data.report.snapshot.item_paise)} ·{" "}
            {data.report.snapshot.in_stock
              ? "Recorded in stock"
              : "Stock not confirmed available"}
          </p>
          <p>
            Quote checked {reportTime(data.report.snapshot.observed_at)} ·
            Reported {reportTime(data.report.created_at)}
          </p>
          <p>
            Source: {data.report.snapshot.source_name} · Seller:{" "}
            {data.report.snapshot.seller} · {data.report.snapshot.condition} ·{" "}
            {data.report.snapshot.region}
          </p>
          <p>Compared with: {data.report.snapshot.comparison.title}</p>
          <details>
            <summary>Captured variant details</summary>
            <pre>
              {JSON.stringify(
                {
                  offer: data.report.snapshot.variant_attributes,
                  compared_with:
                    data.report.snapshot.comparison.variant_attributes,
                },
                null,
                2,
              )}
            </pre>
          </details>
          <p>
            <a
              href={`/?product=${encodeURIComponent(data.report.snapshot.product_id)}`}
            >
              Open current product evidence
            </a>
          </p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <label htmlFor="review-status">Review status</label>
            <select
              id="review-status"
              disabled={busy}
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as ReportStatus)
              }
            >
              {Object.entries(reportStatuses).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <label htmlFor="review-note">Private review note</label>
            <textarea
              id="review-note"
              value={note}
              disabled={busy}
              onChange={(event) => setNote(event.target.value)}
              maxLength={1000}
              minLength={
                status === "resolved" || status === "dismissed" ? 5 : undefined
              }
              required={status === "resolved" || status === "dismissed"}
              rows={3}
            />
            <p>
              Resolving or dismissing requires an explanation. Status changes
              record your review; verify and correct source evidence separately.
            </p>
            <button type="submit" disabled={busy}>
              Save review
            </button>
          </form>
          <h4>Review history</h4>
          <ol>
            {data.events.items.map((event) => (
              <li key={event.revision}>
                Revision {event.revision} ·{" "}
                {event.from_status
                  ? reportStatuses[event.from_status] + " → "
                  : ""}
                {reportStatuses[event.to_status]} ·{" "}
                {reportTime(event.created_at)}
                {event.note && <p>{event.note}</p>}
              </li>
            ))}
          </ol>
          {!busy && (
            <Pages page={data.events} name="review events" change={setOffset} />
          )}
        </>
      )}
    </section>
  );
}

export default function ReportQueue({ token }: { token: string }) {
  const [status, setStatus] = useState<ReportStatus | "all">("open");
  const [offset, setOffset] = useState(0);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<ReportPage<OfferReport> | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    setData(null);
    void adminRequest<ReportPage<OfferReport>>(
      token,
      `/reports?status=${status}&limit=25&offset=${offset}`,
      undefined,
      controller.signal,
    )
      .then((result) => {
        if (!controller.signal.aborted) {
          if (!Array.isArray(result.items))
            throw new Error("The report queue returned an invalid response.");
          setData(result);
        }
      })
      .catch((failure: Error) => {
        if (!controller.signal.aborted) setError(failure.message);
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [token, status, offset, revision]);
  return (
    <section
      className="panel import-panel report-queue"
      aria-label="Offer issue reports"
    >
      <div className="report-queue-head">
        <div>
          <span className="eyebrow">OWNER REVIEW</span>
          <h2>Offer issue reports</h2>
          <p>
            Review submitted price, model, stock and link issues against
            captured evidence.
          </p>
        </div>
        <button
          disabled={busy}
          onClick={() => setRevision((value) => value + 1)}
        >
          Refresh reports
        </button>
      </div>
      <div className="report-queue-controls">
        <label htmlFor="report-status-filter">Report status</label>
        <select
          id="report-status-filter"
          disabled={busy}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as ReportStatus | "all");
            setOffset(0);
          }}
        >
          <option value="all">All reports</option>
          {Object.entries(reportStatuses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>
      {busy && <p role="status">Loading issue reports…</p>}
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <ul className="report-queue-list">
            {data.items.map((report) => (
              <li key={report.id}>
                <strong>
                  {reportReasons[report.reason]} ·{" "}
                  {reportStatuses[report.status]}
                </strong>
                <p>
                  {report.snapshot.title} · {report.snapshot.retailer_name}
                </p>
                <p>
                  {rupees(report.snapshot.item_paise)} item price · Submitted{" "}
                  {reportTime(report.created_at)}
                </p>
                <button
                  onClick={() => setSelected(report.id)}
                  aria-label={`Review report ${report.id}`}
                >
                  Review report
                </button>
              </li>
            ))}
          </ul>
          {!data.items.length && <p>No reports match this status.</p>}
          <Pages page={data} name="reports" change={setOffset} />
        </>
      )}
      {selected && (
        <Review
          key={selected}
          token={token}
          id={selected}
          onClose={() => setSelected(null)}
          onUpdated={() => setRevision((value) => value + 1)}
        />
      )}
    </section>
  );
}
