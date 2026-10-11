import { useEffect, useRef, useState } from "react";
import { Bell, X } from "lucide-react";
import type { Product } from "../api";
import { parseTarget } from "../watchlist";
import { rupees } from "../format";

export default function WatchDialog({
  product,
  onSave,
  onClose,
}: {
  product: Product;
  onSave: (target: number) => boolean;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [value, setValue] = useState(
    product.best_price_paise === null
      ? ""
      : String(Math.floor((product.best_price_paise / 100) * 0.9)),
  );
  const [error, setError] = useState("");
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className="watch-dialog"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      aria-labelledby="watch-title"
    >
      <button
        className="icon-button dialog-close"
        aria-label="Close target dialog"
        onClick={onClose}
      >
        <X size={19} />
      </button>
      <span className="dialog-icon">
        <Bell size={23} />
      </span>
      <h2 id="watch-title">Your price. Your timing.</h2>
      <p>
        Save a target for{" "}
        <strong>
          {product.brand} {product.title}
        </strong>
        .
      </p>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const target = parseTarget(value);
          if (target === null)
            setError("Enter a positive amount with up to two decimal places.");
          else if (!onSave(target))
            setError(
              "Your browser could not save this target. Check storage permissions.",
            );
          else onClose();
        }}
      >
        <label htmlFor="target-price">Target price in rupees</label>
        <div className="price-input">
          <span>₹</span>
          <input
            id="target-price"
            inputMode="decimal"
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            aria-invalid={Boolean(error)}
            aria-describedby="watch-help watch-error"
            required
          />
        </div>
        {error && (
          <p className="field-error" id="watch-error" role="alert">
            {error}
          </p>
        )}
        <small id="watch-help">
          Current recorded item + shipping: {rupees(product.best_price_paise)}.
          Targets use the exact variant’s online item + shipping price; listed
          extras are excluded. Saved on this browser. Email and push alerts are
          not enabled.
        </small>
        <button className="button primary full" type="submit">
          Save target <Bell size={16} />
        </button>
      </form>
    </dialog>
  );
}
