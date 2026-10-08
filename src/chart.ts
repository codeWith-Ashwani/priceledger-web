import type { HistoryPoint } from "./api";

export interface Segment {
  path: string;
  firstX: number;
  lastX: number;
}

export function stepSegments(
  points: HistoryPoint[],
  x: (timestamp: number) => number,
  y: (value: number) => number,
  gapHours: number,
): Segment[] {
  const segments: Segment[] = [];
  let segment: Segment | undefined;
  let previousTime: number | undefined;
  for (const point of points) {
    const timestamp = Date.parse(point.at);
    if (point.total_paise === null || !Number.isFinite(timestamp)) {
      segment = undefined;
      previousTime = undefined;
      continue;
    }
    const px = x(timestamp),
      py = y(point.total_paise);
    if (
      !segment ||
      previousTime === undefined ||
      timestamp - previousTime > gapHours * 3_600_000
    ) {
      segment = { path: `M${px},${py}`, firstX: px, lastX: px };
      segments.push(segment);
    } else {
      segment.path += `H${px}V${py}`;
      segment.lastX = px;
    }
    previousTime = timestamp;
  }
  return segments;
}
