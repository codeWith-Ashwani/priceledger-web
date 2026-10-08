import { useRef, useState } from "react";
import { ArrowDownRight, ArrowLeft, FileUp, ShieldCheck } from "lucide-react";
import { adminRequest, downloadTemplate } from "../adminApi";
import type {
  ImportAudit,
  ImportOffer,
  ImportPreview,
  ImportResult,
  ImportSource,
} from "../adminApi";
import { rupees } from "../format";

function indiaDate(value?: string | null) {
  return value
    ? new Date(value).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      }) + " IST"
    : "—";
}

export default function HistoryImportAdmin() {
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [sources, setSources] = useState<ImportSource[]>([]);
  const [offers, setOffers] = useState<ImportOffer[]>([]);
  const [audit, setAudit] = useState<ImportAudit[]>([]);
  const [sourceId, setSourceId] = useState("");
  const [offerId, setOfferId] = useState("");
  const [query, setQuery] = useState("");
  const [file, setFile] = useState<{
    name: string;
    content: string;
    format: "csv" | "json";
  } | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewPage, setPreviewPage] = useState(0);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sourceForm, setSourceForm] = useState({
    id: "",
    name: "",
    approval_reference: "",
    rights_confirmed: false,
  });
  const fileGeneration = useRef(0);
  const fileInput = useRef<HTMLInputElement>(null);
  const sourceRegistration = useRef<HTMLDetailsElement>(null);
  const selectedOffer = offers.find((offer) => offer.offer_id === offerId);

  async function connect() {
    setBusy(true);
    setError("");
    try {
      const nextSources = await adminRequest<ImportSource[]>(
        password,
        "/sources",
      );
      const [nextOffers, recent] = await Promise.all([
        adminRequest<ImportOffer[]>(password, "/offers"),
        adminRequest<ImportAudit[]>(password, "/imports"),
      ]);
      setToken(password);
      setPassword("");
      setSources(nextSources);
      setOffers(nextOffers);
      setAudit(recent);
      setSourceId(nextSources[0]?.id ?? "");
      setOfferId(nextOffers[0]?.offer_id ?? "");
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function disconnect() {
    fileGeneration.current++;
    setToken("");
    setPassword("");
    setFile(null);
    setPreview(null);
    setResult(null);
    setOffers([]);
    setSources([]);
    setAudit([]);
    setSourceId("");
    setOfferId("");
    setError("");
    setSourceForm({
      id: "",
      name: "",
      approval_reference: "",
      rights_confirmed: false,
    });
  }
  async function readFile(selected?: File) {
    const generation = ++fileGeneration.current;
    setFile(null);
    setPreview(null);
    setResult(null);
    setError("");
    if (!selected) return;
    if (selected.size > 1_000_000) {
      setError("Choose a file of at most 1 MB.");
      return;
    }
    if (!/\.(csv|json)$/i.test(selected.name)) {
      setError("Choose a UTF-8 CSV or JSON file.");
      return;
    }
    try {
      const bytes = await selected.arrayBuffer();
      const content = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (generation === fileGeneration.current)
        setFile({
          name: selected.name,
          content,
          format: selected.name.toLowerCase().endsWith(".csv") ? "csv" : "json",
        });
    } catch {
      if (generation === fileGeneration.current)
        setError("The file must contain readable UTF-8 text.");
    }
  }
  async function makePreview() {
    if (!file || !sourceId) return;
    setBusy(true);
    setError("");
    setPreview(null);
    setResult(null);
    setPreviewPage(0);
    try {
      setPreview(
        await adminRequest<ImportPreview>(token, "/imports/preview", {
          source_id: sourceId,
          file_name: file.name,
          format: file.format,
          content: file.content,
        }),
      );
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function commit() {
    if (!preview?.import_id || !preview.can_commit) return;
    setBusy(true);
    setError("");
    try {
      setResult(
        await adminRequest<ImportResult>(
          token,
          `/imports/${encodeURIComponent(preview.import_id)}/commit`,
          {},
        ),
      );
      setAudit(await adminRequest<ImportAudit[]>(token, "/imports"));
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function createSource() {
    setBusy(true);
    setError("");
    try {
      const created = await adminRequest<{ id: string }>(
        token,
        "/sources",
        sourceForm,
      );
      setSources(await adminRequest<ImportSource[]>(token, "/sources"));
      setSourceId(created.id);
      if (sourceRegistration.current) sourceRegistration.current.open = false;
      setPreview(null);
      setResult(null);
      setSourceForm({
        id: "",
        name: "",
        approval_reference: "",
        rights_confirmed: false,
      });
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }
  async function searchOffers() {
    setBusy(true);
    setError("");
    try {
      const found = await adminRequest<ImportOffer[]>(
        token,
        `/offers?q=${encodeURIComponent(query)}`,
      );
      setOffers(found);
      setOfferId(found[0]?.offer_id ?? "");
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="site-header">
        <div className="header-inner">
          <a className="brand" href="/">
            <span className="brand-mark">
              <ArrowDownRight size={24} />
            </span>
            PriceLedger<span className="brand-dot">.</span>
          </a>
          <a className="text-button" href="/">
            <ArrowLeft size={16} /> Back to prices
          </a>
        </div>
      </header>
      <main className="page import-workspace">
        <div className="import-intro">
          <span className="eyebrow">
            <ShieldCheck size={16} /> Owner workspace
          </span>
          <h1>Bring the past into view.</h1>
          <p>
            Review genuine historical records before they join a product’s
            timeline.
          </p>
        </div>
        {error && (
          <div className="error-state" role="alert">
            {error}
          </div>
        )}
        {!token ? (
          <section className="panel import-panel">
            <h2>Connect to the import workspace</h2>
            <p>
              Use the admin token configured on your API. It stays in memory and
              is cleared when you disconnect or reload.
            </p>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void connect();
              }}
            >
              <label className="import-field">
                Admin token
                <input
                  type="password"
                  autoComplete="off"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                  disabled={busy}
                />
              </label>
              <button className="button primary" disabled={busy || !password}>
                {busy ? "Connecting…" : "Connect"}
              </button>
            </form>
          </section>
        ) : (
          <>
            <div className="import-session">
              <span>Admin session connected</span>
              <button
                className="text-button"
                disabled={busy}
                onClick={disconnect}
              >
                Disconnect
              </button>
            </div>
            <section className="panel import-panel" aria-label="Import source">
              <h2>1. Choose the evidence source</h2>
              <p>
                Imports must come from a source approved for storage and public
                display.
              </p>
              <label className="import-field">
                Approved source
                <select
                  value={sourceId}
                  disabled={busy}
                  onChange={(event) => {
                    setSourceId(event.target.value);
                    setPreview(null);
                    setResult(null);
                  }}
                >
                  <option value="">Select a source</option>
                  {sources.map((source) => (
                    <option key={source.id} value={source.id}>
                      {source.name}
                    </option>
                  ))}
                </select>
              </label>
              {!sources.length && <p>No approved historical sources yet.</p>}
              {sources.find((source) => source.id === sourceId)
                ?.approval_reference && (
                <p className="import-reference">
                  Approval reference:{" "}
                  {
                    sources.find((source) => source.id === sourceId)
                      ?.approval_reference
                  }
                </p>
              )}
              <details className="source-registration" ref={sourceRegistration}>
                <summary>Register an approved source</summary>
                <p>
                  This records your approval; it does not obtain access or
                  verify a provider’s licensing.
                </p>
                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    void createSource();
                  }}
                >
                  <label className="import-field">
                    Source ID
                    <input
                      value={sourceForm.id}
                      pattern="[a-z0-9][a-z0-9_-]+"
                      minLength={3}
                      maxLength={80}
                      required
                      disabled={busy}
                      onChange={(event) =>
                        setSourceForm({ ...sourceForm, id: event.target.value })
                      }
                    />
                  </label>
                  <label className="import-field">
                    Source name
                    <input
                      value={sourceForm.name}
                      minLength={3}
                      maxLength={200}
                      required
                      disabled={busy}
                      onChange={(event) =>
                        setSourceForm({
                          ...sourceForm,
                          name: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="import-field">
                    Permission or ownership reference
                    <textarea
                      value={sourceForm.approval_reference}
                      minLength={5}
                      maxLength={1000}
                      required
                      disabled={busy}
                      onChange={(event) =>
                        setSourceForm({
                          ...sourceForm,
                          approval_reference: event.target.value,
                        })
                      }
                    />
                  </label>
                  <label className="import-checkbox">
                    <input
                      type="checkbox"
                      required
                      disabled={busy}
                      checked={sourceForm.rights_confirmed}
                      onChange={(event) =>
                        setSourceForm({
                          ...sourceForm,
                          rights_confirmed: event.target.checked,
                        })
                      }
                    />
                    I have verified permission to retain and publicly display
                    this source’s historical records.
                  </label>
                  <button className="button secondary" disabled={busy}>
                    Register source
                  </button>
                </form>
              </details>
            </section>
            <section
              className="panel import-panel"
              aria-label="Listing mapping"
            >
              <h2>2. Identify the exact listing</h2>
              <p>
                Each file row names an existing offer and its exact retailer,
                listing ID, variant and seller context.
              </p>
              <form
                className="import-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  void searchOffers();
                }}
              >
                <label className="import-field">
                  Find a tracked product
                  <input
                    value={query}
                    maxLength={128}
                    disabled={busy}
                    onChange={(event) => setQuery(event.target.value)}
                  />
                </label>
                <button className="button secondary" disabled={busy}>
                  Find listing
                </button>
              </form>
              <label className="import-field">
                Tracked listing
                <select
                  value={offerId}
                  disabled={busy}
                  onChange={(event) => setOfferId(event.target.value)}
                >
                  <option value="">Select a listing</option>
                  {offers.map((offer) => (
                    <option key={offer.offer_id} value={offer.offer_id}>
                      {offer.title} · {offer.retailer_id} ·{" "}
                      {offer.retailer_listing_id}
                    </option>
                  ))}
                </select>
              </label>
              {selectedOffer ? (
                <>
                  <dl className="import-mapping">
                    <dt>Offer ID</dt>
                    <dd>{selectedOffer.offer_id}</dd>
                    <dt>Variant</dt>
                    <dd>
                      {Object.entries(selectedOffer.variant_attributes)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join(" · ")}
                    </dd>
                    <dt>Context</dt>
                    <dd>
                      {selectedOffer.seller} · {selectedOffer.condition} ·{" "}
                      {selectedOffer.region}
                    </dd>
                  </dl>
                  <button
                    className="text-button"
                    onClick={() => downloadTemplate(selectedOffer)}
                  >
                    Download JSON template
                  </button>
                  <p className="muted">
                    The template has listing identifiers and empty price/date
                    fields. Complete them only from actual source evidence.
                    Files can contain multiple exact listings.
                  </p>
                </>
              ) : (
                <p>
                  No matching tracked listings. Look up a real product on the
                  main site first.
                </p>
              )}
            </section>
            <section className="panel import-panel" aria-label="History upload">
              <h2>3. Upload and preview</h2>
              <p>
                UTF-8 CSV or a JSON array · up to 1,000 rows / 1 MB. Prices use
                integer paise; dates require a timezone. Unknown delivery stays
                empty.
              </p>
              <label className="import-field">
                History file
                <input
                  ref={fileInput}
                  type="file"
                  accept=".csv,.json"
                  disabled={busy}
                  onChange={(event) => void readFile(event.target.files?.[0])}
                />
              </label>
              {file && (
                <p>
                  {file.name} · {file.format.toUpperCase()}
                </p>
              )}
              <button
                className="button primary"
                disabled={busy || !sourceId || !file}
                onClick={() => void makePreview()}
              >
                <FileUp size={16} />
                {busy ? "Checking…" : "Preview import"}
              </button>
            </section>
            {preview && (
              <section
                className="panel import-panel"
                aria-label="Import preview"
              >
                <h2>4. Review before saving</h2>
                <p>
                  {preview.source_name} · {preview.ready} new ·{" "}
                  {preview.duplicates} duplicates · {preview.errors} errors
                </p>
                <div className="offers-table-wrap">
                  <table className="offers-table">
                    <thead>
                      <tr>
                        <th>Row</th>
                        <th>Listing</th>
                        <th>Date</th>
                        <th>Item price</th>
                        <th>Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows
                        .slice(previewPage * 50, (previewPage + 1) * 50)
                        .map((row) => (
                          <tr key={row.row}>
                            <td>{row.row}</td>
                            <td>
                              {row.title ?? "—"}
                              <small className="observed-date">
                                {row.retailer_id}
                              </small>
                            </td>
                            <td>{indiaDate(row.observed_at)}</td>
                            <td>{rupees(row.item_paise ?? null)}</td>
                            <td>
                              <strong>
                                {row.status === "ready"
                                  ? "Ready"
                                  : row.status === "duplicate"
                                    ? "Duplicate"
                                    : "Needs correction"}
                              </strong>
                              <small className="observed-date">
                                {row.message}
                              </small>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                {preview.rows.length > 50 && (
                  <div className="pagination">
                    <button
                      className="button secondary"
                      disabled={previewPage === 0}
                      onClick={() => setPreviewPage(previewPage - 1)}
                    >
                      Previous rows
                    </button>
                    <span>
                      Rows {previewPage * 50 + 1}–
                      {Math.min((previewPage + 1) * 50, preview.rows.length)} of{" "}
                      {preview.rows.length}
                    </span>
                    <button
                      className="button secondary"
                      disabled={(previewPage + 1) * 50 >= preview.rows.length}
                      onClick={() => setPreviewPage(previewPage + 1)}
                    >
                      Next rows
                    </button>
                  </div>
                )}
                {preview.errors > 0 ? (
                  <p>
                    Correct every error and preview the file again. No
                    observations have been saved.
                  </p>
                ) : (
                  <p>
                    Preview expires {indiaDate(preview.expires_at)}. Importing
                    history preserves current live prices.
                  </p>
                )}
                {!result && (
                  <button
                    className="button primary"
                    disabled={busy || !preview.can_commit || !preview.import_id}
                    onClick={() => void commit()}
                  >
                    {busy ? "Saving…" : "Commit reviewed import"}
                  </button>
                )}
                {result && (
                  <div className="import-success" role="status">
                    <strong>Import complete</strong>
                    <p>
                      {result.inserted}{" "}
                      {result.inserted === 1 ? "observation" : "observations"}{" "}
                      added; {result.duplicates} duplicates skipped.
                    </p>
                    {result.product_ids.map((id) => (
                      <a
                        key={id}
                        className="text-button"
                        href={`/?product=${encodeURIComponent(id)}`}
                      >
                        View recorded history
                      </a>
                    ))}
                  </div>
                )}
              </section>
            )}
            <section className="panel import-panel" aria-label="Recent imports">
              <h2>Recent imports</h2>
              {!audit.length ? (
                <p>No imports have been reviewed yet.</p>
              ) : (
                <ul className="import-audit">
                  {audit.map((item) => (
                    <li key={item.id}>
                      <strong>{item.file_name}</strong>
                      <span>
                        {item.source_name} · {item.status} ·{" "}
                        {indiaDate(item.committed_at ?? item.created_at)}
                      </span>
                      {item.result && (
                        <span>
                          {item.result.inserted} added /{" "}
                          {item.result.duplicates} duplicates
                        </span>
                      )}
                      <details>
                        <summary>File identity</summary>
                        <code>{item.content_sha256}</code>
                      </details>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </>
  );
}
