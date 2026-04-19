from typing import Literal

from app.models.base import ApiModel

MarketType = Literal["crypto", "usStock", "krStock", "forex"]
DataSource = Literal["binance", "yahoo", "kis"]


class Candle(ApiModel):
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float


class PointValue(ApiModel):
    time: int
    value: float


class BollingerBandsPoint(ApiModel):
    time: int
    upper: float
    middle: float
    lower: float


class RsiPoint(ApiModel):
    time: int
    value: float


class MovingAverageResult(ApiModel):
    period: int
    data: list[PointValue]


class MacdPoint(ApiModel):
    time: int
    macd: float
    signal: float
    histogram: float


class MacdResult(ApiModel):
    data: list[MacdPoint]


class StochasticPoint(ApiModel):
    time: int
    k: float
    d: float


class StochasticResult(ApiModel):
    data: list[StochasticPoint]


class PointValueResult(ApiModel):
    data: list[PointValue]


class PeriodPointValueResult(ApiModel):
    period: int
    data: list[PointValue]


class ChannelPoint(ApiModel):
    time: int
    upper: float
    middle: float
    lower: float


class DonchianResult(ApiModel):
    period: int
    data: list[ChannelPoint]


class KeltnerResult(ApiModel):
    ema_period: int
    atr_period: int
    atr_multiplier: float
    data: list[ChannelPoint]


class AdxPoint(ApiModel):
    time: int
    adx: float
    plus_di: float
    minus_di: float


class AdxResult(ApiModel):
    period: int
    data: list[AdxPoint]


class IchimokuPoint(ApiModel):
    time: int
    conversion: float | None = None
    base: float | None = None
    span_a: float | None = None
    span_b: float | None = None
    lagging: float | None = None


class IchimokuResult(ApiModel):
    data: list[IchimokuPoint]


class SupertrendPoint(ApiModel):
    time: int
    value: float
    direction: int


class SupertrendResult(ApiModel):
    period: int
    multiplier: float
    data: list[SupertrendPoint]


class ParabolicSarPoint(ApiModel):
    time: int
    value: float


class ParabolicSarResult(ApiModel):
    step: float
    max_step: float
    data: list[ParabolicSarPoint]


class StcResult(ApiModel):
    tc_len: int
    fast_ma: int
    slow_ma: int
    data: list[PointValue]


class SmcEvent(ApiModel):
    time: int
    event_type: str
    price: float
    swing_time: int
    swing_price: float


class SmcResult(ApiModel):
    data: list[SmcEvent]


class AutoFibLevel(ApiModel):
    ratio: float
    price: float


class AutoFibResult(ApiModel):
    high_time: int
    high_price: float
    low_time: int
    low_price: float
    is_uptrend: bool
    levels: list[AutoFibLevel]


class SignalPoint(ApiModel):
    time: int
    signal_type: str
    price: float
    rsi: float
    source: str


class AnalysisParams(ApiModel):
    symbol: str
    interval: str
    bb_period: int
    bb_multiplier: float
    rsi_period: int
    market: MarketType
    sma_periods: list[int] = []
    ema_periods: list[int] = []
    hma_periods: list[int] = []
    macd: dict | None = None
    stochastic: dict | None = None
    show_obv: bool = False
    show_cvd: bool = False
    donchian: dict | None = None
    keltner: dict | None = None
    mfi: dict | None = None
    cmf: dict | None = None
    choppiness: dict | None = None
    williams_r: dict | None = None
    adx: dict | None = None
    stc: dict | None = None
    smc: dict | None = None
    anchored_vwap: dict | None = None
    auto_fib: dict | None = None
    signal_strategies: dict


class AnalysisResponse(ApiModel):
    candles: list[Candle]
    bollinger_bands: list[BollingerBandsPoint]
    rsi: list[RsiPoint]
    signals: list[SignalPoint]
    sma: list[MovingAverageResult]
    ema: list[MovingAverageResult]
    hma: list[MovingAverageResult]
    macd: MacdResult | None = None
    stochastic: StochasticResult | None = None
    obv: PointValueResult | None = None
    vwap: PointValueResult | None = None
    atr: PeriodPointValueResult | None = None
    ichimoku: IchimokuResult | None = None
    supertrend: SupertrendResult | None = None
    parabolic_sar: ParabolicSarResult | None = None
    donchian: DonchianResult | None = None
    keltner: KeltnerResult | None = None
    mfi: PeriodPointValueResult | None = None
    cmf: PeriodPointValueResult | None = None
    choppiness: PeriodPointValueResult | None = None
    williams_r: PeriodPointValueResult | None = None
    adx: AdxResult | None = None
    cvd: PointValueResult | None = None
    stc: StcResult | None = None
    smc: SmcResult | None = None
    anchored_vwap: PointValueResult | None = None
    auto_fib: AutoFibResult | None = None
    symbol: str
    interval: str
    data_source: DataSource
    source_interval: str


class FundamentalsParams(ApiModel):
    symbol: str
    market: MarketType


class FundamentalsResponse(ApiModel):
    symbol: str
    market: MarketType
    short_name: str | None = None
    currency: str | None = None
    market_cap: float | None = None
    trailing_pe: float | None = None
    forward_pe: float | None = None
    price_to_book: float | None = None
    trailing_eps: float | None = None
    forward_eps: float | None = None
    dividend_yield: float | None = None
    return_on_equity: float | None = None
    debt_to_equity: float | None = None
    revenue_growth: float | None = None
    gross_margins: float | None = None
    operating_margins: float | None = None
    profit_margins: float | None = None
    fifty_two_week_high: float | None = None
    fifty_two_week_low: float | None = None
    average_volume: float | None = None


class MultiSymbolCandlesParams(ApiModel):
    symbols: list[str]
    interval: str
    limit: int


class MultiSymbolCandlesResponse(ApiModel):
    data: dict[str, list[Candle]]
    errors: dict[str, str]


class PremarketSnapshotParams(ApiModel):
    symbols: list[str]


class PremarketSnapshot(ApiModel):
    symbol: str
    pre_market_price: float | None = None
    pre_market_change: float | None = None
    pre_market_volume: float | None = None
    regular_market_price: float | None = None
    regular_market_volume: float | None = None


class OrbConfig(ApiModel):
    range_minutes: int = 30
    use_vwap_filter: bool = True
    rvol_threshold: float = 2.0
    premarket_change_threshold: float = 2.0


class PremarketStock(ApiModel):
    symbol: str
    pre_price: float
    pre_change: float
    pre_volume: float
    normal_volume: float
    r_vol: float
    has_catalyst: bool = False


class OrbSignal(ApiModel):
    symbol: str
    direction: Literal["long", "short"]
    entry: float
    target1: float
    target2: float
    stop: float
    range_high: float
    range_low: float
    time: int


class OrbScanParams(ApiModel):
    symbols: list[str]
    config: OrbConfig = OrbConfig()
    interval: str = "1m"
    limit: int = 240


class OrbScanResponse(ApiModel):
    signals: list[OrbSignal]
    stocks_in_play: list[PremarketStock]
    errors: dict[str, str]


class StrategyAConfig(ApiModel):
    start_year: int = 2005
    initial_capital: float = 100_000
    gem_weight: float = 0.4
    taa_weight: float = 0.4
    sector_weight: float = 0.2


class StrategyABacktestParams(ApiModel):
    config: StrategyAConfig = StrategyAConfig()
    interval: str = "1M"
    limit: int = 360


class EquityPoint(ApiModel):
    time: int
    value: float


class TradeRecord(ApiModel):
    month: str
    gem_asset: str
    taa_assets: list[str]
    sector_assets: list[str]
    portfolio_return: float
    cumulative_return: float


class StrategyAGemAllocation(ApiModel):
    asset: str
    weight: float


class StrategyATaaAllocation(ApiModel):
    asset: str
    invested: bool
    weight: float


class StrategyASectorAllocation(ApiModel):
    asset: str
    rank: int
    weight: float


class StrategyACurrentAllocation(ApiModel):
    gem: StrategyAGemAllocation
    taa: list[StrategyATaaAllocation]
    sectors: list[StrategyASectorAllocation]


class StrategyABacktestResult(ApiModel):
    equity_curve: list[EquityPoint]
    trades: list[TradeRecord]
    cagr: float
    sharpe: float
    max_drawdown: float
    win_rate: float
    calmar: float
    total_return: float
    current_allocation: StrategyACurrentAllocation | None = None
    errors: dict[str, str] = {}


class MacdBbSignal(ApiModel):
    time: int
    direction: Literal["buy", "sell"]
    price: float
    confidence: Literal["strong", "normal"]
    conditions: list[str]


class PairTradingParams(ApiModel):
    pair_a: str
    pair_b: str
    interval: str = "1d"
    limit: int = 500


class ZScorePoint(ApiModel):
    time: int
    value: float


class PairTradingResult(ApiModel):
    pair_a: str
    pair_b: str
    beta: float
    alpha: float
    adf_statistic: float
    is_cointegrated: bool
    half_life: float | None
    z_scores: list[ZScorePoint]
    current_z_score: float
    signal: Literal["long", "short", "close", "stoploss", "none"]


class WatchlistItemRequest(ApiModel):
    symbol: str
    market: MarketType


class WatchlistSnapshotParams(ApiModel):
    items: list[WatchlistItemRequest]
    interval: str
    limit: int | None = None


class WatchlistSnapshot(ApiModel):
    symbol: str
    market: MarketType
    last_price: float
    change: float
    change_pct: float
    high: float
    low: float
    sparkline: list[float]
    data_source: DataSource
    source_interval: str


class SymbolSearchResult(ApiModel):
    symbol: str
    label: str
    market: MarketType
    exchange: str
