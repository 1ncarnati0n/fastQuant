from app.models.market import DataSource


def candle_key(symbol: str, interval: str, source: DataSource) -> str:
    return f"candles:{symbol.upper()}:{source}:{interval}"


def snapshot_key(market: str, symbol: str) -> str:
    return f"snapshot:{market}:{symbol.upper()}"


def search_key(query: str, market_filter: str | None) -> str:
    suffix = f":{market_filter}" if market_filter else ""
    return f"search:{query.lower()}{suffix}"


def ttl_for_interval(interval: str) -> int:
    if interval == "1d":
        return 900
    if interval == "1w":
        return 3_600
    if interval == "1M":
        return 21_600
    if interval.endswith(("m", "h")):
        return 30
    return 3_600
