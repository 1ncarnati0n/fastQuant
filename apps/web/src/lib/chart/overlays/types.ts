import type { UTCTimestamp } from "lightweight-charts";

export interface OverlayHandle {
  remove(): void;
}

export type TS = UTCTimestamp;

export function t(time: number): TS {
  return time as TS;
}
