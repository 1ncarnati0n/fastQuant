from app.models.market import Candle, RsiPoint
from app.services.analysis.indicators import (
    calculate_anchored_vwap,
    calculate_auto_fib,
    calculate_ichimoku,
    calculate_parabolic_sar,
    calculate_smc,
    calculate_stc,
    calculate_supertrend,
)
from app.services.analysis.signals import detect_ibs_mean_reversion


def sample_candles(count: int = 80) -> list[Candle]:
    candles = []
    for index in range(count):
        close = 100 + index * 0.8 + ((index % 5) - 2) * 0.5
        candles.append(
            Candle(
                time=1_700_000_000 + index * 86_400,
                open=close - 0.4,
                high=close + 1.5,
                low=close - 1.3,
                close=close,
                volume=1_000 + index * 10,
            )
        )
    return candles


def test_advanced_indicators_return_contract_shapes() -> None:
    candles = sample_candles()

    ichimoku = calculate_ichimoku(candles, 9, 26, 52, 26)
    supertrend = calculate_supertrend(candles, 10, 3.0)
    sar = calculate_parabolic_sar(candles, 0.02, 0.2)
    stc = calculate_stc(candles, 10, 23, 50)
    anchored = calculate_anchored_vwap(candles, candles[10].time)

    assert len(ichimoku.data) == len(candles)
    assert ichimoku.data[25].base is not None
    assert supertrend.period == 10
    assert len(supertrend.data) > 0
    assert sar.max_step == 0.2
    assert len(sar.data) == len(candles)
    assert stc.tc_len == 10
    assert anchored.data[0].time == candles[10].time


def test_smc_and_auto_fib_detect_structural_outputs() -> None:
    candles = sample_candles()
    candles[20] = candles[20].model_copy(update={"high": 140, "close": 138})
    candles[35] = candles[35].model_copy(update={"low": 90, "close": 92})
    candles[55] = candles[55].model_copy(update={"high": 150, "close": 148})

    smc = calculate_smc(candles, 3)
    auto_fib = calculate_auto_fib(candles, 60, 3)

    assert all(
        event.event_type in {"bos_bull", "bos_bear", "choch_bull", "choch_bear"}
        for event in smc.data
    )
    assert auto_fib.levels
    assert auto_fib.high_price >= auto_fib.low_price


def test_ibs_signal_uses_rsi_confirmation() -> None:
    candles = [
        Candle(time=1, open=10, high=12, low=8, close=8.2, volume=100),
        Candle(time=2, open=10, high=12, low=8, close=11.8, volume=100),
    ]
    rsi_points = [RsiPoint(time=1, value=30), RsiPoint(time=2, value=70)]

    signals = detect_ibs_mean_reversion(rsi_points, candles)

    assert [signal.signal_type for signal in signals] == ["ibsMeanRevBuy", "ibsMeanRevSell"]
