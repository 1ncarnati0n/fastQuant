from app.models.market import DataSource, MarketType


def resolve_source_order(market: MarketType, source_interval: str) -> list[DataSource]:
    """(market, source_interval) 조합에 맞는 프로바이더 우선순위를 반환한다."""
    if market == "crypto":
        return ["binance"]
    if market == "krStock" and not _is_intraday(source_interval):
        return ["kis", "yahoo"]
    return ["yahoo"]


def _is_intraday(interval: str) -> bool:
    return interval in {"1m", "2m", "5m", "15m", "30m", "1h"}
