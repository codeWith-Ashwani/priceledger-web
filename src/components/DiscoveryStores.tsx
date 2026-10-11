import { useEffect, useState } from "react";
import { adminRequest } from "../adminApi";

interface LearnedStore {
  retailer_id: string;
  host: string;
  brands: string[];
  enabled: boolean;
  source_active: boolean;
}

export default function DiscoveryStores({ token }: { token: string }) {
  const [stores, setStores] = useState<LearnedStore[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(true);
  useEffect(() => {
    let active = true;
    adminRequest<LearnedStore[]>(token, "/discovery-stores")
      .then((rows) => {
        if (active) setStores(rows);
      })
      .catch((failure: Error) => {
        if (active) setError(failure.message);
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
    };
  }, [token]);

  async function toggle(store: LearnedStore) {
    setBusy(true);
    setError("");
    try {
      await adminRequest(
        token,
        `/discovery-stores/${encodeURIComponent(store.retailer_id)}/status`,
        { enabled: !store.enabled },
      );
      setStores((rows) =>
        rows.map((row) =>
          row.retailer_id === store.retailer_id
            ? { ...row, enabled: !store.enabled }
            : row,
        ),
      );
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel import-panel" aria-label="Learned stores">
      <h2>Learned stores</h2>
      <p>
        Readable Shopify product links can teach discovery about a store and its
        observed brands. Searches remain bounded and respect source permissions
        and retry limits.
      </p>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">Updating learned stores…</p>}
      {!busy && !stores.length && !error && (
        <p>No stores learned yet. Look up a readable product link from a new Shopify store to begin.</p>
      )}
      {stores.map((store) => (
        <div className="import-session" key={store.retailer_id}>
          <div>
            <strong>{store.host}</strong>
            <p>
              {store.brands.join(", ")} · {" "}
              {!store.source_active ? "Source inactive" : store.enabled ? "Discovery active" : "Discovery paused"}
            </p>
          </div>
          <button
            className="text-button"
            disabled={busy || (!store.enabled && !store.source_active)}
            onClick={() => void toggle(store)}
          >
            {store.enabled ? "Pause" : "Resume"} {store.host}
          </button>
        </div>
      ))}
    </section>
  );
}
