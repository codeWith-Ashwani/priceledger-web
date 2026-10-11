import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  RefreshCw,
  ShieldCheck,
  Star,
  TrendingDown,
} from "lucide-react";
import type { ComparisonScan, ProductDetail } from "../api";
import { rupees } from "../format";
import { amount, comparisonOffers, rankOffers, type PriceBasis } from "../offers";
import ProductImage from "./ProductImage";
import "./OfferCards.css";

const checked = (value: string) =>
  new Date(value).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

const attributeNames: Record<string, string> = {
  color: "Colour",
  ram_gb: "RAM (GB)",
  storage_gb: "Storage (GB)",
  size: "Size",
  pack: "Pack",
  mpn: "Part number",
};

export default function OfferCards({
  product,
  scan,
  pending,
  error,
  refresh,
}: {
  product: ProductDetail;
  scan?: ComparisonScan;
  pending: boolean;
  error?: string;
  refresh: () => void;
}) {
  const [basis, setBasis] = useState<PriceBasis>("item");
  const [scope, setScope] = useState<"model" | "exact">("model");
  const ranked = rankOffers(
    comparisonOffers(product.offers, scan?.model_offers, scope === "model"),
    basis,
  );
  const names = [
    ...new Set(
      ranked.sorted
        .filter((offer) => ranked.winners.has(offer.id))
        .map((offer) => offer.retailer_name),
    ),
  ];
  return (
    <section
      className="panel offer-comparison cross-store-panel"
      aria-labelledby="offer-cards-title"
    >
      <div className="panel-heading">
        <div>
          <span className="eyebrow">SAME BRAND · SAME MODEL</span>
          <h3 id="offer-cards-title">Find your best price.</h3>
          <p>
            Compare this model across stores. Colour, memory and size may differ.
          </p>
        </div>
        <button className="text-button" disabled={pending} onClick={refresh}>
          <RefreshCw size={14} /> Check stores again
        </button>
      </div>
      <div className="offer-controls">
        <div className="price-basis" role="group" aria-label="Match scope">
          <button
            aria-pressed={scope === "model"}
            onClick={() => setScope("model")}
          >
            Same model
          </button>
          <button
            aria-pressed={scope === "exact"}
            onClick={() => setScope("exact")}
          >
            Exact variant
          </button>
        </div>
        <span>
          {ranked.storeCount} {ranked.storeCount === 1 ? "store" : "stores"}{" "}
          matched
        </span>
        <div
          className="price-basis"
          role="group"
          aria-label="Compare price basis"
        >
          <button
            aria-pressed={basis === "item"}
            onClick={() => setBasis("item")}
          >
            Item price
          </button>
          <button
            aria-pressed={basis === "delivered"}
            onClick={() => setBasis("delivered")}
          >
            With delivery
          </button>
        </div>
      </div>
      <div className="offer-recommendation" role="status">
        <TrendingDown size={22} />
        <div>
          <strong>
            {ranked.lowest === null
              ? "No comparable available price yet"
              : `${names.join(" & ")} · ${rupees(ranked.lowest)}`}
          </strong>
          <p>
            {scope === "model" ? "Among checked model variants. " : "Among exact variants. "}
            {ranked.lowest === null
              ? "Unavailable, outdated or incomplete offers cannot win the comparison."
              : ranked.comparableStores === 1
                ? `Only one store has a confirmed available ${basis === "item" ? "item price" : "delivered total"}.`
                : `${ranked.winners.size > 1 ? "Joint lowest" : "Lowest"} ${basis === "item" ? "item price" : "known delivered total"} among ${ranked.comparableStores} currently available stores.`}
            {basis === "item" && ranked.lowest !== null
              ? " Delivery is shown separately."
              : basis === "delivered" &&
                  ranked.availableStores > ranked.comparableStores
                ? " Stores with unknown delivery are excluded from this total comparison."
                : ""}
          </p>
        </div>
        {pending && (
          <span className="scanning-pill">
            <span className="spinner" /> Checking more stores
          </span>
        )}
      </div>
      <div className="offer-card-grid">
        {ranked.sorted.map((offer) => {
          const winner = ranked.winners.has(offer.id);
          const price = amount(offer, basis);
          return (
            <article
              className={`offer-card ${winner ? "offer-card-lowest" : ""}`}
              key={offer.id}
              aria-label={`${offer.retailer_name} offer`}
            >
              <div className="offer-card-heading">
                <span
                  className="store-logo"
                  style={{ background: `${offer.color}18`, color: offer.color }}
                >
                  {offer.retailer_name.charAt(0)}
                </span>
                <strong>{offer.retailer_name}</strong>
                {winner && (
                  <span className="offer-lowest-badge">
                    <Check size={12} />
                    {ranked.comparableStores === 1
                      ? "Only confirmed price"
                      : `Lowest ${basis === "item" ? "item price" : "known total"}`}
                  </span>
                )}
              </div>
              <ProductImage
                key={offer.image_url ?? product.image_url ?? offer.id}
                url={
                  offer.image_url === undefined
                    ? product.image_url
                    : offer.image_url
                }
                title={offer.title ?? product.title}
              />
              <h4>{offer.title ?? product.title}</h4>
              <div className="offer-rating">
                {offer.rating ? (
                  <>
                    <Star size={14} fill="currentColor" />
                    <strong>
                      {offer.rating.value}/{offer.rating.best}
                    </strong>
                    <span>
                      {offer.rating.count !== null
                        ? `${offer.rating.count.toLocaleString("en-IN")} feedback entries`
                        : "Store product rating"}
                    </span>
                  </>
                ) : (
                  <span>Rating not provided by this store</span>
                )}
              </div>
              <div className="offer-price">
                <strong>
                  {price === null ? "Price not confirmed" : rupees(price)}
                </strong>
                <span>
                  {basis === "item" ? "Item price" : "Item + delivery"}
                </span>
              </div>
              <dl className="offer-price-details">
                <div>
                  <dt>{basis === "item" ? "Delivery" : "Item price"}</dt>
                  <dd>
                    {basis === "item"
                      ? offer.shipping_paise === null
                        ? "Not confirmed"
                        : offer.shipping_paise === 0
                          ? "Free"
                          : rupees(offer.shipping_paise)
                      : rupees(offer.item_paise)}
                  </dd>
                </div>
                <div>
                  <dt>Availability</dt>
                  <dd
                    className={
                      offer.in_stock && !offer.stale ? "offer-available" : ""
                    }
                  >
                    {offer.stale
                      ? "Needs a fresh check"
                      : offer.availability === "out_of_stock"
                        ? "Out of stock"
                        : offer.in_stock
                          ? "In stock"
                          : "Not confirmed"}
                  </dd>
                </div>
              </dl>
              <p className="offer-identity">
                <ShieldCheck size={13} />{" "}
                {offer.match_scope === "model" ? "Same model · check variant" : "Exact variant"}
                {" · "}
                {offer.condition === "unknown" ? "Condition not confirmed" : offer.condition}
              </p>
              {offer.match_scope === "model" && (
                <p className="offer-seller">
                  {offer.differences?.length
                    ? offer.differences
                        .map((difference) =>
                          `${attributeNames[difference.attribute] ?? difference.attribute}: ${difference.offered} (requested ${difference.requested})`,
                        )
                        .join(" · ")
                    : "Some variant details are not confirmed."}
                  {" "}
                  <a href={`/?product=${encodeURIComponent(offer.product_id ?? product.id)}`}>
                    This variant’s history
                  </a>
                </p>
              )}
              <p className="offer-seller">
                {offer.seller} · {offer.region}
              </p>
              <div className="offer-card-footer">
                <small>
                  {offer.observed_at
                    ? `Checked ${checked(offer.observed_at)} IST`
                    : "Check time unavailable"}
                </small>
                {offer.product_url && (
                  <a
                    href={offer.product_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Visit store <ArrowUpRight size={13} />
                  </a>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {error && (
        <p className="cross-store-status" role="alert">
          {error} Your recorded offers are still shown.
        </p>
      )}
      {pending && !ranked.sorted.length && (
        <p role="status">Finding verified offers…</p>
      )}
      {scan && (
        <details className="store-check-details" open={ranked.storeCount < 2}>
          <summary>
            Store checks · {scan.stores.length} other retailers checked
          </summary>
          <p className="cross-store-footnote">
            A missing card does not mean the store has no stock. These checks
            explain unreadable pages, retry limits and listings awaiting
            verification.
          </p>
          {scan.stores.map((store) => (
            <div className="cross-store-result" key={store.retailer}>
              <div className="cross-store-heading">
                <strong>{store.retailer_name}</strong>
                <span className={`match-status ${store.status}`}>
                  {store.status === "verified"
                    ? "Verified match"
                    : store.status === "model_match"
                      ? "Same model · variants may differ"
                    : store.status === "different_variant"
                      ? "Different variant"
                      : store.status === "review"
                        ? "Variant needs verification"
                        : store.status === "retailer_blocked"
                          ? "Store blocked access"
                          : store.status === "collection_limited"
                            ? "Retry cooldown active"
                            : store.status === "no_matches"
                              ? "No readable candidates"
                              : "No verified offer"}
                </span>
              </div>
              <p>{store.message}</p>
              {store.items
                .filter((item) => !["verified", "model_match"].includes(item.match_status))
                .map((item) => (
                  <article className="possible-match" key={`${item.product_id}:${item.url}`}>
                    <div>
                      <strong>{item.title}</strong>
                      <p>
                        {item.reason} Excluded from the exact-variant
                        comparison.
                      </p>
                      <a
                        className="candidate-history"
                        href={`/?product=${encodeURIComponent(item.product_id)}`}
                      >
                        View this listing’s recorded history
                      </a>
                    </div>
                    <strong>{rupees(item.item_paise)}</strong>
                  </article>
                ))}
            </div>
          ))}
        </details>
      )}
      <p className="cross-store-footnote">
        Prices and ratings come from the named store’s last readable check.
        Model matches can differ in colour, memory or size. Check the winning variant before buying.
        Price history and discount analysis below cover the exact variant only.
        Checkout or protection fees may be extra; confirm the final total at the store.
        Missing stores are never filled with guessed prices.
      </p>
    </section>
  );
}
