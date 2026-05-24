export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type MarketType = "crypto" | "usStock" | "krStock" | "forex";
export type DataSource = "binance" | "yahoo" | "kis";

export interface PointValue {
  time: number;
  value: number;
}

export interface PeriodPointValueResult {
  period: number;
  data: PointValue[];
}

export interface ChannelPoint {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export interface DonchianResult {
  period: number;
  data: ChannelPoint[];
}

export interface KeltnerResult {
  emaPeriod: number;
  atrPeriod: number;
  atrMultiplier: number;
  data: ChannelPoint[];
}

export interface StochasticResult {
  data: Array<{ time: number; k: number; d: number }>;
}

export interface AdxResult {
  period: number;
  data: Array<{ time: number; adx: number; plusDi: number; minusDi: number }>;
}

export interface IchimokuResult {
  data: Array<{
    time: number;
    conversion: number | null;
    base: number | null;
    spanA: number | null;
    spanB: number | null;
    lagging: number | null;
  }>;
}

export interface SupertrendResult {
  period: number;
  multiplier: number;
  data: Array<{ time: number; value: number; direction: number }>;
}

export interface ParabolicSarResult {
  step: number;
  maxStep: number;
  data: PointValue[];
}

export interface StcResult {
  tcLen: number;
  fastMa: number;
  slowMa: number;
  data: PointValue[];
}

export interface SmcResult {
  data: Array<{
    time: number;
    eventType: string;
    price: number;
    swingTime: number;
    swingPrice: number;
  }>;
}

export interface AutoFibResult {
  highTime: number;
  highPrice: number;
  lowTime: number;
  lowPrice: number;
  isUptrend: boolean;
  levels: Array<{ ratio: number; price: number }>;
}

export interface AnalysisParams {
  symbol: string;
  interval: string;
  bbPeriod: number;
  bbMultiplier: number;
  rsiPeriod: number;
  showBollingerBands?: boolean;
  showRsi?: boolean;
  showVolume?: boolean;
  showVolumeProfile?: boolean;
  showVwap?: boolean;
  showAtr?: boolean;
  showIchimoku?: boolean;
  showSupertrend?: boolean;
  showParabolicSar?: boolean;
  market: MarketType;
  smaPeriods: number[];
  emaPeriods: number[];
  hmaPeriods?: number[];
  macd: Record<string, unknown> | null;
  stochastic: Record<string, unknown> | null;
  showObv: boolean;
  showCvd?: boolean;
  donchian?: Record<string, unknown> | null;
  keltner?: Record<string, unknown> | null;
  mfi?: Record<string, unknown> | null;
  cmf?: Record<string, unknown> | null;
  choppiness?: Record<string, unknown> | null;
  williamsR?: Record<string, unknown> | null;
  adx?: Record<string, unknown> | null;
  stc?: Record<string, unknown> | null;
  smc?: Record<string, unknown> | null;
  anchoredVwap?: Record<string, unknown> | null;
  autoFib?: Record<string, unknown> | null;
  signalStrategies: Record<string, unknown>;
}

export interface AnalysisResponse {
  candles: Candle[];
  bollingerBands: Array<{ time: number; upper: number; middle: number; lower: number }>;
  rsi: Array<{ time: number; value: number }>;
  signals: Array<{ time: number; signalType: string; price: number; rsi: number; source: string }>;
  sma: Array<{ period: number; data: Array<{ time: number; value: number }> }>;
  ema: Array<{ period: number; data: Array<{ time: number; value: number }> }>;
  hma: Array<{ period: number; data: Array<{ time: number; value: number }> }>;
  macd?: {
    data: Array<{ time: number; macd: number; signal: number; histogram: number }>;
  } | null;
  stochastic?: StochasticResult | null;
  obv?: { data: PointValue[] } | null;
  vwap?: { data: PointValue[] } | null;
  atr?: PeriodPointValueResult | null;
  ichimoku?: IchimokuResult | null;
  supertrend?: SupertrendResult | null;
  parabolicSar?: ParabolicSarResult | null;
  donchian?: DonchianResult | null;
  keltner?: KeltnerResult | null;
  mfi?: PeriodPointValueResult | null;
  cmf?: PeriodPointValueResult | null;
  choppiness?: PeriodPointValueResult | null;
  williamsR?: PeriodPointValueResult | null;
  adx?: AdxResult | null;
  cvd?: { data: PointValue[] } | null;
  stc?: StcResult | null;
  smc?: SmcResult | null;
  anchoredVwap?: { data: PointValue[] } | null;
  autoFib?: AutoFibResult | null;
  symbol: string;
  interval: string;
  dataSource: DataSource;
  sourceInterval: string;
}

export interface HealthResponse {
  status: string;
  service: string;
}

export interface WatchlistItemRequest {
  symbol: string;
  market: MarketType;
}

export interface WatchlistSnapshotParams {
  items: WatchlistItemRequest[];
  interval: string;
  limit?: number;
}

export interface WatchlistSnapshot {
  symbol: string;
  market: MarketType;
  lastPrice: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  sparkline: number[];
  dataSource: DataSource;
  sourceInterval: string;
}

export interface SymbolSearchResult {
  symbol: string;
  label: string;
  market: MarketType;
  exchange: string;
}

export interface MacdBbSignal {
  time: number;
  direction: "buy" | "sell";
  price: number;
  confidence: "strong" | "normal";
  conditions: string[];
}

export interface PairTradingParams {
  pairA: string;
  pairB: string;
  interval: string;
  limit: number;
}

export interface PairTradingResult {
  pairA: string;
  pairB: string;
  beta: number;
  alpha: number;
  adfStatistic: number;
  isCointegrated: boolean;
  halfLife: number | null;
  zScores: PointValue[];
  currentZScore: number;
  signal: "long" | "short" | "close" | "stoploss" | "none";
}

export interface OrbConfig {
  rangeMinutes: number;
  useVwapFilter: boolean;
  rvolThreshold: number;
  premarketChangeThreshold: number;
}

export interface OrbSignal {
  symbol: string;
  direction: "long" | "short";
  entry: number;
  target1: number;
  target2: number;
  stop: number;
  rangeHigh: number;
  rangeLow: number;
  time: number;
}

export interface PremarketStock {
  symbol: string;
  prePrice: number;
  preChange: number;
  preVolume: number;
  normalVolume: number;
  rVol: number;
  hasCatalyst: boolean;
}

export interface OrbScanParams {
  symbols: string[];
  config: OrbConfig;
  interval: string;
  limit: number;
}

export interface OrbScanResponse {
  signals: OrbSignal[];
  stocksInPlay: PremarketStock[];
  errors: Record<string, string>;
}

export interface PremarketSnapshot {
  symbol: string;
  preMarketPrice?: number | null;
  preMarketChange?: number | null;
  preMarketVolume?: number | null;
  regularMarketPrice?: number | null;
  regularMarketVolume?: number | null;
}

export interface PremarketSnapshotParams {
  symbols: string[];
}

export interface MultiSymbolCandlesParams {
  symbols: string[];
  interval: string;
  limit: number;
}

export interface MultiSymbolCandlesResponse {
  data: Record<string, Candle[]>;
  errors: Record<string, string>;
}

export interface FundamentalsParams {
  symbol: string;
  market: MarketType;
}

export interface FundamentalsResponse {
  symbol: string;
  market: MarketType;
  shortName?: string | null;
  currency?: string | null;
  marketCap?: number | null;
  trailingPe?: number | null;
  forwardPe?: number | null;
  priceToBook?: number | null;
  trailingEps?: number | null;
  forwardEps?: number | null;
  dividendYield?: number | null;
  returnOnEquity?: number | null;
  debtToEquity?: number | null;
  revenueGrowth?: number | null;
  grossMargins?: number | null;
  operatingMargins?: number | null;
  profitMargins?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  averageVolume?: number | null;
}

export interface StrategyAConfig {
  startYear: number;
  initialCapital: number;
  gemWeight: number;
  taaWeight: number;
  sectorWeight: number;
}

export interface StrategyABacktestParams {
  config: StrategyAConfig;
  interval: string;
  limit: number;
}

export interface StrategyABacktestResult {
  equityCurve: PointValue[];
  trades: Array<{
    month: string;
    gemAsset: string;
    taaAssets: string[];
    sectorAssets: string[];
    portfolioReturn: number;
    cumulativeReturn: number;
  }>;
  cagr: number;
  sharpe: number;
  maxDrawdown: number;
  winRate: number;
  calmar: number;
  totalReturn: number;
  currentAllocation: {
    gem: { asset: string; weight: number };
    taa: Array<{ asset: string; invested: boolean; weight: number }>;
    sectors: Array<{ asset: string; rank: number; weight: number }>;
  } | null;
  errors: Record<string, string>;
}
