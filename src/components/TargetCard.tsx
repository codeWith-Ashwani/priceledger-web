import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, Bell, X } from "lucide-react";
import { api } from "../api";
import { rupees, shortDate } from "../format";
import { targetProgress, type Watch } from "../watchlist";

export default function TargetCard({
  watch,
  onView,
  onRemove,
}: {
  watch: Watch;
  onView: () => void;
  onRemove: () => void;
}) {
  const query = useQuery({
    queryKey: ["product", watch.productId],
    queryFn: ({ signal }) => api.product(watch.productId, signal),
    staleTime: 0,
    retry: false,
  });
  const progress = query.data
    ? targetProgress(watch.targetPaise, query.data.offers)
    : null;
  return (
    <article className="target-card">
      <span className="target-icon">
        <Bell size={19} />
      </span>
      <div>
        <h2>{watch.title}</h2>
        <p>
          Target <strong>{rupees(watch.targetPaise)}</strong> · exact variant,
          item + shipping
        </p>
        {query.isFetching ? (
          <p role="status">Checking recorded prices…</p>
        ) : query.isError ? (
          <p role="alert">
            Target status unavailable.{" "}
            <button
              className="text-button"
              onClick={() => void query.refetch()}
            >
              Retry target check
            </button>
          </p>
        ) : progress ? (
          <>
            <p className={progress.reached ? "target-reached" : ""}>
              <strong>
                {progress.reached
                  ? "Target reached"
                  : `${rupees(progress.remaining)} above target`}
              </strong>{" "}
              · {rupees(progress.best.total_paise)} at{" "}
              {progress.best.retailer_name}
            </p>
            <small>
              {progress.best.observed_at
                ? `Recorded ${shortDate(progress.best.observed_at)}. `
                : ""}
              Listed extras excluded; confirm checkout total.
            </small>
          </>
        ) : (
          <p>No fresh, available exact-variant total is confirmed.</p>
        )}
      </div>
      <button className="button secondary" onClick={onView}>
        View history <ArrowUpRight size={15} />
      </button>
      <button
        className="icon-button"
        onClick={onRemove}
        aria-label={`Remove target for ${watch.title}`}
      >
        <X size={18} />
      </button>
    </article>
  );
}
