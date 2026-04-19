from typing import Protocol, runtime_checkable

from app.models.market import (
    Candle,
    FundamentalsResponse,
    MarketType,
    PremarketSnapshot,
    SymbolSearchResult,
)


@runtime_checkable
class CandleProvider(Protocol):
    async def fetch_klines(self, symbol: str, interval: str, limit: int) -> list[Candle]: ...


@runtime_checkable
class SearchProvider(Protocol):
    async def search_symbols(
        self, query: str, market_filter: MarketType | None = None
    ) -> list[SymbolSearchResult]: ...


@runtime_checkable
class FundamentalsProvider(Protocol):
    async def fetch_fundamentals(
        self, symbol: str, market: MarketType
    ) -> FundamentalsResponse: ...


@runtime_checkable
class PremarketProvider(Protocol):
    async def fetch_premarket(self, symbol: str) -> PremarketSnapshot: ...
