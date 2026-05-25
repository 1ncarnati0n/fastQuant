from datetime import UTC, datetime

from app.cache.keys import candle_key
from app.models.market import Candle
from app.providers.yahoo import interval_to_range, normalize_monthly_candles
from app.services.analysis.service import analysis_output_limit
from app.services.market_data.intervals import IntervalPlan
from app.services.market_data.kis import check_kis_error, parse_daily_item, parse_symbol
from app.services.market_data.service import _resample, resolve_source_order


def test_kr_daily_uses_kis_then_yahoo_fallback() -> None:
    assert resolve_source_order("krStock", "1d") == ["kis", "yahoo"]


def test_kr_intraday_uses_yahoo_until_kis_intraday_is_selected() -> None:
    assert resolve_source_order("krStock", "1m") == ["yahoo"]


def test_daily_analysis_requests_longer_history_without_expanding_intraday() -> None:
    assert analysis_output_limit("1d", "usStock") == 1250
    assert analysis_output_limit("1h", "usStock") == 500
    assert interval_to_range("1d") == "5y"


def test_long_term_analysis_loads_available_monthly_source_history() -> None:
    assert analysis_output_limit("1M", "usStock") == 2500
    assert analysis_output_limit("1Y", "usStock") == 2500
    assert analysis_output_limit("1M", "krStock") == 1500
    assert analysis_output_limit("1Y", "crypto") == 1000
    assert interval_to_range("1M") == "10y"


def test_yahoo_monthly_normalization_merges_live_duplicate_month() -> None:
    first = int(datetime(2026, 5, 1, tzinfo=UTC).timestamp())
    live = int(datetime(2026, 5, 22, tzinfo=UTC).timestamp())
    candles = normalize_monthly_candles(
        [
            Candle(time=first, open=278, high=311, low=274, close=307, volume=760_000),
            Candle(time=live, open=306, high=312, low=305, close=309, volume=43_000),
        ]
    )

    assert len(candles) == 1
    assert candles[0].time == first
    assert candles[0].open == 278
    assert candles[0].high == 312
    assert candles[0].low == 274
    assert candles[0].close == 309
    assert candles[0].volume == 760_000


def test_yearly_resample_uses_calendar_year_buckets() -> None:
    december = int(datetime(2024, 12, 1, tzinfo=UTC).timestamp())
    january = int(datetime(2025, 1, 1, tzinfo=UTC).timestamp())
    december_next = int(datetime(2025, 12, 1, tzinfo=UTC).timestamp())
    candles = _resample(
        [
            Candle(time=december, open=90, high=110, low=80, close=100, volume=10),
            Candle(time=january, open=101, high=120, low=100, close=115, volume=20),
            Candle(time=december_next, open=116, high=130, low=105, close=125, volume=30),
        ],
        IntervalPlan(requested="1Y", source="1M", factor=12, needs_resample=True),
    )

    assert [datetime.fromtimestamp(candle.time, UTC).year for candle in candles] == [2024, 2025]
    assert candles[1].open == 101
    assert candles[1].high == 130
    assert candles[1].low == 100
    assert candles[1].close == 125
    assert candles[1].volume == 50


def test_candle_cache_separates_watchlist_and_chart_depth() -> None:
    assert candle_key("AAPL", "1d", "yahoo", 80) != candle_key("AAPL", "1d", "yahoo", 1250)


def test_kis_daily_parser_maps_numeric_strings() -> None:
    candle = parse_daily_item(
        {
            "stck_bsop_date": "20260417",
            "stck_oprc": "100",
            "stck_hgpr": "120",
            "stck_lwpr": "90",
            "stck_clpr": "110",
            "acml_vol": "12345",
        }
    )

    assert candle is not None
    assert candle.close == 110
    assert candle.volume == 12345


def test_kis_symbol_accepts_exchange_suffix() -> None:
    assert parse_symbol("005930.KS") == "005930"
    assert parse_symbol("035720.KQ") == "035720"


def test_kis_error_raises_message() -> None:
    try:
        check_kis_error({"rt_cd": "1", "msg_cd": "EGW001", "msg1": "bad request"})
    except RuntimeError as error:
        assert "EGW001" in str(error)
    else:
        raise AssertionError("expected RuntimeError")
