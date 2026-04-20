import type { AnalysisResponse } from "$lib/api/types";

function filterByTime<T extends { time: number }>(arr: readonly T[] | undefined, cutoff: number): T[] {
  if (!arr) return [] as T[];
  return arr.filter((x) => x.time <= cutoff);
}

/**
 * Produces a trimmed copy of an analysis response suitable for bar replay.
 * All time-series arrays are filtered to <= cutoffTime.
 * `autoFib` is kept whole since it represents a swing computed from the full context.
 */
export function sliceAnalysisAt(
  analysis: AnalysisResponse,
  currentIndex: number,
): AnalysisResponse {
  if (currentIndex >= analysis.candles.length - 1) return analysis;
  const cutoff = analysis.candles[currentIndex]?.time;
  if (cutoff === undefined) return analysis;

  const keepPeriod = <T extends { data: Array<{ time: number }> }>(obj: T | null | undefined) =>
    obj ? ({ ...obj, data: filterByTime(obj.data, cutoff) } as T) : obj ?? null;

  return {
    ...analysis,
    candles: analysis.candles.slice(0, currentIndex + 1),
    bollingerBands: filterByTime(analysis.bollingerBands, cutoff),
    rsi: filterByTime(analysis.rsi, cutoff),
    signals: filterByTime(analysis.signals, cutoff),
    sma: analysis.sma.map((s) => ({ ...s, data: filterByTime(s.data, cutoff) })),
    ema: analysis.ema.map((s) => ({ ...s, data: filterByTime(s.data, cutoff) })),
    hma: analysis.hma.map((s) => ({ ...s, data: filterByTime(s.data, cutoff) })),
    macd: keepPeriod(analysis.macd ?? null),
    stochastic: keepPeriod(analysis.stochastic ?? null),
    obv: keepPeriod(analysis.obv ?? null),
    vwap: keepPeriod(analysis.vwap ?? null),
    atr: keepPeriod(analysis.atr ?? null),
    ichimoku: keepPeriod(analysis.ichimoku ?? null),
    supertrend: keepPeriod(analysis.supertrend ?? null),
    parabolicSar: keepPeriod(analysis.parabolicSar ?? null),
    donchian: keepPeriod(analysis.donchian ?? null),
    keltner: keepPeriod(analysis.keltner ?? null),
    mfi: keepPeriod(analysis.mfi ?? null),
    cmf: keepPeriod(analysis.cmf ?? null),
    choppiness: keepPeriod(analysis.choppiness ?? null),
    williamsR: keepPeriod(analysis.williamsR ?? null),
    adx: keepPeriod(analysis.adx ?? null),
    cvd: keepPeriod(analysis.cvd ?? null),
    stc: keepPeriod(analysis.stc ?? null),
    smc: keepPeriod(analysis.smc ?? null),
    anchoredVwap: keepPeriod(analysis.anchoredVwap ?? null),
    autoFib: analysis.autoFib ?? null,
  };
}
