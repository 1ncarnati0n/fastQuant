import math

from app.models.market import (
    AnalysisResponse,
    BollingerBandsPoint,
    Candle,
    MacdPoint,
    MacdResult,
    RsiPoint,
)
from app.services.strategy.strategy_b import (
    adf_test,
    compute_z_score,
    detect_macd_bb_signals,
    get_z_score_signal,
    ols,
)


def test_ols_recovers_linear_relationship() -> None:
    x = [1, 2, 3, 4, 5]
    y = [3, 5, 7, 9, 11]

    regression = ols(y, x)

    assert regression["beta"] == 2
    assert regression["alpha"] == 1
    assert regression["residuals"] == [0, 0, 0, 0, 0]


def test_z_score_signal_thresholds() -> None:
    assert get_z_score_signal(3.6) == "stoploss"
    assert get_z_score_signal(2.1) == "short"
    assert get_z_score_signal(-2.1) == "long"
    assert get_z_score_signal(0.2) == "close"
    assert get_z_score_signal(1.0) == "none"


def test_compute_z_score_uses_rolling_window() -> None:
    result = compute_z_score([1, 2, 3, 4, 10], 3)

    assert len(result) == 3
    assert result[-1].time == 4
    assert result[-1].value > 1


def test_adf_short_series_returns_not_cointegrated() -> None:
    result = adf_test([1, 2, 3])

    assert result["statistic"] == 0
    assert result["is_cointegrated"] is False


def test_detect_macd_bb_buy_signal() -> None:
    candles = [
        Candle(time=index, open=10, high=11, low=9, close=10, volume=100) for index in range(25)
    ]
    candles[-2] = Candle(time=23, open=10, high=11, low=9, close=10, volume=100)
    candles[-1] = Candle(time=24, open=8, high=9, low=7, close=8, volume=200)

    data = AnalysisResponse(
        candles=candles,
        bollinger_bands=[BollingerBandsPoint(time=24, upper=12, middle=10, lower=8)],
        rsi=[RsiPoint(time=24, value=25)],
        signals=[],
        sma=[],
        ema=[],
        hma=[],
        macd=MacdResult(
            data=[
                MacdPoint(time=23, macd=-1, signal=0, histogram=-1),
                MacdPoint(time=24, macd=1, signal=0, histogram=1),
            ]
        ),
        symbol="TEST",
        interval="1d",
        data_source="yahoo",
        source_interval="1d",
    )

    signals = detect_macd_bb_signals(data)

    assert len(signals) == 1
    assert signals[0].direction == "buy"
    assert signals[0].confidence == "strong"
    assert math.isclose(signals[0].price, 8)
