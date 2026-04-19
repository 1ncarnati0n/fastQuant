from app.models.market import Candle, OrbConfig, PremarketSnapshot
from app.services.strategy.orb import (
    detect_breakout,
    detect_opening_range,
    filter_stocks_in_play,
)


def test_orb_detects_long_breakout_after_opening_range() -> None:
    candles = [
        Candle(time=1_776_436_200, open=10, high=11, low=9, close=10, volume=100),
        Candle(time=1_776_436_500, open=10, high=12, low=9.5, close=11, volume=100),
        Candle(time=1_776_438_100, open=12, high=13, low=11, close=12.5, volume=500),
    ]
    opening_range = detect_opening_range(candles, 30)

    assert opening_range is not None
    signals = detect_breakout(candles, opening_range, OrbConfig(use_vwap_filter=False))

    assert len(signals) == 1
    assert signals[0].direction == "long"
    assert signals[0].entry == 12.5


def test_orb_filters_stocks_in_play_by_rvol_and_change() -> None:
    snapshots = [
        PremarketSnapshot(
            symbol="ABC",
            pre_market_price=11,
            pre_market_change=0.03,
            pre_market_volume=10_000,
            regular_market_volume=100_000,
        ),
        PremarketSnapshot(
            symbol="DEF",
            pre_market_price=20,
            pre_market_change=0.005,
            pre_market_volume=10_000,
            regular_market_volume=100_000,
        ),
    ]

    stocks = filter_stocks_in_play(
        snapshots, OrbConfig(rvol_threshold=2, premarket_change_threshold=2)
    )

    assert [stock.symbol for stock in stocks] == ["ABC"]
    assert stocks[0].r_vol == 5
