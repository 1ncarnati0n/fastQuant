import asyncio
from collections import OrderedDict
from dataclasses import dataclass
from time import time

from app.models.market import Candle

CACHE_MAX_SIZE = 10_000


@dataclass
class _Entry:
    candles: list[Candle]
    cached_at: float


class TTLCache:
    def __init__(self, max_size: int = CACHE_MAX_SIZE) -> None:
        self._store: OrderedDict[str, _Entry] = OrderedDict()
        self._lock = asyncio.Lock()
        self._max_size = max_size

    async def get(self, key: str, ttl: int) -> list[Candle] | None:
        entry = self._store.get(key)
        if entry is None:
            return None
        if time() - entry.cached_at >= ttl:
            async with self._lock:
                self._store.pop(key, None)
            return None
        self._store.move_to_end(key)
        return entry.candles

    async def set(self, key: str, candles: list[Candle]) -> None:
        async with self._lock:
            if key in self._store:
                self._store.move_to_end(key)
            self._store[key] = _Entry(candles=candles, cached_at=time())
            while len(self._store) > self._max_size:
                self._store.popitem(last=False)

    async def invalidate(self, key: str) -> None:
        async with self._lock:
            self._store.pop(key, None)

    def size(self) -> int:
        return len(self._store)


_default_cache: TTLCache | None = None


def get_default_cache() -> TTLCache:
    global _default_cache
    if _default_cache is None:
        _default_cache = TTLCache()
    return _default_cache
