from fastapi import APIRouter

from app.models.market import (
    AnalysisParams,
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
)
from app.services.market_data import yahoo
from app.services.strategy.orb import scan_orb
from app.services.strategy.strategy_a import run_strategy_a_backtest
from app.services.strategy.strategy_b import analyze_pair_trading, scan_macd_bb

router = APIRouter()


@router.post("/macd-bb-scan", response_model=list[MacdBbSignal])
async def scan_macd_bb_signals(params: AnalysisParams) -> list[MacdBbSignal]:
    return await scan_macd_bb(params)


@router.post("/strategy-a/backtest", response_model=StrategyABacktestResult)
async def run_strategy_a(params: StrategyABacktestParams) -> StrategyABacktestResult:
    return await run_strategy_a_backtest(
        config=params.config,
        interval=params.interval,
        limit=params.limit,
    )


@router.post("/pair-trading", response_model=PairTradingResult)
async def run_pair_trading(params: PairTradingParams) -> PairTradingResult:
    return await analyze_pair_trading(
        pair_a=params.pair_a,
        pair_b=params.pair_b,
        interval=params.interval,
        limit=params.limit,
    )


@router.post("/orb-scan", response_model=OrbScanResponse)
async def run_orb_scan(params: OrbScanParams) -> OrbScanResponse:
    return await scan_orb(
        symbols=params.symbols,
        config=params.config,
        interval=params.interval,
        limit=params.limit,
    )


@router.post("/multi-symbol-candles", response_model=MultiSymbolCandlesResponse)
async def fetch_multi_symbol_candles(
    params: MultiSymbolCandlesParams,
) -> MultiSymbolCandlesResponse:
    interval = "1mo" if params.interval in {"1mo", "1M"} else params.interval
    yahoo_interval = {"1mo": "1M", "1wk": "1w"}.get(interval, interval)
    data = {}
    errors = {}
    limit = max(50, min(params.limit, 600))
    for symbol in params.symbols[:30]:
        normalized = symbol.upper()
        try:
            data[normalized] = await yahoo.fetch_klines(normalized, yahoo_interval, limit)
        except Exception as error:
            errors[normalized] = str(error)
    return MultiSymbolCandlesResponse(
        data=data,
        errors=errors,
    )


@router.post("/premarket-snapshots", response_model=list[PremarketSnapshot])
async def fetch_premarket_snapshots(
    params: PremarketSnapshotParams,
) -> list[PremarketSnapshot]:
    snapshots = []
    for symbol in params.symbols[:30]:
        normalized = symbol.upper()
        try:
            snapshots.append(await yahoo.fetch_premarket(normalized))
        except Exception:
            snapshots.append(PremarketSnapshot(symbol=normalized))
    return snapshots
