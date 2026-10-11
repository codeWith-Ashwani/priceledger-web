import type { UseQueryResult } from "@tanstack/react-query";
import type { PriceInsights as Insights, PriceMilestone } from "../api";
import { rupees, shortDate } from "../format";

export default function PriceInsights({
  query,
}: {
  query: UseQueryResult<Insights, Error>;
}) {
  if (query.isPending)
    return <p role="status">Loading recorded price statistics…</p>;
  if (query.isError)
    return (
      <p role="alert">
        Price statistics could not load.{" "}
        <button className="text-button" onClick={() => void query.refetch()}>
          Retry statistics
        </button>
      </p>
    );
  const data = query.data;
  const milestone = (label: string, point: PriceMilestone | null) => (
    <div>
      <span>{label}</span>
      <strong>{rupees(point?.price_paise ?? null)}</strong>
      <small title={point?.source_name}>
        {point
          ? `${point.retailer_name} · ${shortDate(point.observed_at)}`
          : "Not recorded"}
      </small>
    </div>
  );
  return (
    <div aria-label="Recorded price statistics">
      <div className="history-stats">
        {milestone("Recorded low · selected period", data.low)}
        <div>
          <span>Average daily best item price</span>
          <strong>{rupees(data.daily_average_paise)}</strong>
          <small>
            {data.observed_days} observed{" "}
            {data.observed_days === 1 ? "day" : "days"} · exact variant
          </small>
        </div>
        {milestone("Recorded high · selected period", data.high)}
      </div>
      <p
        className="history-insights-note"
        title={`${data.method} ${data.source_policy}`}
      >
        {data.observed_days < 2
          ? "More observed days are needed to establish a trend. "
          : "Average uses each observed day’s lowest available item price. "}
        Missing days are excluded. Shipping and extras are excluded. This is
        recorded coverage, not a lifetime price record.
      </p>
    </div>
  );
}
