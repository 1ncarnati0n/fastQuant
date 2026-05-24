export interface CrosshairValues {
  time: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  close: number | null;
  volume: number | null;
  rsi: number | null;
  macd: number | null;
  signal: number | null;
  histogram: number | null;
  stochK: number | null;
  stochD: number | null;
  obv: number | null;
  atr: number | null;
  adx: number | null;
  mfi: number | null;
  cvd: number | null;
}

function createCrosshair() {
  let values = $state<CrosshairValues>({
    time: null, open: null, high: null, low: null, close: null, volume: null,
    rsi: null, macd: null, signal: null, histogram: null,
    stochK: null, stochD: null, obv: null, atr: null,
    adx: null, mfi: null, cvd: null,
  });

  return {
    get values() { return values; },
    update(next: Partial<CrosshairValues>) {
      values = { ...values, ...next };
    },
    clear() {
      values = {
        time: null, open: null, high: null, low: null, close: null, volume: null,
        rsi: null, macd: null, signal: null, histogram: null,
        stochK: null, stochD: null, obv: null, atr: null,
        adx: null, mfi: null, cvd: null,
      };
    },
  };
}

export const crosshair = createCrosshair();
