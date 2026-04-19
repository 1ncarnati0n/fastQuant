from app.models.market import Candle, StrategyAConfig
from app.services.strategy.strategy_a import (
    compute_gem_signal_at_index,
    compute_taa_at_index,
    run_backtest,
)


def monthly_candles(start: float, count: int, step: float = 1.0) -> list[Candle]:
    return [
        Candle(
            time=1_262_304_000 + index * 2_592_000,
            open=start + index * step,
            high=start + index * step + 1,
            low=start + index * step - 1,
            close=start + index * step,
            volume=1_000,
        )
        for index in range(count)
    ]


def test_strategy_a_gem_prefers_stronger_asset() -> None:
    spy = monthly_candles(100, 24, 2)
    veu = monthly_candles(100, 24, 1)

    signal = compute_gem_signal_at_index(spy, veu, 13)

    assert signal["asset"] == "SPY"
    assert signal["spy_ret"] > signal["veu_ret"]


def test_strategy_a_taa_invests_above_ten_month_sma() -> None:
    candles = monthly_candles(100, 20, 2)
    signals = compute_taa_at_index({"SPY": candles}, 12)
    spy = next(signal for signal in signals if signal["asset"] == "SPY")

    assert spy["invested"] is True
    assert spy["return_pct"] > 0


def test_strategy_a_backtest_returns_equity_and_allocation() -> None:
    symbols = [
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
    all_candles = {
        symbol: monthly_candles(100, 48, 1 + index * 0.05) for index, symbol in enumerate(symbols)
    }

    result = run_backtest(
        all_candles,
        StrategyAConfig(
            start_year=2011,
            initial_capital=100_000,
            gem_weight=0.4,
            taa_weight=0.4,
            sector_weight=0.2,
        ),
    )

    assert result.equity_curve
    assert result.trades
    assert result.total_return > 0
    assert result.current_allocation is not None
