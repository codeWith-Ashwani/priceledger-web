import { useEffect, useRef, useState } from "react";
import { Flag, X } from "lucide-react";
import type { Offer } from "../api";
import { rupees } from "../format";
import {
  reportReasons,
  reportTime,
  submitReport,
  type ReportReason,
  type ReportReceipt,
} from "../reports";
import "./Reports.css";

export default function ReportDialog({
  offer,
  comparisonProduct,
  onClose,
}: {
  offer: Offer;
  comparisonProduct: { id: string; title: string };
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef<AbortController | null>(null);
  const identity = useRef({ signature: "", id: "" });
  const [reason, setReason] = useState<ReportReason>("wrong_price");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<ReportReceipt | null>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      pending.current?.abort();
      element?.close();
    };
  }, []);
  async function send() {
    if (pending.current || receipt) return;
    const body = {
      offer_id: offer.id,
      comparison_product_id: comparisonProduct.id,
      reason,
      details: details.trim(),
      observed_at: offer.observed_at,
      item_paise: offer.item_paise,
      in_stock: offer.in_stock,
    };
    if (body.details.length < 5) {
      setError("Describe the issue in at least five characters.");
      return;
    }
    const signature = JSON.stringify(body);
    if (identity.current.signature !== signature)
      identity.current = { signature, id: crypto.randomUUID() };
    const controller = new AbortController();
    pending.current = controller;
    setBusy(true);
    setError("");
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, 15000);
    try {
      const result = await submitReport(
        { ...body, request_id: identity.current.id },
        controller.signal,
      );
      if (!controller.signal.aborted) setReceipt(result);
    } catch (failure) {
      if (!controller.signal.aborted || timedOut)
        setError(
          timedOut
            ? "The request timed out. Retry with these details to check the same submission."
            : (failure as Error).message,
        );
    } finally {
      clearTimeout(timer);
      pending.current = null;
      if (!controller.signal.aborted || timedOut) setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="watch-dialog report-dialog"
      aria-labelledby="report-title"
      onCancel={(event) => {
        if (busy) event.preventDefault();
        else onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <button
        className="icon-button dialog-close"
        aria-label="Close report dialog"
        disabled={busy}
        onClick={onClose}
      >
        <X size={19} />
      </button>
      <span className="dialog-icon">
        <Flag size={23} />
      </span>
      <h2 id="report-title">Report an offer issue</h2>
      <p>
        <strong>{offer.title ?? comparisonProduct.title}</strong> ·{" "}
        {offer.retailer_name}
      </p>
      <p>
        Recorded item price: {rupees(offer.item_paise)}
        <br />
        Checked {reportTime(offer.observed_at)}
      </p>
      {receipt ? (
        <div role="status" className="report-confirmation">
          <h3>Report received</h3>
          <p>
            Reference: <code>{receipt.report_id}</code>
          </p>
          <p>
            The owner can review the recorded offer. Prices and matches remain
            unchanged until a correction is verified.
          </p>
          <button className="button primary full" onClick={onClose}>
            Done
          </button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void send();
          }}
        >
          <label htmlFor="report-reason">What needs checking?</label>
          <select
            id="report-reason"
            value={reason}
            disabled={busy}
            onChange={(event) => setReason(event.target.value as ReportReason)}
          >
            {Object.entries(reportReasons).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
          <label htmlFor="report-details">Issue details</label>
          <textarea
            id="report-details"
            value={details}
            disabled={busy}
            onChange={(event) => setDetails(event.target.value)}
            minLength={5}
            maxLength={1000}
            required
            rows={4}
            aria-describedby="report-help"
          />
          <small id="report-help">
            Describe the price or model issue. Leave out personal and payment
            details. Reports go to the owner’s private review queue.
          </small>
          {error && (
            <p role="alert" className="field-error">
              {error}
            </p>
          )}
          <button type="submit" disabled={busy} className="button primary full">
            {busy ? "Sending report…" : "Send report"}
          </button>
        </form>
      )}
    </dialog>
  );
}
