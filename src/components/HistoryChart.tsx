import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import type { PriceHistory } from "../api";
import { stepSegments } from "../chart";
import { rupees } from "../format";

const LEFT = 68,
  RIGHT = 22,
  TOP = 24,
  BOTTOM = 34;

export default function HistoryChart({ history }: { history: PriceHistory }) {
  const [hidden, setHidden] = useState<string[]>([]);
  const [cursor, setCursor] = useState<number | null>(null);
  const [width, setWidth] = useState(820);
  const chartRef = useRef<HTMLDivElement>(null);
  const id = useId().replace(/:/g, "");
  const plottedSeries = history.series.map((series) => ({
    ...series,
    points: series.points.map((point) => ({
      ...point,
      total_paise:
        point.price_paise === undefined ? point.total_paise : point.price_paise,
    })),
  }));
  const visible = plottedSeries.filter(
    (series) => !hidden.includes(series.offer_id),
  );
  const dates = useMemo(
    () =>
      [
        ...new Set(
          history.series.flatMap((series) =>
            series.points.map((point) => Date.parse(point.at)),
          ),
        ),
      ].sort((a, b) => a - b),
    [history],
  );
  useEffect(() => {
    const element = chartRef.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) =>
      setWidth(Math.max(300, entries[0].contentRect.width)),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [history]);
  const W = width,
    H = width < 500 ? 230 : 280;
  const allValues = visible.flatMap((series) =>
    series.points.flatMap((point) =>
      point.total_paise === null ? [] : [point.total_paise],
    ),
  );
  if (dates.length === 0 || allValues.length === 0)
    return (
      <div className="empty-chart">
        No comparable observations in this period.
      </div>
    );
  const start = dates[0],
    end = Math.max(dates[dates.length - 1], start + 86_400_000);
  const low = Math.min(...allValues),
    high = Math.max(...allValues);
  const pad = Math.max((high - low) * 0.18, high * 0.025, 100);
  const minimum = Math.max(0, low - pad),
    maximum = high + pad;
  const x = (timestamp: number) =>
    LEFT + ((timestamp - start) / (end - start)) * (W - LEFT - RIGHT);
  const y = (value: number) =>
    TOP + ((maximum - value) / (maximum - minimum)) * (H - TOP - BOTTOM);
  const cursorIndex =
    cursor === null ? null : Math.min(cursor, dates.length - 1);
  const selectedTime = cursorIndex === null ? null : dates[cursorIndex];
  function move(event: PointerEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const coordinate = ((event.clientX - rect.left) / rect.width) * W;
    const time =
      start +
      Math.max(0, Math.min(1, (coordinate - LEFT) / (W - LEFT - RIGHT))) *
        (end - start);
    let closest = 0;
    for (let i = 1; i < dates.length; i++)
      if (Math.abs(dates[i] - time) < Math.abs(dates[closest] - time))
        closest = i;
    setCursor(closest);
  }
  return (
    <>
      <div className="chart-legend">
        {history.series.map((series) => (
          <button
            key={series.offer_id}
            className="legend-button"
            aria-pressed={!hidden.includes(series.offer_id)}
            style={{ "--series": series.color } as CSSProperties}
            disabled={visible.length === 1 && !hidden.includes(series.offer_id)}
            onClick={() =>
              setHidden((previous) =>
                previous.includes(series.offer_id)
                  ? previous.filter((value) => value !== series.offer_id)
                  : [...previous, series.offer_id],
              )
            }
          >
            <span />
            {series.name}
          </button>
        ))}
        <span className="chart-unit">
          {history.price_basis === "item" ? "Item" : "Delivered"} price · INR
        </span>
      </div>
      <div className="chart-wrap" ref={chartRef}>
        <svg
          className="history-svg"
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`Recorded ${history.price_basis} price history. Use the date slider below for exact values.`}
          onPointerMove={move}
          onPointerLeave={() => setCursor(null)}
        >
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#2b9671" stopOpacity=".13" />
              <stop offset="1" stopColor="#2b9671" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[0, 1, 2, 3, 4].map((tick) => {
            const value = minimum + ((maximum - minimum) * tick) / 4;
            return (
              <g key={tick}>
                <line
                  x1={LEFT}
                  x2={W - RIGHT}
                  y1={y(value)}
                  y2={y(value)}
                  stroke="#e7ece6"
                  strokeDasharray="4 5"
                />
                <text
                  x={LEFT - 13}
                  y={y(value) + 4}
                  textAnchor="end"
                  className="axis-label"
                >
                  {rupees(Math.round(value))}
                </text>
              </g>
            );
          })}
          {(dates.length === 1
            ? [0]
            : width < 500
              ? [0, 2, 4]
              : [0, 1, 2, 3, 4]
          ).map((tick) => {
            const timestamp = start + ((end - start) * tick) / 4;
            return (
              <text
                key={tick}
                x={dates.length === 1 ? W / 2 : x(timestamp)}
                y={H - 7}
                textAnchor={
                  dates.length === 1
                    ? "middle"
                    : tick === 0
                      ? "start"
                      : tick === 4
                        ? "end"
                        : "middle"
                }
                className="axis-label"
              >
                {new Date(timestamp).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  timeZone: "Asia/Kolkata",
                })}
              </text>
            );
          })}
          {visible.map((series, index) =>
            stepSegments(series.points, x, y, history.max_gap_hours).map(
              (segment, segmentIndex) => (
                <g key={`${series.offer_id}:${segmentIndex}`}>
                  {index === 0 && (
                    <path
                      d={`${segment.path}L${segment.lastX},${H - BOTTOM}L${segment.firstX},${H - BOTTOM}Z`}
                      fill={`url(#${id})`}
                    />
                  )}
                  <path
                    d={segment.path}
                    fill="none"
                    stroke={series.color}
                    strokeWidth="2.6"
                    strokeLinejoin="round"
                  />
                </g>
              ),
            ),
          )}
          {visible.map((series) =>
            series.points
              .filter((point) => point.total_paise !== null)
              .map((point) => (
                <circle
                  key={`${series.offer_id}:${point.at}`}
                  cx={dates.length === 1 ? W / 2 : x(Date.parse(point.at))}
                  cy={y(point.total_paise!)}
                  r={dates.length === 1 ? 5 : 2.3}
                  fill={series.color}
                />
              )),
          )}
          {selectedTime !== null && (
            <line
              x1={dates.length === 1 ? W / 2 : x(selectedTime)}
              x2={dates.length === 1 ? W / 2 : x(selectedTime)}
              y1={TOP}
              y2={H - BOTTOM}
              stroke="#84928a"
              strokeDasharray="3 4"
            />
          )}
        </svg>
        {selectedTime !== null && (
          <div className="chart-tooltip" role="status">
            <strong>
              {new Date(selectedTime).toLocaleString("en-IN", {
                timeZone: "Asia/Kolkata",
                dateStyle: "medium",
                timeStyle: "short",
              })}{" "}
              IST
            </strong>
            {visible.map((series) => {
              const point = series.points.find(
                (value) => Date.parse(value.at) === selectedTime,
              );
              return (
                <div key={series.offer_id}>
                  <span style={{ color: series.color }}>{series.name}</span>
                  <b>{point ? rupees(point.total_paise) : "No observation"}</b>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <label className="chart-slider-label">
        Inspect a date{" "}
        <input
          aria-label="Inspect history date"
          type="range"
          min="0"
          max={dates.length - 1}
          value={cursorIndex ?? dates.length - 1}
          onFocus={() => setCursor(cursorIndex ?? dates.length - 1)}
          onChange={(event) => setCursor(Number(event.target.value))}
        />
      </label>
      {dates.length === 1 && (
        <p className="first-observation">
          First recorded observation. More points will appear after genuine
          price checks.
        </p>
      )}
      <div className="chart-caption">
        <span>
          <i className="gap-mark" />
          Gaps mean unavailable or missing observations.
        </span>
        <span>
          Only recorded observations are shown; earlier history may be
          unavailable.
        </span>
      </div>
    </>
  );
}
