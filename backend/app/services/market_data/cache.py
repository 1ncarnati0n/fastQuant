# Legacy shim — use app.cache.ttl directly for new code.
from app.cache.keys import candle_key as cache_key  # noqa: F401
from app.cache.ttl import get_default_cache  # noqa: F401

_inst = get_default_cache()


def get(symbol: str, interval: str, source: str) -> list | None:  # type: ignore[type-arg]
    return None  # async cache; callers must use TTLCache.get() directly


def set(symbol: str, interval: str, source: str, candles: list) -> None:  # type: ignore[type-arg]
    pass  # async cache; callers must use TTLCache.set() directly
