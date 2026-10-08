import { useEffect, useRef } from "react";
import { Info, ShieldCheck, X } from "lucide-react";

export default function MethodDialog({ close }: { close: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = ref.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="watch-dialog method-dialog"
      onCancel={close}
      aria-labelledby="method-title"
    >
      <button
        className="icon-button dialog-close"
        onClick={close}
        aria-label="Close explanation"
      >
        <X size={19} />
      </button>
      <span className="dialog-icon">
        <ShieldCheck size={24} />
      </span>
      <h2 id="method-title">The evidence comes first.</h2>
      <p>
        We compare exact variants and separate item prices, delivery costs,
        stock and freshness. A missing shipping charge is never treated as free
        delivery.
      </p>
      <p>
        The usual price is the median of daily recorded totals in a 30-day
        window ending seven days ago. At least 20 observed days are required.
        Recorded lows refer to a stated retailer and period.
      </p>
      <p>
        A price rise followed by a drop describes an observed pattern; it does
        not establish why a seller changed its price. Missing history stays
        missing.
      </p>
      <div className="sample-note">
        <Info size={17} />
        <span>
          Product links are checked against readable retailer pages. Retailer
          access may be blocked, and launch-to-today history is available only
          when an actual historical source exists. Tracking starts with the
          first recorded observation. Offline prices require dated shop
          evidence; they are never calculated from an online discount.
        </span>
      </div>
    </dialog>
  );
}
