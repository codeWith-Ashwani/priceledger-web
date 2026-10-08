import { useState } from "react";
import { Package } from "lucide-react";

export default function ProductImage({
  url,
  title,
}: {
  url: string | null;
  title: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <div className="real-product-image">
      {url && !failed ? (
        <img
          src={url}
          alt={title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <Package
          size={48}
          strokeWidth={1.2}
          aria-label="Product image unavailable"
        />
      )}
    </div>
  );
}
