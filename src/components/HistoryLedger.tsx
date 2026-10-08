import { useState } from "react";
import type { PriceHistory } from "../api";
import { rupees } from "../format";

export default function HistoryLedger({ history }: { history: PriceHistory }) {
  const [page, setPage] = useState(0);
  const rows = history.series
    .flatMap((series) => series.points.map((point) => ({ ...point, series })))
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
  if (!rows.length) return null;
  const offset = Math.min(
    page * 20,
    Math.max(0, Math.floor((rows.length - 1) / 20) * 20),
  );
  return (
    <section
      className="panel ledger-panel"
      aria-label="Historical prices by store and date"
    >
      <div className="panel-heading">
        <div>
          <h3>Where that price was recorded</h3>
          <p>Actual observations, with their retailer and source.</p>
        </div>
        <span className="pill">{rows.length} observations</span>
      </div>
      <div className="offers-table-wrap">
        <table className="offers-table">
          <thead>
            <tr>
              <th>Date & time</th>
              <th>Store</th>
              <th>Item price</th>
              <th>Delivered total</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(offset, offset + 20).map((row) => (
              <tr
                key={row.observation_id ?? `${row.series.offer_id}:${row.at}`}
              >
                <td>
                  {new Date(row.at).toLocaleString("en-IN", {
                    timeZone: "Asia/Kolkata",
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                  <small className="observed-date">IST</small>
                </td>
                <td>
                  {row.series.name}
                  <small className="observed-date">
                    {row.series.channel === "offline" ? "Offline" : "Online"}
                  </small>
                </td>
                <td>
                  {rupees(row.item_paise)}
                  {!row.in_stock && (
                    <small className="observed-date">
                      Not confirmed available
                    </small>
                  )}
                  <small className="observed-date">
                    {row.evidence_kind === "page_check"
                      ? "Retailer page check"
                      : row.evidence_kind === "historical_import"
                        ? "Historical import"
                        : "Recorded evidence"}
                  </small>
                  <details className="price-evidence">
                    <summary>Price evidence</summary>
                    <p>
                      {row.variant_snapshot
                        ? Object.entries(row.variant_snapshot)
                            .map(
                              ([key, value]) =>
                                `${key.replaceAll("_", " ")}: ${value}`,
                            )
                            .join(" · ")
                        : "The variant was not saved with this older observation."}
                    </p>
                    {row.context_snapshot && (
                      <p>
                        {row.context_snapshot.seller} ·{" "}
                        {row.context_snapshot.condition} ·{" "}
                        {row.context_snapshot.region}
                      </p>
                    )}
                  </details>
                </td>
                <td>{rupees(row.total_paise)}</td>
                <td>
                  {row.series.product_url ? (
                    <a
                      href={row.series.product_url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {row.series.source_name}
                    </a>
                  ) : (
                    row.series.source_name
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > 20 && (
        <div className="pagination">
          <button
            className="button secondary"
            disabled={offset === 0}
            onClick={() => setPage(Math.max(0, page - 1))}
          >
            Previous observations
          </button>
          <span>
            {offset + 1}–{Math.min(offset + 20, rows.length)} of {rows.length}
          </span>
          <button
            className="button secondary"
            disabled={offset + 20 >= rows.length}
            onClick={() => setPage(page + 1)}
          >
            Next observations
          </button>
        </div>
      )}
    </section>
  );
}
