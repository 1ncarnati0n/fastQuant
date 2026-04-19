import math
from datetime import UTC, datetime

from app.models.market import (
    Candle,
    EquityPoint,
    StrategyABacktestResult,
    StrategyACurrentAllocation,
    StrategyAGemAllocation,
    StrategyASectorAllocation,
    StrategyATaaAllocation,
    StrategyAConfig,
    TradeRecord,
)
from app.services.market_data.service import fetch_market_candles

STRATEGY_A_SYMBOLS = [
    "SPY",
    "VEU",
    "AGG",
    "BIL",
    "EFA",
    "IEF",
    "VNQ",
    "GLD",
    "XLK",
    "XLV",
    "XLF",
    "XLE",
    "XLY",
    "XLI",
    "XLU",
    "XLRE",
    "XLB",
    "XLC",
    "XLP",
]
TAA_ASSETS = ["SPY", "EFA", "IEF", "VNQ", "GLD"]
SECTOR_ETFS = ["XLK", "XLV", "XLF", "XLE", "XLY", "XLI", "XLU", "XLRE", "XLB", "XLC", "XLP"]
TOP_SECTORS_COUNT = 3


async def run_strategy_a_backtest(
    config: StrategyAConfig,
    interval: str = "1M",
    limit: int = 360,
) -> StrategyABacktestResult:
    all_candles: dict[str, list[Candle]] = {}
    errors: dict[str, str] = {}

    for symbol in STRATEGY_A_SYMBOLS:
        try:
            candles, _, _ = await fetch_market_candles(
                symbol=symbol,
                interval=interval,
                market="usStock",
                output_limit=max(60, min(limit, 600)),
            )
            all_candles[symbol] = candles
        except Exception as error:
            errors[symbol] = str(error)

    result = run_backtest(all_candles, config)
    return result.model_copy(update={"errors": errors})


def run_backtest(
    all_candles: dict[str, list[Candle]],
    config: StrategyAConfig,
) -> StrategyABacktestResult:
    spy_candles = all_candles.get("SPY", [])
    veu_candles = all_candles.get("VEU", [])
    start_timestamp = int(datetime(config.start_year, 1, 1, tzinfo=UTC).timestamp())
    start_index = next(
        (index for index, candle in enumerate(spy_candles) if candle.time >= start_timestamp), -1
    )
    if start_index < 0 or start_index < 12:
        return empty_result()

    equity = config.initial_capital
    equity_curve: list[EquityPoint] = []
    trades: list[TradeRecord] = []
    monthly_returns: list[float] = []

    for index in range(max(start_index, 12), len(spy_candles)):
        month_return = 0.0

        gem = compute_gem_signal_at_index(spy_candles, veu_candles, index)
        gem_candles = all_candles.get(gem["asset"], [])
        gem_return = period_return(gem_candles, index)
        month_return += gem_return * config.gem_weight

        taa_signals = compute_taa_at_index(all_candles, index)
        taa_return = 0.0
        for signal in taa_signals:
            if signal["invested"]:
                taa_return += signal["return_pct"] * (config.taa_weight / len(TAA_ASSETS))
        month_return += taa_return

        sectors = compute_sector_at_index(all_candles, index)
        sector_return = 0.0
        for signal in sectors:
            if signal["selected"]:
                sector_return += signal["return_pct"] * (config.sector_weight / TOP_SECTORS_COUNT)
        month_return += sector_return

        equity *= 1 + month_return
        monthly_returns.append(month_return)
        time_value = spy_candles[index].time
        equity_curve.append(EquityPoint(time=time_value, value=equity))
        trades.append(
            TradeRecord(
                month=datetime.fromtimestamp(time_value, UTC).strftime("%Y-%m"),
                gem_asset=gem["asset"],
                taa_assets=[signal["asset"] for signal in taa_signals if signal["invested"]],
                sector_assets=[signal["asset"] for signal in sectors if signal["selected"]],
                portfolio_return=month_return,
                cumulative_return=(equity - config.initial_capital) / config.initial_capital,
            )
        )

    if not equity_curve:
        return empty_result()

    first_time = spy_candles[max(start_index, 12) - 1].time
    equity_curve.insert(0, EquityPoint(time=first_time, value=config.initial_capital))
    cagr = compute_cagr(equity_curve)
    max_drawdown = compute_max_drawdown(equity_curve)

    return StrategyABacktestResult(
        equity_curve=equity_curve,
        trades=trades,
        cagr=cagr,
        sharpe=compute_sharpe(monthly_returns),
        max_drawdown=max_drawdown,
        win_rate=compute_win_rate(monthly_returns),
        calmar=compute_calmar(cagr, max_drawdown),
        total_return=compute_total_return(equity_curve),
        current_allocation=current_allocation(all_candles, config),
    )


def compute_gem_signal_at_index(
    spy_candles: list[Candle],
    veu_candles: list[Candle],
    index: int,
) -> dict[str, float | str]:
    if index < 12:
        return {"asset": "AGG", "spy_ret": 0.0, "veu_ret": 0.0}

    spy_ret = trailing_return(spy_candles, index, 12)
    veu_ret = trailing_return(veu_candles, index, 12)
    if spy_ret < 0 and veu_ret < 0:
        return {"asset": "AGG", "spy_ret": spy_ret, "veu_ret": veu_ret}
    if spy_ret >= veu_ret:
        return {"asset": "SPY", "spy_ret": spy_ret, "veu_ret": veu_ret}
    return {"asset": "VEU", "spy_ret": spy_ret, "veu_ret": veu_ret}


def compute_taa_at_index(
    all_candles: dict[str, list[Candle]],
    index: int,
) -> list[dict[str, float | bool | str]]:
    signals = []
    for asset in TAA_ASSETS:
        candles = all_candles.get(asset)
        if not candles or index < 10:
            signals.append({"asset": asset, "invested": False, "return_pct": 0.0})
            continue
        price = candles[index].close if index < len(candles) else 0.0
        sma_value = sma(candles, 10, index)
        invested = sma_value is not None and price > sma_value
        signals.append(
            {"asset": asset, "invested": invested, "return_pct": period_return(candles, index)}
        )
    return signals


def compute_sector_at_index(
    all_candles: dict[str, list[Candle]],
    index: int,
) -> list[dict[str, float | bool | str]]:
    if index < 12:
        return [{"asset": asset, "selected": False, "return_pct": 0.0} for asset in SECTOR_ETFS]

    items = []
    for asset in SECTOR_ETFS:
        candles = all_candles.get(asset)
        if not candles or index >= len(candles):
            items.append({"asset": asset, "ret12m": 0.0, "above_sma": False, "return_pct": 0.0})
            continue
        now = candles[index].close
        ret12m = trailing_return(candles, index, 12)
        sma_value = sma(candles, 10, index)
        items.append(
            {
                "asset": asset,
                "ret12m": ret12m,
                "above_sma": sma_value is not None and now > sma_value,
                "return_pct": period_return(candles, index),
            }
        )

    items.sort(key=lambda item: item["ret12m"], reverse=True)
    selected = 0
    output = []
    for item in items:
        is_selected = (
            selected < TOP_SECTORS_COUNT and bool(item["above_sma"]) and item["ret12m"] > 0
        )
        if is_selected:
            selected += 1
        output.append(
            {
                "asset": item["asset"],
                "selected": is_selected,
                "return_pct": item["return_pct"],
            }
        )
    return output


def current_allocation(
    all_candles: dict[str, list[Candle]],
    config: StrategyAConfig,
) -> StrategyACurrentAllocation | None:
    spy_candles = all_candles.get("SPY", [])
    veu_candles = all_candles.get("VEU", [])
    if not spy_candles:
        return None
    last_index = len(spy_candles) - 1
    gem = compute_gem_signal_at_index(spy_candles, veu_candles, last_index)
    taa = compute_taa_at_index(all_candles, last_index)
    sectors = compute_sector_at_index(all_candles, last_index)
    return StrategyACurrentAllocation(
        gem=StrategyAGemAllocation(asset=str(gem["asset"]), weight=config.gem_weight),
        taa=[
            StrategyATaaAllocation(
                asset=str(signal["asset"]),
                invested=bool(signal["invested"]),
                weight=config.taa_weight / len(TAA_ASSETS),
            )
            for signal in taa
        ],
        sectors=[
            StrategyASectorAllocation(
                asset=str(signal["asset"]),
                rank=index + 1,
                weight=config.sector_weight / TOP_SECTORS_COUNT,
            )
            for index, signal in enumerate([signal for signal in sectors if signal["selected"]])
        ],
    )


def trailing_return(candles: list[Candle], index: int, periods: int) -> float:
    if index < periods or index >= len(candles):
        return 0.0
    current = candles[index].close
    past = candles[index - periods].close
    return (current - past) / past if past > 0 else 0.0


def period_return(candles: list[Candle], index: int) -> float:
    if index <= 0 or index >= len(candles):
        return 0.0
    current = candles[index].close
    previous = candles[index - 1].close
    return (current - previous) / previous if previous > 0 else 0.0


def sma(candles: list[Candle], period: int, end_index: int) -> float | None:
    if end_index < period - 1 or end_index >= len(candles):
        return None
    return sum(candle.close for candle in candles[end_index - period + 1 : end_index + 1]) / period


def compute_cagr(equity_curve: list[EquityPoint]) -> float:
    if len(equity_curve) < 2:
        return 0.0
    first = equity_curve[0].value
    last = equity_curve[-1].value
    years = (equity_curve[-1].time - equity_curve[0].time) / (365.25 * 24 * 3600)
    if first <= 0 or years <= 0:
        return 0.0
    return (last / first) ** (1 / years) - 1


def compute_max_drawdown(equity_curve: list[EquityPoint]) -> float:
    peak = -math.inf
    max_drawdown = 0.0
    for point in equity_curve:
        peak = max(peak, point.value)
        drawdown = (peak - point.value) / peak if peak > 0 else 0.0
        max_drawdown = max(max_drawdown, drawdown)
    return max_drawdown


def compute_sharpe(monthly_returns: list[float], risk_free_monthly: float = 0.0) -> float:
    if len(monthly_returns) < 2:
        return 0.0
    excess = [item - risk_free_monthly for item in monthly_returns]
    mean = sum(excess) / len(excess)
    variance = sum((item - mean) ** 2 for item in excess) / (len(excess) - 1)
    std = math.sqrt(variance)
    return 0.0 if std == 0 else (mean / std) * math.sqrt(12)


def compute_calmar(cagr: float, max_drawdown: float) -> float:
    return 0.0 if max_drawdown == 0 else cagr / max_drawdown


def compute_win_rate(monthly_returns: list[float]) -> float:
    return (
        0.0
        if not monthly_returns
        else len([item for item in monthly_returns if item > 0]) / len(monthly_returns)
    )


def compute_total_return(equity_curve: list[EquityPoint]) -> float:
    if len(equity_curve) < 2 or equity_curve[0].value <= 0:
        return 0.0
    return (equity_curve[-1].value - equity_curve[0].value) / equity_curve[0].value


def empty_result() -> StrategyABacktestResult:
    return StrategyABacktestResult(
        equity_curve=[],
        trades=[],
        cagr=0.0,
        sharpe=0.0,
        max_drawdown=0.0,
        win_rate=0.0,
        calmar=0.0,
        total_return=0.0,
        current_allocation=None,
    )
