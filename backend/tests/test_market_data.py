from app.services.market_data.kis import check_kis_error, parse_daily_item, parse_symbol
from app.services.market_data.service import resolve_source_order


def test_kr_daily_uses_kis_then_yahoo_fallback() -> None:
    assert resolve_source_order("krStock", "1d") == ["kis", "yahoo"]


def test_kr_intraday_uses_yahoo_until_kis_intraday_is_selected() -> None:
    assert resolve_source_order("krStock", "1m") == ["yahoo"]


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
