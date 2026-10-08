import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight,
  Bell,
  Check,
  CircleHelp,
  Clock3,
  Info,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";
import { api } from "../api";
import type { Product } from "../api";
import { rupees, shortDate, titleCase } from "../format";
import ProductArt from "./ProductArt";
import HistoryChart from "./HistoryChart";

const labels = {
  below_usual: "Below the usual price",
  near_usual: "Close to the usual price",
  above_usual: "Above the usual price",
  insufficient_history: "More history needed",
};

export default function Comparison({
  productId,
  setTarget,
  showMethod,
}: {
  productId: string;
  setTarget: (product: Product) => void;
  showMethod: () => void;
}) {
  const [days, setDays] = useState(90);
  const detail = useQuery({
    queryKey: ["product", productId],
    queryFn: ({ signal }) => api.product(productId, signal),
  });
  const history = useQuery({
    queryKey: ["history", productId, days],
    queryFn: ({ signal }) => api.history(productId, days, signal),
  });
  const analysis = useQuery({
    queryKey: ["assessment", productId],
    queryFn: ({ signal }) => api.assessment(productId, signal),
  });
  const product = detail.data,
    assessment = analysis.data;
  const best = product?.offers
    .filter(
      (offer) => offer.in_stock && !offer.stale && offer.total_paise !== null,
    )
    .sort((a, b) => a.total_paise! - b.total_paise!)[0];
  return (
    <section
      id="comparison"
      className="comparison-section"
      aria-label="Selected product comparison"
    >
      <div className="section-divider">
        <span>Your price perspective</span>
        <span className="muted">
          <ShieldCheck size={14} />
          Exact variants, comparable offers
        </span>
      </div>
      {detail.isPending ? (
        <div className="loading-state" role="status">
          <span className="spinner" />
          Loading price evidence…
        </div>
      ) : detail.isError ? (
        <div className="error-state" role="alert">
          <h2>This comparison is unavailable.</h2>
          <p>Select another product or try again.</p>
          <button
            className="button secondary"
            onClick={() => void detail.refetch()}
          >
            Try again
          </button>
        </div>
      ) : (
        product && (
          <>
            <div className="product-overview">
              <ProductArt kind={product.illustration} />
              <div className="product-description">
                <div className="breadcrumbs">
                  {titleCase(product.category)}
                  <span>/</span>
                  {product.brand}
                </div>
                <h2>
                  {product.brand} {product.title}
                </h2>
                <p>{product.variant_label}</p>
                <div className="variant-tags">
                  <span>
                    <Check size={13} />
                    Exact variant
                  </span>
                  <span>New condition</span>
                  {product.is_demo && <span>Sample product</span>}
                </div>
                <div className="coverage-note">
                  <Clock3 size={14} />
                  {product.first_observed_at
                    ? `Recorded since ${shortDate(product.first_observed_at)}`
                    : "No recorded history yet"}
                  <span>Launch date unverified</span>
                </div>
              </div>
              <div className="best-price">
                <span>Lowest fresh delivered total</span>
                <strong>{rupees(product.best_price_paise)}</strong>
                <p>
                  {best
                    ? `${best.retailer_name} · item + known delivery`
                    : "No comparable fresh offers"}
                </p>
                <button
                  className="button primary"
                  onClick={() => setTarget(product)}
                >
                  <Bell size={16} />
                  Set my target
                </button>
              </div>
            </div>
            <div className="evidence-grid">
              <section
                className="panel history-panel"
                aria-labelledby="history-title"
              >
                <div className="panel-heading">
                  <div>
                    <h3 id="history-title">The price journey</h3>
                    <p>Every recorded change, in context.</p>
                  </div>
                  <div className="period-switch" aria-label="History period">
                    {[30, 90, 365].map((period) => (
                      <button
                        key={period}
                        className={days === period ? "selected" : ""}
                        aria-pressed={days === period}
                        onClick={() => setDays(period)}
                      >
                        {period === 365 ? "1Y" : `${period}D`}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="history-stats">
                  <div>
                    <span>
                      Recorded low · {assessment?.retailer_name ?? "—"} · 1Y
                    </span>
                    <strong>
                      {rupees(assessment?.recorded_low_paise ?? null)}
                    </strong>
                  </div>
                  <div>
                    <span>Usual reference price</span>
                    <strong>
                      {rupees(assessment?.baseline_paise ?? null)}
                    </strong>
                  </div>
                  <div>
                    <span>Latest comparable price</span>
                    <strong className="green">
                      {rupees(product.best_price_paise)}
                    </strong>
                  </div>
                </div>
                {history.isPending ? (
                  <div className="loading-state" role="status">
                    <span className="spinner" />
                    Loading recorded history…
                  </div>
                ) : history.isError ? (
                  <div className="error-state" role="alert">
                    <p>History could not be loaded.</p>
                    <button
                      className="text-button"
                      onClick={() => void history.refetch()}
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  history.data && (
                    <HistoryChart key={productId} history={history.data} />
                  )
                )}
              </section>
              <aside
                className="panel insight-panel"
                aria-labelledby="insight-title"
              >
                <div className="insight-heading">
                  <span className="insight-icon">
                    <TrendingDown size={20} />
                  </span>
                  <h3 id="insight-title">Behind the discount</h3>
                  <button
                    className="icon-button"
                    aria-label="How deal analysis works"
                    onClick={showMethod}
                  >
                    <CircleHelp size={17} />
                  </button>
                </div>
                {analysis.isPending ? (
                  <p role="status">Calculating the evidence…</p>
                ) : analysis.isError ? (
                  <div role="alert">
                    <p>The assessment couldn’t load.</p>
                    <button
                      className="text-button"
                      onClick={() => void analysis.refetch()}
                    >
                      Try again
                    </button>
                  </div>
                ) : (
                  assessment && (
                    <>
                      <span className={`verdict ${assessment.verdict}`}>
                        <span />
                        {labels[assessment.verdict]}
                      </span>
                      <h4>
                        {assessment.savings_percent === null
                          ? "Let the history build."
                          : `${Math.abs(assessment.savings_percent)}% ${assessment.savings_percent < 0 ? "above" : "below"} the usual price.`}
                      </h4>
                      <p>
                        Compared with recorded delivered totals at{" "}
                        {assessment.retailer_name ?? "a matching store"}.
                      </p>
                      <div className="discount-comparison">
                        <div>
                          <span>Discount against MRP</span>
                          <strong>
                            {assessment.advertised_discount_percent === null
                              ? "—"
                              : `${assessment.advertised_discount_percent}%`}
                          </strong>
                        </div>
                        <div>
                          <span>Savings against usual price</span>
                          <strong>
                            {assessment.savings_percent === null
                              ? "—"
                              : `${assessment.savings_percent}%`}
                          </strong>
                        </div>
                      </div>
                      {assessment.recent_rise_then_drop && (
                        <div className="rise-note">
                          <Info size={16} />
                          <span>
                            A recent price rise was followed by a drop. Inspect
                            the chart before deciding.
                          </span>
                        </div>
                      )}
                      <div className="analysis-method">
                        <span>
                          {assessment.reference_days_observed} observed days in
                          the reference window
                        </span>
                        <p>
                          {shortDate(assessment.reference_start)} –{" "}
                          {shortDate(assessment.reference_end)} · daily median ·
                          excludes latest 7 days
                        </p>
                      </div>
                      <button className="text-button" onClick={showMethod}>
                        How we calculate this <ArrowUpRight size={14} />
                      </button>
                    </>
                  )
                )}
              </aside>
            </div>
            <div className="lower-grid">
              <section
                className="panel offers-panel"
                aria-labelledby="offers-title"
              >
                <div className="panel-heading">
                  <div>
                    <h3 id="offers-title">Same product. Different prices.</h3>
                    <p>Compare item price, delivery and availability.</p>
                  </div>
                  <span className="pill">{product.offers.length} stores</span>
                </div>
                <div className="offers-table-wrap">
                  <table className="offers-table">
                    <thead>
                      <tr>
                        <th scope="col">Store</th>
                        <th scope="col">Item price</th>
                        <th scope="col">Delivery</th>
                        <th scope="col">Total</th>
                        <th scope="col">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...product.offers]
                        .sort(
                          (a, b) =>
                            (a.total_paise ?? Infinity) -
                            (b.total_paise ?? Infinity),
                        )
                        .map((offer) => (
                          <tr key={offer.id}>
                            <td>
                              <span
                                className="store-logo"
                                style={{
                                  background: `${offer.color}18`,
                                  color: offer.color,
                                }}
                              >
                                {offer.retailer_name.charAt(0)}
                              </span>
                              <span className="store-name">
                                {offer.retailer_name}
                                <small>
                                  {offer.is_demo
                                    ? "Sample offer"
                                    : offer.seller}
                                </small>
                              </span>
                            </td>
                            <td>{rupees(offer.item_paise)}</td>
                            <td>
                              {offer.shipping_paise === 0
                                ? "Free"
                                : offer.shipping_paise === null
                                  ? "Unknown"
                                  : rupees(offer.shipping_paise)}
                            </td>
                            <td
                              className={
                                best?.id === offer.id ? "lowest-total" : ""
                              }
                            >
                              {rupees(offer.total_paise)}
                              {best?.id === offer.id && (
                                <small>Lowest fresh total</small>
                              )}
                            </td>
                            <td>
                              <span
                                className={`stock-status ${!offer.in_stock || offer.stale ? "unavailable" : ""}`}
                              >
                                <span />
                                {!offer.in_stock
                                  ? "Out of stock"
                                  : offer.stale
                                    ? "Stale observation"
                                    : "Available"}
                              </span>
                              {offer.observed_at && (
                                <small className="observed-date">
                                  {shortDate(offer.observed_at)}
                                </small>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {product.offers.length === 0 && (
                  <p className="empty-offers">
                    No approved offers for this variant yet.
                  </p>
                )}
                <div className="table-footnote">
                  <Info size={14} />
                  {product.is_demo
                    ? "All prices above are synthetic. They cannot be used to make a purchase."
                    : "Prices apply to the stated context. Check the retailer before purchasing."}
                </div>
              </section>
              <aside className="local-card">
                <span className="eyebrow">Beyond the screen</span>
                <h3>
                  Your local market,
                  <br />
                  with real context.
                </h3>
                <p>
                  Offline ranges will use dated shop quotes and verified
                  evidence from your area.
                </p>
                <div className="local-unavailable">
                  <Info size={15} />
                  No local estimate for this variant yet.
                </div>
                <button className="text-button" onClick={showMethod}>
                  Why evidence matters <ArrowUpRight size={14} />
                </button>
                <div className="local-illustration" aria-hidden="true">
                  <div className="shop-roof" />
                  <div className="shop-front">
                    <span />
                    <span />
                    <span />
                  </div>
                  <div className="shop-base" />
                </div>
              </aside>
            </div>
          </>
        )
      )}
    </section>
  );
}
