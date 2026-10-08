import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  Check,
  Info,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { api } from "./api";
import type { Product } from "./api";
import { rupees, titleCase } from "./format";
import { readWatches, saveWatches } from "./watchlist";
import ProductArt from "./components/ProductArt";
import Comparison from "./components/Comparison";
import MethodDialog from "./components/MethodDialog";
import WatchDialog from "./components/WatchDialog";

export default function App() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [category, setCategory] = useState("");
  const [offset, setOffset] = useState(0);
  const [selectedId, setSelectedId] = useState(
    () => new URLSearchParams(location.search).get("product") ?? "",
  );
  const [view, setView] = useState<"explore" | "watchlist">("explore");
  const [watches, setWatches] = useState(readWatches);
  const [watchProduct, setWatchProduct] = useState<Product | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(search);
      setOffset(0);
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);
  useEffect(() => {
    const listener = () =>
      setSelectedId(new URLSearchParams(location.search).get("product") ?? "");
    window.addEventListener("popstate", listener);
    return () => window.removeEventListener("popstate", listener);
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const health = useQuery({
    queryKey: ["health"],
    queryFn: ({ signal }) => api.health(signal),
  });
  const categories = useQuery({
    queryKey: ["categories"],
    queryFn: ({ signal }) => api.categories(signal),
  });
  const products = useQuery({
    queryKey: ["products", debounced, category, offset],
    queryFn: ({ signal }) => api.products(debounced, category, offset, signal),
  });
  useEffect(() => {
    if (selectedId || !products.data?.items.length) return;
    const id = products.data.items[0].id;
    setSelectedId(id);
    const url = new URL(location.href);
    url.searchParams.set("product", id);
    window.history.replaceState({}, "", url);
  }, [selectedId, products.data]);
  function selectProduct(id: string, scroll = false) {
    setSelectedId(id);
    setView("explore");
    const url = new URL(location.href);
    url.searchParams.set("product", id);
    window.history.pushState({}, "", url);
    if (scroll)
      document
        .getElementById("comparison")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function saveTarget(product: Product, targetPaise: number): boolean {
    const next = [
      ...watches.filter((watch) => watch.productId !== product.id),
      {
        productId: product.id,
        title: `${product.brand} ${product.title}`,
        targetPaise,
      },
    ];
    if (!saveWatches(next)) return false;
    setWatches(next);
    setNotice("Target saved on this browser.");
    return true;
  }
  function removeTarget(id: string) {
    const next = watches.filter((watch) => watch.productId !== id);
    if (!saveWatches(next)) {
      setNotice("Your browser could not update saved targets.");
      return;
    }
    setWatches(next);
    setNotice("Target removed.");
  }
  return (
    <>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <a
            className="brand"
            href="/"
            onClick={(event) => {
              event.preventDefault();
              setView("explore");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          >
            <span className="brand-mark">
              <ArrowDownRight size={24} />
            </span>
            PriceLedger<span className="brand-dot">.</span>
          </a>
          <nav aria-label="Main navigation">
            <button
              className={view === "explore" ? "nav-link active" : "nav-link"}
              onClick={() => setView("explore")}
            >
              Explore prices
            </button>
            <button className="nav-link" onClick={() => setMethodOpen(true)}>
              Our method
            </button>
          </nav>
          <button
            className={`watchlist-button ${view === "watchlist" ? "selected" : ""}`}
            onClick={() => setView("watchlist")}
          >
            <Bookmark size={17} />
            My targets<span>{watches.length}</span>
          </button>
        </div>
      </header>
      <main id="main" className="page">
        {view === "explore" ? (
          <>
            <section className="intro">
              <div>
                <span className="eyebrow">
                  <span className="status-dot" />A little clarity before
                  checkout
                </span>
                <h1>Good deals have a history.</h1>
                <p>
                  Compare the price. See the journey. Buy with the full picture.
                </p>
              </div>
              <button
                className="trust-pill"
                onClick={() => setMethodOpen(true)}
              >
                <ShieldCheck size={19} />
                <span>Evidence over advertised discounts</span>
                <ArrowUpRight size={15} />
              </button>
            </section>
            {health.data?.demo_mode && (
              <div className="demo-banner">
                <Info size={16} />
                <span>
                  <strong>Sample workspace.</strong> Fictional products and
                  synthetic prices for exploring the experience.
                </span>
                <button onClick={() => setMethodOpen(true)}>
                  About this data <ArrowUpRight size={13} />
                </button>
              </div>
            )}
            <section className="explore-section" aria-label="Find a product">
              <div className="search-row">
                <label className="search-box">
                  <Search size={20} />
                  <input
                    aria-label="Search products"
                    placeholder="Find a product or brand…"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                  {search && (
                    <button
                      aria-label="Clear search"
                      onClick={() => setSearch("")}
                    >
                      <X size={17} />
                    </button>
                  )}
                  <kbd>Search</kbd>
                </label>
                <div className="catalog-count">
                  <SlidersHorizontal size={17} />
                  {products.data?.total ?? "—"} tracked variants
                </div>
              </div>
              <div className="category-row" aria-label="Filter by category">
                <button
                  className={
                    !category ? "category-chip selected" : "category-chip"
                  }
                  onClick={() => {
                    setCategory("");
                    setOffset(0);
                  }}
                >
                  All categories
                </button>
                {categories.data?.map((item) => (
                  <button
                    key={item.id}
                    className={
                      category === item.id
                        ? "category-chip selected"
                        : "category-chip"
                    }
                    onClick={() => {
                      setCategory(item.id);
                      setOffset(0);
                    }}
                  >
                    {item.name}
                    <span>{item.count}</span>
                  </button>
                ))}
              </div>
              {products.isPending ? (
                <div className="loading-state" role="status">
                  <span className="spinner" />
                  Loading the catalog…
                </div>
              ) : products.isError ? (
                <div className="error-state" role="alert">
                  <h2>The catalog couldn’t load.</h2>
                  <p>
                    Check that the comparison service is running, then try
                    again.
                  </p>
                  <button
                    className="button secondary"
                    onClick={() => {
                      void products.refetch();
                      void categories.refetch();
                      void health.refetch();
                    }}
                  >
                    Try again
                  </button>
                </div>
              ) : products.data?.items.length === 0 ? (
                <div className="empty-state">
                  <Search size={28} />
                  <h2>No matching products yet.</h2>
                  <p>
                    Try another search or category. Only tracked variants appear
                    here.
                  </p>
                  <button
                    className="text-button"
                    onClick={() => {
                      setSearch("");
                      setCategory("");
                      setOffset(0);
                    }}
                  >
                    Clear filters <ArrowRight size={14} />
                  </button>
                </div>
              ) : (
                <>
                  <div className="product-grid">
                    {products.data?.items.map((item) => (
                      <button
                        key={item.id}
                        className={`product-card ${selectedId === item.id ? "selected" : ""}`}
                        onClick={() => selectProduct(item.id, true)}
                        aria-pressed={selectedId === item.id}
                      >
                        <div className="card-art">
                          <ProductArt kind={item.illustration} compact />
                          <span className="card-category">
                            {titleCase(item.category)}
                          </span>
                          <span className="card-arrow">
                            <ArrowUpRight size={17} />
                          </span>
                        </div>
                        <div className="card-info">
                          <span className="product-brand">{item.brand}</span>
                          <h2>{item.title}</h2>
                          <p>{item.variant_label}</p>
                          <div className="card-bottom">
                            <strong>{rupees(item.best_price_paise)}</strong>
                            <span>{item.retailer_count} stores</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                  {products.data && products.data.total > 24 && (
                    <div className="pagination">
                      <button
                        className="button secondary"
                        disabled={offset === 0}
                        onClick={() => setOffset(Math.max(0, offset - 24))}
                      >
                        Previous
                      </button>
                      <span>
                        Page {offset / 24 + 1} of{" "}
                        {Math.ceil(products.data.total / 24)}
                      </span>
                      <button
                        className="button secondary"
                        disabled={offset + 24 >= products.data.total}
                        onClick={() => setOffset(offset + 24)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              )}
            </section>
            {selectedId && (
              <Comparison
                productId={selectedId}
                setTarget={setWatchProduct}
                showMethod={() => setMethodOpen(true)}
              />
            )}
          </>
        ) : (
          <section className="targets-section">
            <span className="eyebrow">A little patience can pay</span>
            <h1>Your price targets.</h1>
            <p className="intro-copy">
              Saved on this browser. External notifications aren’t enabled yet.
            </p>
            {watches.length === 0 ? (
              <div className="empty-state">
                <Bookmark size={30} />
                <h2>Start with a product you have in mind.</h2>
                <p>
                  Choose an exact variant and save the price you’re waiting for.
                </p>
                <button
                  className="button primary"
                  onClick={() => setView("explore")}
                >
                  Explore prices <ArrowRight size={16} />
                </button>
              </div>
            ) : (
              <div className="target-list">
                {watches.map((watch) => (
                  <article className="target-card" key={watch.productId}>
                    <span className="target-icon">
                      <Bell size={19} />
                    </span>
                    <div>
                      <h2>{watch.title}</h2>
                      <p>
                        Target <strong>{rupees(watch.targetPaise)}</strong>
                      </p>
                    </div>
                    <button
                      className="button secondary"
                      onClick={() => selectProduct(watch.productId)}
                    >
                      View history <ArrowUpRight size={15} />
                    </button>
                    <button
                      className="icon-button"
                      onClick={() => removeTarget(watch.productId)}
                      aria-label={`Remove target for ${watch.title}`}
                    >
                      <X size={18} />
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
        <footer className="site-footer">
          <span className="footer-brand">
            <ArrowDownRight size={18} />
            PriceLedger.
          </span>
          <p>Understand the price. Make your own call.</p>
          <button onClick={() => setMethodOpen(true)}>
            Data & methodology <ArrowUpRight size={13} />
          </button>
        </footer>
      </main>
      {notice && (
        <div className="toast" role="status">
          <Check size={17} />
          {notice}
        </div>
      )}
      {watchProduct && (
        <WatchDialog
          product={watchProduct}
          onSave={(target) => saveTarget(watchProduct, target)}
          onClose={() => setWatchProduct(null)}
        />
      )}
      {methodOpen && <MethodDialog close={() => setMethodOpen(false)} />}
    </>
  );
}
