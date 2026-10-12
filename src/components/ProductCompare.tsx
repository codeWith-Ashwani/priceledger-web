import { useEffect, useState, type ReactNode } from "react";
import type { Offer, Product } from "../api";
import { rupees } from "../format";
import { amount, rankOffers, type PriceBasis } from "../offers";
import { reportTime } from "../reports";
import {
  comparisonFacts,
  comparisonLimit,
  factValue,
  identicalKnownFact,
  loadProductComparison,
  type ProductComparison,
} from "../productComparison";
import ProductImage from "./ProductImage";
import "./ProductCompare.css";

function Lowest({ offers, basis }: { offers: Offer[]; basis: PriceBasis }) {
  const ranked = rankOffers(offers, basis);
  if (ranked.lowest === null)
    return (
      <p className="muted">
        No fresh available {basis === "item" ? "item price" : "subtotal"}
      </p>
    );
  return (
    <div className="product-compare-price">
      <strong>{rupees(ranked.lowest)}</strong>
      {ranked.sorted
        .filter((offer) => ranked.winners.has(offer.id))
        .map((offer) => (
          <div key={offer.id}>
            <b>{offer.retailer_name}</b>
            <span>{offer.source_name}</span>
            <span>Checked {reportTime(offer.observed_at)}</span>
            <span>
              Condition: {offer.condition} · Seller: {offer.seller}
            </span>
          </div>
        ))}
    </div>
  );
}

function RecordedOffers({ offers }: { offers: Offer[] }) {
  if (!offers.length) return <p>No permitted offers recorded.</p>;
  return (
    <details className="product-compare-offers">
      <summary>
        {offers.length} recorded {offers.length === 1 ? "offer" : "offers"}
      </summary>
      <ul>
        {offers.map((offer) => (
          <li key={offer.id}>
            <strong>{offer.retailer_name}</strong>
            <span>{offer.title}</span>
            <span>
              Item {rupees(offer.item_paise)} · Shipping{" "}
              {rupees(offer.shipping_paise)}
            </span>
            <span>Known subtotal {rupees(amount(offer, "delivered"))}</span>
            {(offer.listed_fees ?? []).map((fee) => (
              <span key={fee.label}>
                {fee.label}: {rupees(fee.amount_paise)}
              </span>
            ))}
            <span>
              {offer.channel} ·{" "}
              {offer.in_stock
                ? "Recorded in stock"
                : "Stock not confirmed available"}
              {offer.stale ? " · Stale quote" : ""}
            </span>
            <span>
              Source: {offer.source_name} · {reportTime(offer.observed_at)}
            </span>
            <span>
              Condition: {offer.condition} · Seller: {offer.seller} ·{" "}
              {offer.region}
            </span>
            <span>
              {offer.rating
                ? `Product rating ${offer.rating.value}/${offer.rating.best}${offer.rating.count === null ? "" : ` (${offer.rating.count} ratings)`}`
                : "Product rating not recorded"}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

export default function ProductCompare({
  selections,
  remove,
  clear,
  view,
}: {
  selections: Product[];
  remove: (id: string) => void;
  clear: () => void;
  view: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [hideIdentical, setHideIdentical] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    data: ProductComparison;
  } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const selectionKey = JSON.stringify(selections.map((product) => product.id));
  useEffect(() => {
    setResult(null);
    setError("");
    setBusy(false);
    if (!open || selections.length < 2) return;
    const controller = new AbortController();
    let timedOut = false;
    let active = true;
    setBusy(true);
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 20000);
    void loadProductComparison(
      JSON.parse(selectionKey) as string[],
      controller.signal,
    )
      .then((data) => {
        if (active && !controller.signal.aborted)
          setResult({ key: selectionKey, data });
      })
      .catch((failure: Error) => {
        if (active && (!controller.signal.aborted || timedOut))
          setError(
            timedOut
              ? "The comparison timed out. Try loading the recorded prices again."
              : failure.message,
          );
      })
      .finally(() => {
        clearTimeout(timer);
        if (active && (!controller.signal.aborted || timedOut)) setBusy(false);
      });
    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, selectionKey, selections.length, refresh]);
  const data =
    result?.key === selectionKey && open && selections.length >= 2
      ? result.data
      : null;
  function row(
    label: string,
    cell: (product: ProductComparison["products"][number]) => ReactNode,
  ) {
    return (
      <tr key={label}>
        <th scope="row">{label}</th>
        {data?.products.map((product) => (
          <td key={product.id}>{cell(product)}</td>
        ))}
      </tr>
    );
  }
  return (
    <section
      id="product-compare"
      className="panel product-compare"
      aria-label="Compare selected products"
    >
      <div className="product-compare-heading">
        <div>
          <span className="eyebrow">YOUR COMPARISON LIST</span>
          <h2>Compare products side by side</h2>
          <p>
            {selections.length}/{comparisonLimit} selected · Kept for this
            visit. Reloading clears this list.
          </p>
        </div>
        <button className="button secondary" onClick={clear}>
          Clear comparison list
        </button>
      </div>
      <ul className="product-compare-selection">
        {selections.map((product) => (
          <li key={product.id}>
            <span>{product.title}</span>
            <button
              aria-label={`Remove ${product.title} from comparison`}
              onClick={() => remove(product.id)}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
      <p>
        Find another product above, then add it from its price overview. Each
        selection keeps its own exact-variant offers and history.
      </p>
      <div className="product-compare-actions">
        <button
          className="button primary"
          disabled={selections.length < 2}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "Hide side-by-side comparison" : "Compare selected products"}
        </button>
        {open && selections.length >= 2 && (
          <button
            className="button secondary"
            disabled={busy}
            onClick={() => setRefresh((value) => value + 1)}
          >
            Reload recorded prices
          </button>
        )}
      </div>
      {selections.length < 2 && (
        <p role="status">Add at least two products to compare.</p>
      )}
      {open && selections.length >= 2 && (
        <>
          <p>
            Lowest prices below are calculated separately for each product from
            fresh available online offers. A known subtotal includes item, known
            shipping and listed extras; checkout charges may differ. Conditional
            promotions are excluded.
          </p>
          {busy && <p role="status">Loading recorded product comparisons…</p>}
          {error && <p role="alert">{error}</p>}
          {data && (
            <>
              <p className="muted">
                Read {reportTime(data.checked_at)}. This reads recorded
                evidence; use each product’s store check to collect a new quote.
              </p>
              <button
                className="text-button"
                aria-pressed={hideIdentical}
                onClick={() => setHideIdentical((value) => !value)}
              >
                Hide identical known details
              </button>
              <p className="muted">
                Scroll across the table on smaller screens. Only recorded
                variant details are shown. Technical specifications are not
                verified.
              </p>
              <div
                className="product-compare-scroll"
                role="region"
                aria-label="Side-by-side product table"
                tabIndex={0}
              >
                <table
                  style={{ minWidth: `${10 + 15 * data.products.length}rem` }}
                >
                  <caption>
                    Independent product prices and recorded variant details
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Product</th>
                      {data.products.map((product) => (
                        <th scope="col" key={product.id}>
                          <ProductImage
                            url={product.image_url}
                            title={product.title}
                          />
                          <span>{product.title}</span>
                          <button
                            className="text-button"
                            onClick={() => view(product.id)}
                            aria-label={`View offers and history for ${product.title}`}
                          >
                            View offers and history
                          </button>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {row("Lowest available item", (product) => (
                      <Lowest offers={product.offers} basis="item" />
                    ))}
                    {row("Lowest known subtotal", (product) => (
                      <Lowest offers={product.offers} basis="delivered" />
                    ))}
                    {comparisonFacts
                      .filter(
                        ([key]) =>
                          !hideIdentical ||
                          !identicalKnownFact(data.products, key),
                      )
                      .map(([key, label]) =>
                        row(
                          label,
                          (product) =>
                            factValue(product, key) ?? "Not recorded",
                        ),
                      )}
                    {row("Store evidence", (product) => (
                      <RecordedOffers offers={product.offers} />
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
