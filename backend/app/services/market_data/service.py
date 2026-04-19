from app.cache.keys import candle_key, ttl_for_interval
from app.cache.ttl import TTLCache, get_default_cache
from app.models.market import Candle, DataSource, MarketType
from app.providers import binance, kis, yahoo
from app.providers.fallback import resolve_source_order
from app.services.market_data.intervals import IntervalPlan, interval_seconds, resolve_interval_plan

# re-export so existing tests can still import from this module
__all__ = ["fetch_market_candles", "resolve_source_order"]

ANALYSIS_OUTPUT_LIMIT = 500


async def fetch_market_candles(
    symbol: str,
    interval: str,
    market: MarketType,
    output_limit: int = ANALYSIS_OUTPUT_LIMIT,
    cache: TTLCache | None = None,
) -> tuple[list[Candle], DataSource, IntervalPlan]:
    _cache = cache or get_default_cache()
    plan = resolve_interval_plan(interval, market)
    source_limit = _source_limit(output_limit, plan, market)
    source_errors: list[str] = []

    for source in resolve_source_order(market, plan.source):
        try:
            key = candle_key(symbol, plan.source, source)
            ttl = ttl_for_interval(plan.source)
            cached = await _cache.get(key, ttl)
            if cached is not None:
                return _resample(cached, plan)[-output_limit:], source, plan

            if source == "binance":
                candles = await binance.fetch_klines(symbol, plan.source, source_limit)
            elif source == "kis":
                candles = await kis.fetch_klines(symbol, plan.source, source_limit)
            else:
                candles = await yahoo.fetch_klines(symbol, plan.source, source_limit)
            await _cache.set(key, candles)
            return _resample(candles, plan)[-output_limit:], source, plan
        except Exception as error:
            source_errors.append(f"{source}: {error}")

    raise RuntimeError(" | ".join(source_errors) or "No market data source available")


def _source_limit(output_limit: int, plan: IntervalPlan, market: MarketType) -> int:
    expanded = output_limit * max(1, plan.factor + 1)
    if market == "crypto":
        return max(output_limit, min(expanded, 1000))
    if market == "krStock":
        return max(output_limit, min(expanded, 1500))
    return max(output_limit, min(expanded, 2500))


def _resample(candles: list[Candle], plan: IntervalPlan) -> list[Candle]:
    if not plan.needs_resample or not candles:
        return candles

    bucket_seconds = interval_seconds(plan.requested)
    if bucket_seconds is None:
        return candles

    output: list[Candle] = []
    for candle in candles:
        bucket_start = (candle.time // bucket_seconds) * bucket_seconds
        if output and output[-1].time == bucket_start:
            prev = output[-1]
            output[-1] = Candle(
                time=prev.time,
                open=prev.open,
                high=max(prev.high, candle.high),
                low=min(prev.low, candle.low),
                close=candle.close,
                volume=prev.volume + candle.volume,
            )
        else:
            output.append(
                Candle(
                    time=bucket_start,
                    open=candle.open,
                    high=candle.high,
                    low=candle.low,
                    close=candle.close,
                    volume=candle.volume,
                )
            )
    return output
