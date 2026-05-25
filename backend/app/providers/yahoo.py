from datetime import UTC, datetime, timedelta
from typing import Any

import httpx

from app.models.market import (
    Candle,
    FundamentalsResponse,
    MarketType,
    PremarketSnapshot,
    SymbolSearchResult,
)

YAHOO_BASE_URL = "https://query1.finance.yahoo.com"
USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
MONTHLY_WINDOW_BARS = 120
MONTHLY_WINDOW_YEARS = 10

# ── Crumb cache ──────────────────────────────────────────────────────────────
# Yahoo Finance requires a session crumb + cookies for /v10 quoteSummary.
# We fetch once and reuse; on 401 we refresh exactly once before giving up.
_crumb: str | None = None
_jar: dict[str, str] = {}


async def _refresh_crumb() -> None:
    global _crumb, _jar
    async with httpx.AsyncClient(
        headers={"User-Agent": USER_AGENT},
        follow_redirects=True,
        timeout=15,
    ) as client:
        await client.get("https://fc.yahoo.com/")
        resp = await client.get(f"{YAHOO_BASE_URL}/v1/test/getcrumb")
        resp.raise_for_status()
        _crumb = resp.text.strip()
        _jar = dict(client.cookies)


async def _get_crumb() -> tuple[str, dict[str, str]]:
    if _crumb is None:
        await _refresh_crumb()
    return _crumb, _jar  # type: ignore[return-value]


async def fetch_klines(symbol: str, interval: str, limit: int) -> list[Candle]:
    range_value = interval_to_range(interval)
    yahoo_interval = map_interval(interval)
    include_pre_post = str(is_intraday(interval)).lower()

    async with httpx.AsyncClient(
        base_url=YAHOO_BASE_URL,
        headers={"User-Agent": USER_AGENT},
        timeout=20,
    ) as client:
        if interval == "1M" and limit > MONTHLY_WINDOW_BARS:
            candles = await fetch_monthly_history(client, symbol)
        else:
            response = await client.get(
                f"/v8/finance/chart/{symbol}",
                params={
                    "interval": yahoo_interval,
                    "range": range_value,
                    "includePrePost": include_pre_post,
                },
            )
            candles = candles_from_response(response)
    if interval == "1M":
        candles = normalize_monthly_candles(candles)
    return candles[-limit:] if limit > 0 else candles


async def fetch_monthly_history(client: httpx.AsyncClient, symbol: str) -> list[Candle]:
    discovery = await client.get(
        f"/v8/finance/chart/{symbol}",
        params={"interval": "1mo", "range": "max", "includePrePost": "false"},
    )
    coarse_candles = candles_from_response(discovery)
    if not coarse_candles:
        return []

    first = datetime.fromtimestamp(coarse_candles[0].time, UTC)
    window_start = datetime(max(1900, first.year - 1), 1, 1, tzinfo=UTC)
    history_end = datetime.now(UTC) + timedelta(days=1)
    candles: list[Candle] = []
    while window_start < history_end:
        window_end = min(replace_year(window_start, window_start.year + MONTHLY_WINDOW_YEARS), history_end)
        response = await client.get(
            f"/v8/finance/chart/{symbol}",
            params={
                "interval": "1mo",
                "period1": int(window_start.timestamp()),
                "period2": int(window_end.timestamp()),
                "includePrePost": "false",
            },
        )
        candles.extend(candles_from_response(response))
        window_start = window_end
    return normalize_monthly_candles(sorted(candles, key=lambda candle: candle.time))


def candles_from_response(response: httpx.Response) -> list[Candle]:
    if response.status_code >= 400:
        raise RuntimeError(f"Yahoo Finance API error ({response.status_code}): {response.text}")
    return parse_chart_response(response.json())


def replace_year(value: datetime, year: int) -> datetime:
    return value.replace(year=year)


async def fetch_fundamentals(symbol: str, market: MarketType) -> FundamentalsResponse:
    crumb, cookies = await _get_crumb()

    async def _request(crumb: str, cookies: dict[str, str]) -> httpx.Response:
        async with httpx.AsyncClient(
            base_url=YAHOO_BASE_URL,
            headers={"User-Agent": USER_AGENT},
            cookies=cookies,
            timeout=20,
        ) as client:
            return await client.get(
                f"/v10/finance/quoteSummary/{symbol}",
                params={
                    "modules": "price,summaryDetail,defaultKeyStatistics,financialData",
                    "crumb": crumb,
                },
            )

    response = await _request(crumb, cookies)
    if response.status_code == 401:
        # crumb expired — refresh once and retry
        await _refresh_crumb()
        crumb, cookies = _crumb, _jar  # type: ignore[assignment]
        response = await _request(crumb, cookies)

    if response.status_code >= 400:
        raise RuntimeError(f"Yahoo Finance API error ({response.status_code}): {response.text}")

    root = response.json()
    result = value_at(root, ["quoteSummary", "result", 0])
    if not isinstance(result, dict):
        raise RuntimeError("Invalid Yahoo Fundamentals response structure")

    return FundamentalsResponse(
        symbol=symbol,
        market=market,
        short_name=first_string(result, [["price", "shortName"], ["price", "longName"]]),
        currency=first_string(result, [["price", "currency"]]),
        market_cap=first_number(
            result, [["price", "marketCap"], ["defaultKeyStatistics", "marketCap"]]
        ),
        trailing_pe=first_number(
            result, [["summaryDetail", "trailingPE"], ["defaultKeyStatistics", "trailingPE"]]
        ),
        forward_pe=first_number(
            result, [["defaultKeyStatistics", "forwardPE"], ["financialData", "forwardPE"]]
        ),
        price_to_book=first_number(result, [["defaultKeyStatistics", "priceToBook"]]),
        trailing_eps=first_number(
            result, [["defaultKeyStatistics", "trailingEps"], ["summaryDetail", "trailingEps"]]
        ),
        forward_eps=first_number(result, [["defaultKeyStatistics", "forwardEps"]]),
        dividend_yield=first_number(result, [["summaryDetail", "dividendYield"]]),
        return_on_equity=first_number(result, [["financialData", "returnOnEquity"]]),
        debt_to_equity=first_number(result, [["financialData", "debtToEquity"]]),
        revenue_growth=first_number(result, [["financialData", "revenueGrowth"]]),
        gross_margins=first_number(result, [["financialData", "grossMargins"]]),
        operating_margins=first_number(result, [["financialData", "operatingMargins"]]),
        profit_margins=first_number(
            result, [["financialData", "profitMargins"], ["defaultKeyStatistics", "profitMargins"]]
        ),
        fifty_two_week_high=first_number(result, [["summaryDetail", "fiftyTwoWeekHigh"]]),
        fifty_two_week_low=first_number(result, [["summaryDetail", "fiftyTwoWeekLow"]]),
        average_volume=first_number(
            result, [["summaryDetail", "averageVolume"], ["price", "averageDailyVolume10Day"]]
        ),
    )


async def fetch_premarket(symbol: str) -> PremarketSnapshot:
    crumb, cookies = await _get_crumb()

    async def _request(crumb: str, cookies: dict[str, str]) -> httpx.Response:
        async with httpx.AsyncClient(
            base_url=YAHOO_BASE_URL,
            headers={"User-Agent": USER_AGENT},
            cookies=cookies,
            timeout=15,
        ) as client:
            return await client.get(
                f"/v10/finance/quoteSummary/{symbol}",
                params={"modules": "price", "crumb": crumb},
            )

    response = await _request(crumb, cookies)
    if response.status_code == 401:
        await _refresh_crumb()
        crumb, cookies = _crumb, _jar  # type: ignore[assignment]
        response = await _request(crumb, cookies)

    if response.status_code >= 400:
        raise RuntimeError(f"Yahoo Finance API error ({response.status_code}): {response.text}")

    price = value_at(response.json(), ["quoteSummary", "result", 0, "price"])
    if not isinstance(price, dict):
        raise RuntimeError("Invalid premarket response")

    return PremarketSnapshot(
        symbol=symbol,
        pre_market_price=read_number(price, ["preMarketPrice"]),
        pre_market_change=read_number(price, ["preMarketChangePercent"]),
        pre_market_volume=read_number(price, ["preMarketVolume"]),
        regular_market_price=read_number(price, ["regularMarketPrice"]),
        regular_market_volume=read_number(price, ["regularMarketVolume"]),
    )


async def search_symbols(
    query: str, market_filter: MarketType | None = None
) -> list[SymbolSearchResult]:
    async with httpx.AsyncClient(
        base_url=YAHOO_BASE_URL,
        headers={"User-Agent": USER_AGENT},
        timeout=15,
    ) as client:
        response = await client.get(
            "/v1/finance/search",
            params={"q": query, "quotesCount": 12, "newsCount": 0, "listsCount": 0},
        )

    if response.status_code >= 400:
        raise RuntimeError(f"Yahoo Search API error ({response.status_code}): {response.text}")

    return parse_search_response(response.json(), market_filter)


def parse_search_response(
    payload: dict[str, Any], market_filter: MarketType | None = None
) -> list[SymbolSearchResult]:
    quotes = payload.get("quotes") or []
    if not isinstance(quotes, list):
        return []

    results: list[SymbolSearchResult] = []
    seen: set[tuple[str, MarketType]] = set()
    for quote in quotes:
        if not isinstance(quote, dict):
            continue
        symbol = str(quote.get("symbol") or "").strip().upper()
        if not symbol:
            continue
        label = quote.get("shortname") or quote.get("longname") or symbol
        exchange = quote.get("exchDisp") or ""
        quote_type = quote.get("quoteType") or ""
        market = classify_market(symbol, exchange, quote_type)
        symbol = normalize_search_symbol(symbol, market)
        if symbol is None:
            continue
        if market_filter is not None and market_filter != market:
            continue
        key = (symbol, market)
        if key in seen:
            continue
        seen.add(key)
        results.append(
            SymbolSearchResult(
                symbol=symbol,
                label=str(label),
                market=market,
                exchange="Binance" if market == "crypto" else str(exchange),
            )
        )

    return results


def normalize_search_symbol(symbol: str, market: MarketType) -> str | None:
    if market != "crypto":
        return symbol
    if symbol.endswith("-USD"):
        return f"{symbol.removesuffix('-USD')}USDT"
    if symbol.endswith("USDT"):
        return symbol
    return None


def parse_chart_response(root: dict[str, Any]) -> list[Candle]:
    result = value_at(root, ["chart", "result", 0])
    if not isinstance(result, dict):
        raise RuntimeError("Invalid Yahoo Finance response structure")

    timestamps = result.get("timestamp")
    quote = value_at(result, ["indicators", "quote", 0])
    if not isinstance(timestamps, list) or not isinstance(quote, dict):
        raise RuntimeError("Missing Yahoo OHLCV data")

    opens = quote.get("open") or []
    highs = quote.get("high") or []
    lows = quote.get("low") or []
    closes = quote.get("close") or []
    volumes = quote.get("volume") or []

    candles: list[Candle] = []
    for index, timestamp in enumerate(timestamps):
        try:
            open_value = opens[index]
            high_value = highs[index]
            low_value = lows[index]
            close_value = closes[index]
            if None in (open_value, high_value, low_value, close_value):
                continue
            volume_value = (
                volumes[index] if index < len(volumes) and volumes[index] is not None else 0
            )
            candles.append(
                Candle(
                    time=int(timestamp),
                    open=float(open_value),
                    high=float(high_value),
                    low=float(low_value),
                    close=float(close_value),
                    volume=float(volume_value),
                )
            )
        except (IndexError, TypeError, ValueError):
            continue

    if not candles:
        raise RuntimeError("No valid candle data from Yahoo Finance")

    return candles


def classify_market(symbol: str, exchange: str, quote_type: str) -> MarketType:
    if symbol.endswith(".KS") or symbol.endswith(".KQ"):
        return "krStock"
    exchange_lower = exchange.lower()
    if "korea" in exchange_lower or "kospi" in exchange_lower or "kosdaq" in exchange_lower:
        return "krStock"
    if symbol.endswith("=X"):
        return "forex"
    quote_type_lower = quote_type.lower()
    if quote_type_lower == "cryptocurrency" or symbol.endswith("-USD") or symbol.endswith("USDT"):
        return "crypto"
    return "usStock"


def is_intraday(interval: str) -> bool:
    return interval in {"1m", "2m", "5m", "15m", "30m", "1h"}


def interval_to_range(interval: str) -> str:
    return {
        "1m": "7d",
        "2m": "60d",
        "5m": "60d",
        "15m": "60d",
        "30m": "60d",
        "1h": "2y",
        "1d": "5y",
        "1w": "10y",
        # Yahoo condenses `1mo + max` into quarterly bars. Keep native monthly cadence.
        "1M": "10y",
    }.get(interval, "2y")


def map_interval(interval: str) -> str:
    return {
        "1m": "1m",
        "2m": "2m",
        "5m": "5m",
        "15m": "15m",
        "30m": "30m",
        "1h": "1h",
        "1d": "1d",
        "1w": "1wk",
        "1M": "1mo",
    }.get(interval, "1d")


def normalize_monthly_candles(candles: list[Candle]) -> list[Candle]:
    output: list[Candle] = []
    for candle in candles:
        month = datetime.fromtimestamp(candle.time, UTC).strftime("%Y-%m")
        if not output:
            output.append(candle)
            continue
        previous = output[-1]
        previous_month = datetime.fromtimestamp(previous.time, UTC).strftime("%Y-%m")
        if previous_month != month:
            output.append(candle)
            continue
        output[-1] = Candle(
            time=previous.time,
            open=previous.open,
            high=max(previous.high, candle.high),
            low=min(previous.low, candle.low),
            close=candle.close,
            volume=max(previous.volume, candle.volume),
        )
    return output


def first_number(root: dict[str, Any], paths: list[list[str | int]]) -> float | None:
    for path in paths:
        value = read_number(root, path)
        if value is not None:
            return value
    return None


def first_string(root: dict[str, Any], paths: list[list[str | int]]) -> str | None:
    for path in paths:
        value = value_at(root, path)
        if isinstance(value, str):
            return value
        if isinstance(value, dict):
            fmt = value.get("fmt") or value.get("longFmt")
            if isinstance(fmt, str):
                return fmt
    return None


def read_number(root: dict[str, Any], path: list[str | int]) -> float | None:
    value = value_at(root, path)
    if isinstance(value, int | float):
        return float(value)
    if isinstance(value, dict):
        raw = value.get("raw")
        if isinstance(raw, int | float):
            return float(raw)
    return None


def value_at(root: Any, path: list[str | int]) -> Any:
    current = root
    for key in path:
        if isinstance(key, int):
            if not isinstance(current, list) or len(current) <= key:
                return None
            current = current[key]
        else:
            if not isinstance(current, dict):
                return None
            current = current.get(key)
    return current
