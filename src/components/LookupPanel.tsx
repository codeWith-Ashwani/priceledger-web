import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, Link, Search } from "lucide-react";
import { api } from "../api";

export default function LookupPanel({
  onProduct,
}: {
  onProduct: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const active = useRef<AbortController | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      active.current?.abort();
    };
  }, []);
  const lookup = useMutation({
    mutationFn: (input: string) => {
      active.current?.abort();
      active.current = new AbortController();
      return api.lookup(input, active.current.signal);
    },
    onSuccess: (result) => {
      if (alive.current && result.kind === "product")
        onProduct(result.product_id);
    },
  });
  return (
    <section className="lookup-section" aria-label="Find a real product">
      <form
        className="lookup-form"
        onSubmit={(event) => {
          event.preventDefault();
          if (query.trim().length >= 3) lookup.mutate(query.trim());
        }}
      >
        <label className="search-box">
          <Search size={20} />
          <input
            aria-label="Product link or brand and model"
            placeholder="Paste a product link, or enter brand + model"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={2048}
            required
            minLength={3}
          />
        </label>
        <button
          className="button primary"
          type="submit"
          disabled={lookup.isPending || query.trim().length < 3}
        >
          {lookup.isPending ? (
            <>
              <span className="spinner" /> Checking retailers…
            </>
          ) : (
            <>
              Find prices <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>
      <p className="lookup-help">
        <Link size={14} />
        Paste a public ecommerce product URL · compare the same model across
        connected stores, with variant differences labelled
      </p>
      {lookup.isError && (
        <div className="error-state" role="alert">
          <h2>We couldn’t verify this product.</h2>
          <p>{lookup.error.message}</p>
          <p>
            No price has been invented. Check the link or try another retailer.
          </p>
        </div>
      )}
      {lookup.data?.kind === "product" && !lookup.isPending && (
        <p className="lookup-message" role="status">
          {lookup.data.message}
        </p>
      )}
      {lookup.data?.kind === "search" && (
        <div className="retailer-results" aria-label="Retailer search results">
          <p className="lookup-message">{lookup.data.message}</p>
          {lookup.data.stores.map((store) => (
            <section className="retailer-result" key={store.retailer}>
              <div className="retailer-result-heading">
                <h2>{store.retailer_name}</h2>
                <a
                  href={store.search_url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Open retailer search <ArrowUpRight size={14} />
                </a>
              </div>
              <p>{store.message}</p>
              <div className="listing-results">
                {store.items.map((item) => (
                  <button
                    type="button"
                    className="listing-result"
                    key={item.url}
                    onClick={() => lookup.mutate(item.url)}
                    disabled={lookup.isPending}
                  >
                    <span>{item.title}</span>
                    <span>
                      Check price & history <ArrowRight size={15} />
                    </span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {!lookup.data && !lookup.isPending && !lookup.isError && (
        <div className="lookup-empty">
          <Search size={30} />
          <h2>Start with the product you want.</h2>
          <p>
            We’ll check the retailer’s current listing and show its recorded
            timeline, source and availability.
          </p>
          <p>
            History starts with real observations. Older online prices and
            offline quotes appear only when evidence is available.
          </p>
        </div>
      )}
    </section>
  );
}
