import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { localQuotes, shopTime, type ShopCondition } from "../offline";
import { rupees, shortDate, titleCase } from "../format";
import "./OfflineQuotes.css";

export default function LocalShopQuotes({ productId }: { productId: string }) {
  const [city, setCity] = useState("");
  const [condition, setCondition] = useState<ShopCondition>("new");
  const [offset, setOffset] = useState(0);
  const [days, setDays] = useState(90);
  const query = useQuery({
    queryKey: ["local-quotes", productId, city, condition, offset, days],
    queryFn: ({ signal }) =>
      localQuotes(productId, city, condition, offset, days, signal),
    retry: false,
    staleTime: 60_000,
    refetchInterval: 60_000,
  });
  const data = query.data;
  return (
    <aside className="local-card local-quotes" aria-label="Local shop quotes">
      <span className="eyebrow">Beyond the screen</span>
      <h3>
        Your local market,
        <br />
        with real context.
      </h3>
      <p>
        Owner-reviewed shop evidence for this exact variant. Online prices and
        histories stay separate.
      </p>
      <label>
        Product condition
        <select
          value={condition}
          onChange={(event) => {
            setCondition(event.target.value as ShopCondition);
            setCity("");
            setOffset(0);
          }}
        >
          <option value="new">New</option>
          <option value="used">Used</option>
          <option value="refurbished">Refurbished</option>
        </select>
      </label>
      <label>
        Quote history
        <select
          value={days}
          onChange={(event) => {
            setDays(Number(event.target.value));
            setCity("");
            setOffset(0);
          }}
        >
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
          <option value={365}>1 year</option>
          <option value={3650}>10 years</option>
        </select>
      </label>
      {query.isPending ? (
        <p role="status">Loading local shop evidence…</p>
      ) : query.isError ? (
        <div role="alert">
          <p>Local shop evidence could not load.</p>
          <button className="text-button" onClick={() => void query.refetch()}>
            Retry local quotes
          </button>
        </div>
      ) : (
        data && (
          <>
            {data.cities.length > 0 && (
              <label>
                City
                <select
                  value={city || data.city_id || ""}
                  onChange={(event) => {
                    setCity(event.target.value);
                    setOffset(0);
                  }}
                >
                  {data.cities.map((item) => (
                    <option key={item.city_id} value={item.city_id}>
                      {item.city}, {item.state}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {data.summary.range_ready ? (
              <div className="local-range" role="status">
                <strong>
                  {rupees(data.summary.low_paise)} –{" "}
                  {rupees(data.summary.high_paise)}
                </strong>
                <span>
                  Recorded shop range · {data.summary.current_shop_count}{" "}
                  current shop quotes
                </span>
              </div>
            ) : (
              <div className="local-unavailable">
                <Info size={15} />
                {data.summary.current_shop_count === 1
                  ? "One current shop quote. More shop evidence is needed for a range."
                  : "No local estimate for this variant yet."}
              </div>
            )}
            <p className="local-policy">
              Tax-inclusive, unconditional in-store item prices. A range needs
              at least two documented shops. Quotes expire at their stated
              validity or after {data.freshness_days} days. This sample does not
              represent the whole market.
            </p>
            <p className="local-policy">
              Checked {shopTime(data.read_at)}.{" "}
              <button
                className="text-button"
                disabled={query.isFetching}
                onClick={() => void query.refetch()}
              >
                Refresh local quotes
              </button>
            </p>
            {data.items.length > 0 && (
              <>
                <h4>Dated shop quotes</h4>
                <div
                  className="local-dot-chart"
                  role="img"
                  aria-label="Recorded quote prices on this page; dots show observations without interpolation"
                >
                  <small>
                    Price:{" "}
                    {rupees(Math.min(...data.items.map((q) => q.item_paise)))} –{" "}
                    {rupees(Math.max(...data.items.map((q) => q.item_paise)))}
                  </small>
                  <svg viewBox="0 0 250 95" aria-hidden="true">
                    {(() => {
                      const points = data.items;
                      const times = points.map((q) =>
                        Date.parse(q.observed_at),
                      );
                      const prices = points.map((q) => q.item_paise);
                      const minTime = Math.min(...times),
                        maxTime = Math.max(...times);
                      const low = Math.min(...prices),
                        high = Math.max(...prices);
                      return points.map((q, i) => (
                        <circle
                          key={q.id}
                          cx={
                            maxTime === minTime
                              ? 125
                              : 10 +
                                ((times[i] - minTime) / (maxTime - minTime)) *
                                  230
                          }
                          cy={
                            high === low
                              ? 45
                              : 80 - ((q.item_paise - low) / (high - low)) * 65
                          }
                          r="4"
                          className={q.current ? "current" : "past"}
                        >
                          <title>
                            {q.shop_name}: {rupees(q.item_paise)} ·{" "}
                            {shortDate(q.observed_at)}
                          </title>
                        </circle>
                      ));
                    })()}
                  </svg>
                  <div className="local-axis">
                    <small>
                      {shortDate(data.items[data.items.length - 1].observed_at)}
                    </small>
                    <small>{shortDate(data.items[0].observed_at)}</small>
                  </div>
                  <small>
                    Vertical: price · Horizontal: quote date. Green: current;
                    grey: historical. Dots show this page’s evidence.
                  </small>
                </div>
                <ol className="local-quote-list">
                  {data.items.map((quote) => (
                    <li key={quote.id}>
                      <strong>
                        {quote.shop_name} · {rupees(quote.item_paise)}
                      </strong>
                      <span>
                        {quote.area} · {titleCase(quote.condition)}
                      </span>
                      <span>
                        {quote.in_stock
                          ? "Shop reported in stock"
                          : "Shop reported out of stock"}{" "}
                        ·{" "}
                        {quote.current
                          ? "Current quote"
                          : "Historical / no longer current"}
                      </span>
                      <span>
                        Quoted {shopTime(quote.observed_at)} · Valid until{" "}
                        {shopTime(quote.valid_until)}
                      </span>
                      <small>
                        Reviewed {shopTime(quote.reviewed_at)} ·{" "}
                        {quote.source_name}
                      </small>
                    </li>
                  ))}
                </ol>
                <div className="local-paging">
                  <button
                    className="text-button"
                    disabled={offset === 0 || query.isFetching}
                    onClick={() => setOffset(Math.max(0, offset - 10))}
                  >
                    Previous quotes
                  </button>
                  <span>
                    {offset + 1}–{offset + data.items.length} of {data.total}
                  </span>
                  <button
                    className="text-button"
                    disabled={offset + 10 >= data.total || query.isFetching}
                    onClick={() => setOffset(offset + 10)}
                  >
                    Next quotes
                  </button>
                </div>
              </>
            )}
          </>
        )
      )}
    </aside>
  );
}
