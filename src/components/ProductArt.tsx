import { useId } from "react";

export default function ProductArt({
  kind,
  compact = false,
}: {
  kind: string;
  compact?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  return (
    <div
      className={`product-art art-${kind}${compact ? " compact" : ""}`}
      aria-hidden="true"
    >
      <svg viewBox="0 0 220 180" fill="none">
        <defs>
          <linearGradient
            id={id}
            x1="40"
            y1="20"
            x2="180"
            y2="160"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopColor="#65706d" />
            <stop offset=".5" stopColor="#292f32" />
            <stop offset="1" stopColor="#141c20" />
          </linearGradient>
        </defs>
        <ellipse
          cx="110"
          cy="153"
          rx="54"
          ry="7"
          fill="#203c2b"
          opacity=".10"
        />
        {kind === "headphones" ? (
          <>
            <path
              d="M59 99V77C59 17 161 17 161 77V99"
              stroke="#181f23"
              strokeWidth="15"
            />
            <path
              d="M64 79C61 31 156 27 157 79"
              stroke="#485052"
              strokeWidth="5"
            />
            <rect
              x="43"
              y="82"
              width="34"
              height="62"
              rx="14"
              fill={`url(#${id})`}
              transform="rotate(-12 60 113)"
            />
            <rect
              x="142"
              y="82"
              width="34"
              height="62"
              rx="14"
              fill={`url(#${id})`}
              transform="rotate(12 159 113)"
            />
            <path
              d="M53 96v30M151 93l5 34"
              stroke="#87908c"
              strokeWidth="2"
              strokeLinecap="round"
              opacity=".4"
            />
          </>
        ) : kind === "chair" ? (
          <>
            <rect x="78" y="27" width="65" height="78" rx="16" fill="#778c79" />
            <rect x="72" y="102" width="79" height="18" rx="8" fill="#526f58" />
            <path
              d="M65 86v22h91V86M111 119v26m0 0-38 11m38-11 38 11"
              stroke="#4a5650"
              strokeWidth="7"
              strokeLinecap="round"
            />
            <path
              d="M88 45h44M86 60h48M86 75h48"
              stroke="#95a695"
              strokeWidth="3"
            />
          </>
        ) : kind === "shoe" ? (
          <>
            <path
              d="M46 111c20-10 24-29 38-48l28 24 20-8 18 30 37 14c8 3 9 13 1 16H47c-13 0-14-17-1-28Z"
              fill="#e8dfca"
              stroke="#b4a88e"
              strokeWidth="2"
            />
            <path
              d="m86 86 36 25M91 79l33 24M102 74l27 21"
              stroke="#fffaf0"
              strokeWidth="5"
            />
            <path d="M37 132h153" stroke="#fcfbf4" strokeWidth="11" />
            <path
              d="m129 117 21 5"
              stroke="#777e67"
              strokeWidth="6"
              strokeLinecap="round"
            />
          </>
        ) : kind === "coffee" ? (
          <>
            <path
              d="M76 27h68l10 111c1 9-9 13-18 13H83c-10 0-17-5-16-14L76 27Z"
              fill="#b9c4a4"
            />
            <path d="M78 35h64M76 42h68" stroke="#788e68" strokeWidth="3" />
            <rect x="80" y="66" width="60" height="59" rx="2" fill="#fcf9e8" />
            <path
              d="M99 79h22M95 92h30M102 113c-13-13 15-26 13-11"
              stroke="#6d775c"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </>
        ) : kind === "serum" ? (
          <>
            <rect x="96" y="26" width="28" height="34" rx="7" fill="#333b35" />
            <rect x="87" y="56" width="46" height="16" rx="4" fill="#dbcdb6" />
            <rect x="78" y="72" width="64" height="78" rx="11" fill="#bb8b48" />
            <rect x="83" y="88" width="54" height="45" rx="2" fill="#fcf5df" />
            <path d="M98 101h26M96 112h30" stroke="#b3a58b" strokeWidth="3" />
            <path d="M85 78v65" stroke="#ebc48a" strokeWidth="3" opacity=".6" />
          </>
        ) : (
          <>
            <path d="m72 33 81 9v112l-81-9V33Z" fill="#e8c99e" />
            <path d="m65 39 8-6v112l-8 5V39Z" fill="#9c8264" />
            <path d="m73 145 80 9-7 5-81-9 8-5Z" fill="#f5f0df" />
            <path d="m88 65 48 5M88 78l34 4" stroke="#886f52" strokeWidth="4" />
            <circle cx="110" cy="111" r="13" stroke="#ad936d" strokeWidth="2" />
          </>
        )}
      </svg>
    </div>
  );
}
