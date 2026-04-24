import { analyzePairTrading, runStrategyABacktest, scanMacdBbSignals, scanOrb } from "$lib/api/client";
import { defaultAnalysisParams } from "$lib/api/defaults";
import type {
  MacdBbSignal,
  OrbScanResponse,
  PairTradingResult,
  StrategyABacktestResult,
} from "$lib/api/types";

export type StrategyLabTab = "A" | "B" | "ORB";

export const STRATEGY_LAB_TABS: { id: StrategyLabTab; label: string; sub: string }[] = [
  { id: "A",   label: "Strategy A", sub: "GEM · TAA · Sector" },
  { id: "B",   label: "Strategy B", sub: "MACD/BB · Pair" },
  { id: "ORB", label: "ORB Scan",   sub: "Opening Range" },
];

export function createStrategyLabPageController() {
  let activeTab = $state<StrategyLabTab>("A");
  let loading = $state(false);
  let error = $state<string | null>(null);
  let resultA = $state<StrategyABacktestResult | null>(null);
  let macdSignals = $state<MacdBbSignal[]>([]);
  let pairResult = $state<PairTradingResult | null>(null);
  let orbResult = $state<OrbScanResponse | null>(null);
  let pairA = $state("SPY");
  let pairB = $state("QQQ");
  let orbSymbols = $state("AAPL,TSLA,NVDA,AMD");

  const pairSignalColor = $derived.by(() => {
    if (!pairResult) return "neutral" as const;
    const z = pairResult.currentZScore;
    if (z > 1.5) return "sell" as const;
    if (z < -1.5) return "buy" as const;
    return "neutral" as const;
  });

  async function withRun<T>(fallbackMessage: string, task: () => Promise<T>, apply: (result: T) => void) {
    loading = true;
    error = null;
    try {
      apply(await task());
    } catch (caught) {
      error = caught instanceof Error ? caught.message : fallbackMessage;
    } finally {
      loading = false;
    }
  }

  function runA() {
    return withRun(
      "Strategy A 실행 실패",
      () => runStrategyABacktest({
        config: { startYear: 2012, initialCapital: 100000, gemWeight: 0.4, taaWeight: 0.4, sectorWeight: 0.2 },
        interval: "1M",
        limit: 360,
      }),
      (result) => {
        resultA = result;
      },
    );
  }

  function runMacdBb() {
    return withRun(
      "MACD/BB scan 실패",
      () => scanMacdBbSignals({
        ...defaultAnalysisParams,
        symbol: "BTCUSDT",
        market: "crypto",
        macd: { fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 },
        showObv: true,
      }),
      (result) => {
        macdSignals = result;
      },
    );
  }

  function runPair() {
    return withRun(
      "Pair trading 분석 실패",
      () => analyzePairTrading({ pairA, pairB, interval: "1d", limit: 500 }),
      (result) => {
        pairResult = result;
      },
    );
  }

  function runOrb() {
    return withRun(
      "ORB scan 실패",
      () => scanOrb({
        symbols: orbSymbols.split(",").map((s) => s.trim()).filter(Boolean),
        config: { rangeMinutes: 30, useVwapFilter: true, rvolThreshold: 2, premarketChangeThreshold: 2 },
        interval: "1m",
        limit: 240,
      }),
      (result) => {
        orbResult = result;
      },
    );
  }

  return {
    tabs: STRATEGY_LAB_TABS,
    get activeTab() {
      return activeTab;
    },
    set activeTab(next: StrategyLabTab) {
      activeTab = next;
    },
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
    get resultA() {
      return resultA;
    },
    get macdSignals() {
      return macdSignals;
    },
    get pairResult() {
      return pairResult;
    },
    get orbResult() {
      return orbResult;
    },
    get pairA() {
      return pairA;
    },
    set pairA(next: string) {
      pairA = next.toUpperCase();
    },
    get pairB() {
      return pairB;
    },
    set pairB(next: string) {
      pairB = next.toUpperCase();
    },
    get orbSymbols() {
      return orbSymbols;
    },
    set orbSymbols(next: string) {
      orbSymbols = next.toUpperCase();
    },
    get pairSignalColor() {
      return pairSignalColor;
    },
    runA,
    runMacdBb,
    runPair,
    runOrb,
  };
}
