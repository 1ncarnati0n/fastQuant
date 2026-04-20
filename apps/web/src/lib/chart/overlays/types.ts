import type { UTCTimestamp } from "lightweight-charts";

export interface OverlayHandle {
  remove(): void;
  /** Re-apply the current style to attached series. Safe no-op when unsupported. */
  applyStyle?(): void;
}

export type TS = UTCTimestamp;

export function t(time: number): TS {
  return time as TS;
}
