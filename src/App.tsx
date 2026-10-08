import { lazy, Suspense, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Bookmark,
  Check,
  ShieldCheck,
  X,
} from "lucide-react";
import type { Product } from "./api";
import { rupees } from "./format";
import { readWatches, saveWatches } from "./watchlist";
import LookupPanel from "./components/LookupPanel";
import Comparison from "./components/Comparison";
import MethodDialog from "./components/MethodDialog";
import WatchDialog from "./components/WatchDialog";

const HistoryImportAdmin = lazy(
  () => import("./components/HistoryImportAdmin"),
);

export default function App() {
  if (new URLSearchParams(location.search).get("admin") === "imports") {
    return (
      <Suspense
        fallback={
          <main className="page" role="status">
            Loading import workspace…
          </main>
        }
      >
        <HistoryImportAdmin />
      </Suspense>
    );
  }
  return <ConsumerApp />;
}

function ConsumerApp() {
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState(
    () => new URLSearchParams(location.search).get("product") ?? "",
  );
  const [view, setView] = useState<"explore" | "watchlist">("explore");
  const [watches, setWatches] = useState(readWatches);
  const [watchProduct, setWatchProduct] = useState<Product | null>(null);
  const [methodOpen, setMethodOpen] = useState(false);
  const [notice, setNotice] = useState("");
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
  function selectProduct(id: string, scroll = false) {
    void queryClient.invalidateQueries({ queryKey: ["product", id] });
    void queryClient.invalidateQueries({ queryKey: ["history", id] });
    void queryClient.invalidateQueries({ queryKey: ["assessment", id] });
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
                <p>Your product. Its real price. Its recorded journey.</p>
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
            <LookupPanel onProduct={(id) => selectProduct(id)} />
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
