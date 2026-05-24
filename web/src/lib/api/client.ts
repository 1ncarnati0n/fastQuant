import { ApiError } from "./errors";
import type {
  AnalysisParams,
  AnalysisResponse,
  FundamentalsParams,
  FundamentalsResponse,
  HealthResponse,
  MacdBbSignal,
  MultiSymbolCandlesParams,
  MultiSymbolCandlesResponse,
  OrbScanParams,
  OrbScanResponse,
  PairTradingParams,
  PairTradingResult,
  PremarketSnapshot,
  PremarketSnapshotParams,
  StrategyABacktestParams,
  StrategyABacktestResult,
  SymbolSearchResult,
  WatchlistSnapshot,
  WatchlistSnapshotParams,
} from "./types";

const API_BASE = import.meta.env.VITE_FASTQUANT_API_URL ?? "http://localhost:8000";
const MAX_RETRIES = 1;
const CLIENT_ONLY_ANALYSIS_KEYS = new Set([
  "showBollingerBands",
  "showRsi",
  "showVolume",
  "showVolumeProfile",
  "showVwap",
  "showAtr",
  "showIchimoku",
  "showSupertrend",
  "showParabolicSar",
]);

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const url = `${API_BASE}${path}`;
  const headers = { "content-type": "application/json", ...init?.headers };

  let lastError: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, { ...init, headers });

      if (!res.ok) {
        let body: {
          error?: { code?: string; message?: string; details?: unknown };
          detail?: string;
        } = {};
        try {
          body = (await res.json()) as typeof body;
        } catch {
          /* ignore */
        }
        const code = body.error?.code ?? "request_failed";
        const message = body.error?.message ?? body.detail ?? `HTTP ${res.status}`;
        throw new ApiError(code, message, res.status, body.error?.details);
      }

      try {
        return (await res.json()) as T;
      } catch {
        throw new ApiError("invalid_response", "Invalid JSON from server", res.status);
      }
    } catch (err) {
      // ApiError means the server responded with an HTTP error — don't retry;
      // backend 5xx on upstream failures (Yahoo, Binance) won't self-heal in ~200ms.
      // Only retry on network/fetch failures (TypeError from fetch, connection reset, etc.).
      if (err instanceof ApiError) throw err;
      if ((err as Error)?.name === "AbortError") throw err;
      lastError = err;
      if (attempt < MAX_RETRIES) await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
    }
  }
  throw lastError;
}

export function fetchHealth(): Promise<HealthResponse> {
  return request<HealthResponse>("/health");
}

export function fetchAnalysis(params: AnalysisParams): Promise<AnalysisResponse> {
  return request<AnalysisResponse>("/api/analysis", {
    method: "POST",
    body: JSON.stringify(toServerAnalysisParams(params)),
  });
}

export function fetchWatchlistSnapshots(
  params: WatchlistSnapshotParams,
): Promise<WatchlistSnapshot[]> {
  return request<WatchlistSnapshot[]>("/api/watchlist/snapshots", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function searchSymbols(
  query: string,
  marketFilter?: string | null,
): Promise<SymbolSearchResult[]> {
  const p = new URLSearchParams({ query });
  if (marketFilter) p.set("marketFilter", marketFilter);
  return request<SymbolSearchResult[]>(`/api/search/symbols?${p.toString()}`);
}

export function scanMacdBbSignals(params: AnalysisParams): Promise<MacdBbSignal[]> {
  return request<MacdBbSignal[]>("/api/strategy/macd-bb-scan", {
    method: "POST",
    body: JSON.stringify(toServerAnalysisParams(params)),
  });
}

function toServerAnalysisParams(params: AnalysisParams): AnalysisParams {
  const payload = { ...params } as Record<string, unknown>;
  for (const key of CLIENT_ONLY_ANALYSIS_KEYS) delete payload[key];
  return payload as unknown as AnalysisParams;
}

export function runStrategyABacktest(
  params: StrategyABacktestParams,
): Promise<StrategyABacktestResult> {
  return request<StrategyABacktestResult>("/api/strategy/strategy-a/backtest", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function analyzePairTrading(params: PairTradingParams): Promise<PairTradingResult> {
  return request<PairTradingResult>("/api/strategy/pair-trading", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function scanOrb(params: OrbScanParams): Promise<OrbScanResponse> {
  return request<OrbScanResponse>("/api/strategy/orb-scan", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function fetchFundamentals(params: FundamentalsParams): Promise<FundamentalsResponse> {
  return request<FundamentalsResponse>("/api/fundamentals", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function fetchPremarketSnapshots(
  params: PremarketSnapshotParams,
): Promise<PremarketSnapshot[]> {
  return request<PremarketSnapshot[]>("/api/strategy/premarket-snapshots", {
    method: "POST",
    body: JSON.stringify(params),
  });
}

export function fetchMultiSymbolCandles(
  params: MultiSymbolCandlesParams,
): Promise<MultiSymbolCandlesResponse> {
  return request<MultiSymbolCandlesResponse>("/api/strategy/multi-symbol-candles", {
    method: "POST",
    body: JSON.stringify(params),
  });
}
