import { useEffect, useRef, useState } from "react";
import { adminRequest, type ImportOffer } from "../adminApi";
import { api, type ProductDetail } from "../api";
import { rupees, titleCase } from "../format";
import {
  shopPaise,
  shopTime,
  type DocumentedShop,
  type OwnerQuote,
  type OwnerQuoteDetail,
  type Page,
} from "../offline";
import "./OfflineQuotes.css";

export default function OfflineQuoteAdmin({ token }: { token: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      className="panel import-panel offline-owner"
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>Record and review local shop quotes</summary>
      {open && <Workspace token={token} />}
    </details>
  );
}

function Workspace({ token }: { token: string }) {
  const alive = useRef(true);
  const requests = useRef(new Set<AbortController>());
  const identities = useRef<Record<string, { signature: string; id: string }>>(
    {},
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [shopPage, setShopPage] = useState(0);
  const [quotePage, setQuotePage] = useState(0);
  const [status, setStatus] = useState("all");
  const [shops, setShops] = useState<Page<DocumentedShop> | null>(null);
  const [quotes, setQuotes] = useState<Page<OwnerQuote> | null>(null);
  const [selected, setSelected] = useState<OwnerQuoteDetail | null>(null);
  const [auditOffset, setAuditOffset] = useState(0);
  const [note, setNote] = useState("");
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<ImportOffer[]>([]);
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [shopId, setShopId] = useState("");
  const [shop, setShop] = useState({
    name: "",
    city: "",
    state: "",
    area: "",
    approval_reference: "",
    rights_confirmed: false,
  });
  const [quote, setQuote] = useState({
    price: "",
    condition: "",
    stock: "",
    observed: "",
    valid: "",
    reference: "",
    confirmed: false,
  });

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      requests.current.forEach((controller) => controller.abort());
    };
  }, [token]);

  async function managed<T>(
    work: (signal: AbortSignal) => Promise<T>,
    supplied?: AbortController,
  ): Promise<T> {
    const controller = supplied ?? new AbortController();
    requests.current.add(controller);
    const timer = setTimeout(() => controller.abort(), 20_000);
    try {
      return await work(controller.signal);
    } catch (failure) {
      if (controller.signal.aborted)
        throw new Error(
          "The owner request did not complete. Retry the same action to confirm its outcome.",
        );
      throw failure;
    } finally {
      clearTimeout(timer);
      requests.current.delete(controller);
    }
  }
  function request<T>(
    path: string,
    body?: unknown,
    controller?: AbortController,
  ) {
    return managed(
      (signal) => adminRequest<T>(token, `/offline${path}`, body, signal),
      controller,
    );
  }
  function payload(key: string, values: Record<string, unknown>) {
    const signature = JSON.stringify(values);
    if (identities.current[key]?.signature !== signature)
      identities.current[key] = { signature, id: crypto.randomUUID() };
    return { ...values, request_id: identities.current[key].id };
  }
  async function run(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await work();
    } catch (failure) {
      if (alive.current) setError((failure as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  useEffect(() => {
    let current = true;
    const controller = new AbortController();
    void Promise.all([
      request<Page<DocumentedShop>>(
        `/shops?limit=25&offset=${shopPage * 25}`,
        undefined,
        controller,
      ),
      request<Page<OwnerQuote>>(
        `/quotes?status=${status}&limit=25&offset=${quotePage * 25}`,
        undefined,
        controller,
      ),
    ])
      .then(([nextShops, nextQuotes]) => {
        if (!current || !alive.current) return;
        if (!Array.isArray(nextShops.items) || !Array.isArray(nextQuotes.items))
          throw new Error("The shop workspace response was incomplete.");
        setShops(nextShops);
        setQuotes(nextQuotes);
      })
      .catch((failure) => {
        if (current && alive.current) setError((failure as Error).message);
      });
    return () => {
      current = false;
      controller.abort();
    };
  }, [token, shopPage, quotePage, status, refresh]);

  async function loadDetail(id: string, offset = 0) {
    const detail = await request<OwnerQuoteDetail>(
      `/quotes/${encodeURIComponent(id)}?limit=10&offset=${offset}`,
    );
    if (!alive.current) return;
    if (detail.quote?.id !== id || detail.events.offset !== offset)
      throw new Error("The quote review response belongs to another record.");
    setSelected(detail);
    setAuditOffset(offset);
  }
  const selectedShop = shops?.items.find((item) => item.id === shopId);
  return (
    <section aria-label="Offline quote workspace">
      <p>
        Register a documented Indian shop, record its exact-variant quote, then
        review it before publication. Evidence and review notes stay private. No
        estimate appears without actual shop evidence.
      </p>
      {error && (
        <p className="import-error" role="alert">
          {error}
        </p>
      )}
      {message && (
        <p className="import-success" role="status">
          {message}
        </p>
      )}
      <button
        className="text-button"
        disabled={busy}
        onClick={() => {
          setError("");
          setRefresh((value) => value + 1);
        }}
      >
        Reload shop workspace
      </button>
      <div className="offline-grid">
        <div>
          <details>
            <summary>Register a documented shop</summary>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void run(async () => {
                  const body = payload("shop", shop);
                  const result = await request<{ id: string }>("/shops", body);
                  if (!alive.current) return;
                  if (result.id !== body.request_id)
                    throw new Error(
                      "The shop receipt was not confirmed. Retry the same submission.",
                    );
                  setShopId(result.id);
                  setShopPage(0);
                  setRefresh((value) => value + 1);
                  setMessage(
                    "Documented shop registered. Select it when recording a quote.",
                  );
                });
              }}
            >
              <fieldset disabled={busy}>
                {(
                  [
                    ["name", "Shop name"],
                    ["city", "City"],
                    ["state", "State / union territory"],
                    ["area", "Public shop area or address"],
                    ["approval_reference", "Private permission reference"],
                  ] as const
                ).map(([key, label]) => (
                  <label className="import-field" key={key}>
                    {label}
                    <input
                      value={shop[key]}
                      required
                      minLength={key === "approval_reference" ? 5 : 2}
                      maxLength={
                        key === "approval_reference"
                          ? 1000
                          : key === "area"
                            ? 200
                            : key === "name"
                              ? 120
                              : 100
                      }
                      onChange={(event) =>
                        setShop({ ...shop, [key]: event.target.value })
                      }
                    />
                  </label>
                ))}
                <label className="offline-check">
                  <input
                    type="checkbox"
                    required
                    checked={shop.rights_confirmed}
                    onChange={(event) =>
                      setShop({
                        ...shop,
                        rights_confirmed: event.target.checked,
                      })
                    }
                  />
                  I confirmed permission to retain and display this shop’s quote
                  evidence.
                </label>
                <button
                  className="button secondary"
                  disabled={!shop.rights_confirmed}
                >
                  Register shop
                </button>
              </fieldset>
            </form>
          </details>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void run(async () => {
                if (!product || !selectedShop?.source_active)
                  throw new Error(
                    "Choose an approved shop and tracked exact product.",
                  );
                const item = shopPaise(quote.price);
                if (item === null)
                  throw new Error(
                    "Enter a valid INR price with at most two decimal places.",
                  );
                const body = payload("quote", {
                  product_id: product.id,
                  shop_id: shopId,
                  variant_attributes: product.attributes,
                  item_paise: item,
                  condition: quote.condition,
                  in_stock: quote.stock === "in_stock",
                  observed_at: new Date(quote.observed).toISOString(),
                  valid_until: new Date(quote.valid).toISOString(),
                  evidence_reference: quote.reference,
                  exact_variant_confirmed: quote.confirmed,
                  includes_tax: quote.confirmed,
                  unconditional_price: quote.confirmed,
                });
                const result = await request<{ quote: OwnerQuote }>(
                  "/quotes",
                  body,
                );
                if (!alive.current) return;
                if (
                  result.quote?.id !== body.request_id ||
                  result.quote.product_id !== product.id
                )
                  throw new Error(
                    "The draft receipt was not confirmed. Retry the same submission.",
                  );
                setMessage(
                  "Draft recorded privately. Review its evidence before publishing.",
                );
                setQuotePage(0);
                setStatus("all");
                setRefresh((value) => value + 1);
                await loadDetail(result.quote.id);
              });
            }}
          >
            <h3>Record a shop quote</h3>
            <fieldset disabled={busy}>
              <label className="import-field">
                Documented shop
                <select
                  required
                  value={shopId}
                  onChange={(event) => setShopId(event.target.value)}
                >
                  <option value="">Choose a shop</option>
                  {shops?.items.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                      disabled={!item.source_active}
                    >
                      {item.name} · {item.city}
                      {item.source_active ? "" : " · permission inactive"}
                    </option>
                  ))}
                </select>
              </label>
              <div className="local-paging">
                <button
                  type="button"
                  className="text-button"
                  disabled={!shopPage}
                  onClick={() => {
                    setShopPage((value) => value - 1);
                    setShopId("");
                  }}
                >
                  Previous shops
                </button>
                <span>{shops?.total ?? 0} documented shops</span>
                <button
                  type="button"
                  className="text-button"
                  disabled={!shops || (shopPage + 1) * 25 >= shops.total}
                  onClick={() => {
                    setShopPage((value) => value + 1);
                    setShopId("");
                  }}
                >
                  Next shops
                </button>
              </div>
              <label className="import-field">
                Find a tracked product
                <input
                  value={query}
                  maxLength={128}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              <button
                type="button"
                className="text-button"
                onClick={() =>
                  void run(async () => {
                    const result = await managed((signal) =>
                      adminRequest<ImportOffer[]>(
                        token,
                        `/offers?q=${encodeURIComponent(query)}`,
                        undefined,
                        signal,
                      ),
                    );
                    if (alive.current) {
                      setProducts([
                        ...new Map(
                          result.map((item) => [item.product_id, item]),
                        ).values(),
                      ]);
                      setProduct(null);
                    }
                  })
                }
              >
                Find tracked products
              </button>
              <label className="import-field">
                Exact tracked product
                <select
                  required
                  value={product?.id ?? ""}
                  onChange={(event) => {
                    const id = event.target.value;
                    setProduct(null);
                    if (id)
                      void run(async () => {
                        const result = await managed((signal) =>
                          api.product(id, signal),
                        );
                        if (alive.current && result.id === id)
                          setProduct(result);
                      });
                  }}
                >
                  <option value="">Choose the exact variant</option>
                  {products.map((item) => (
                    <option key={item.product_id} value={item.product_id}>
                      {item.title} · {JSON.stringify(item.variant_attributes)}
                    </option>
                  ))}
                </select>
              </label>
              {product && (
                <p className="offline-details">
                  Verify: {product.title} ·{" "}
                  {Object.entries(product.attributes)
                    .map(
                      ([key, value]) => `${titleCase(key)}: ${String(value)}`,
                    )
                    .join(" · ")}
                </p>
              )}
              <label className="import-field">
                In-store item price (INR)
                <input
                  type="text"
                  inputMode="decimal"
                  value={quote.price}
                  required
                  onChange={(event) =>
                    setQuote({ ...quote, price: event.target.value })
                  }
                />
              </label>
              <label className="import-field">
                Quoted condition
                <select
                  required
                  value={quote.condition}
                  onChange={(event) =>
                    setQuote({ ...quote, condition: event.target.value })
                  }
                >
                  <option value="">Choose condition</option>
                  <option value="new">New</option>
                  <option value="used">Used</option>
                  <option value="refurbished">Refurbished</option>
                </select>
              </label>
              <label className="import-field">
                Shop-reported availability
                <select
                  required
                  value={quote.stock}
                  onChange={(event) =>
                    setQuote({ ...quote, stock: event.target.value })
                  }
                >
                  <option value="">Choose availability</option>
                  <option value="in_stock">In stock</option>
                  <option value="out_of_stock">Out of stock</option>
                </select>
              </label>
              <label className="import-field">
                Quoted at (your local time)
                <input
                  type="datetime-local"
                  required
                  value={quote.observed}
                  onChange={(event) =>
                    setQuote({ ...quote, observed: event.target.value })
                  }
                />
              </label>
              <label className="import-field">
                Valid until (your local time)
                <input
                  type="datetime-local"
                  required
                  value={quote.valid}
                  onChange={(event) =>
                    setQuote({ ...quote, valid: event.target.value })
                  }
                />
              </label>
              <label className="import-field">
                Private quote evidence reference
                <input
                  required
                  minLength={5}
                  maxLength={1000}
                  value={quote.reference}
                  onChange={(event) =>
                    setQuote({ ...quote, reference: event.target.value })
                  }
                />
              </label>
              <label className="offline-check">
                <input
                  type="checkbox"
                  required
                  checked={quote.confirmed}
                  onChange={(event) =>
                    setQuote({ ...quote, confirmed: event.target.checked })
                  }
                />
                I verified this exact variant and an unconditional,
                tax-inclusive shop price against the evidence.
              </label>
              <button
                className="button primary"
                disabled={
                  !product || !selectedShop?.source_active || !quote.confirmed
                }
              >
                Record private draft
              </button>
            </fieldset>
          </form>
        </div>
        <div>
          <h3>Review shop quotes</h3>
          <label className="import-field">
            Quote status
            <select
              disabled={busy}
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setQuotePage(0);
              }}
            >
              {["all", "draft", "published", "withdrawn"].map((value) => (
                <option key={value} value={value}>
                  {titleCase(value)}
                </option>
              ))}
            </select>
          </label>
          {!quotes ? (
            <p>Loading quotes…</p>
          ) : !quotes.items.length ? (
            <p>No shop quotes in this view.</p>
          ) : (
            <ul className="offline-records">
              {quotes.items.map((item) => (
                <li key={item.id}>
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => {
                      setNote("");
                      void run(() => loadDetail(item.id));
                    }}
                  >
                    {item.product_snapshot.title} · {item.shop_name} ·{" "}
                    {rupees(item.item_paise)} · {item.status}
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="local-paging">
            <button
              className="text-button"
              disabled={busy || !quotePage}
              onClick={() => setQuotePage((value) => value - 1)}
            >
              Previous records
            </button>
            <span>{quotes?.total ?? 0} quote records</span>
            <button
              className="text-button"
              disabled={busy || !quotes || (quotePage + 1) * 25 >= quotes.total}
              onClick={() => setQuotePage((value) => value + 1)}
            >
              Next records
            </button>
          </div>
          {selected && (
            <section className="offline-details" aria-label="Shop quote review">
              <h4>{selected.quote.product_snapshot.title}</h4>
              <p>
                {selected.quote.shop_name} · {selected.quote.area} ·{" "}
                {selected.quote.city}, {selected.quote.state}
              </p>
              <button
                className="text-button"
                disabled={busy}
                onClick={() => void run(() => loadDetail(selected.quote.id))}
              >
                Reload selected quote
              </button>
              <dl>
                {Object.entries({
                  Price: rupees(selected.quote.item_paise),
                  Condition: selected.quote.condition,
                  Availability: selected.quote.in_stock
                    ? "In stock"
                    : "Out of stock",
                  Quoted: shopTime(selected.quote.observed_at),
                  Validity: shopTime(selected.quote.valid_until),
                  "Private evidence": selected.quote.evidence_reference,
                  "Exact variant": JSON.stringify(
                    selected.quote.product_snapshot.attributes,
                  ),
                  Status: `${selected.quote.status} · revision ${selected.quote.revision}`,
                }).map(([label, value]) => (
                  <div key={label} style={{ display: "contents" }}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <label className="import-field">
                Private review note
                <textarea
                  disabled={busy}
                  minLength={5}
                  maxLength={1000}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                />
              </label>
              <div className="local-paging">
                {(["publish", "withdraw"] as const).map((action) => (
                  <button
                    className="button secondary"
                    key={action}
                    disabled={
                      busy ||
                      note.trim().length < 5 ||
                      selected.quote.status === "withdrawn" ||
                      (action === "publish" &&
                        selected.quote.status !== "draft")
                    }
                    onClick={() =>
                      void run(async () => {
                        const current = selected.quote;
                        const body = payload(`review:${current.id}`, {
                          expected_revision: current.revision,
                          action,
                          note,
                        });
                        const result = await request<{
                          id: string;
                          revision: number;
                          status: string;
                        }>(
                          `/quotes/${encodeURIComponent(current.id)}/review`,
                          body,
                        );
                        if (!alive.current) return;
                        if (
                          result.id !== current.id ||
                          result.revision !== current.revision + 1 ||
                          result.status !==
                            (action === "publish" ? "published" : "withdrawn")
                        )
                          throw new Error(
                            "The review receipt was not confirmed. Retry the same action.",
                          );
                        setMessage(
                          action === "publish"
                            ? "Quote publication confirmed."
                            : "Quote withdrawal confirmed.",
                        );
                        setRefresh((value) => value + 1);
                        await loadDetail(current.id);
                      })
                    }
                  >
                    {action === "publish"
                      ? "Publish reviewed quote"
                      : "Withdraw quote"}
                  </button>
                ))}
              </div>
              <h4>Review audit</h4>
              <ol className="offline-records">
                {selected.events.items.map((event) => (
                  <li key={event.revision}>
                    Revision {event.revision} · {event.status} ·{" "}
                    {shopTime(event.at)}
                    <p>{event.note}</p>
                  </li>
                ))}
              </ol>
              <div className="local-paging">
                <button
                  className="text-button"
                  disabled={busy || !auditOffset}
                  onClick={() =>
                    void run(() =>
                      loadDetail(
                        selected.quote.id,
                        Math.max(0, auditOffset - 10),
                      ),
                    )
                  }
                >
                  Previous audit
                </button>
                <button
                  className="text-button"
                  disabled={busy || auditOffset + 10 >= selected.events.total}
                  onClick={() =>
                    void run(() =>
                      loadDetail(selected.quote.id, auditOffset + 10),
                    )
                  }
                >
                  Next audit
                </button>
              </div>
            </section>
          )}
        </div>
      </div>
    </section>
  );
}
