from typing import Any

import httpx

from app.models.market import Candle

BINANCE_BASE_URL = "https://api.binance.com"


async def fetch_klines(symbol: str, interval: str, limit: int) -> list[Candle]:
    async with httpx.AsyncClient(base_url=BINANCE_BASE_URL, timeout=15) as client:
        response = await client.get(
            "/api/v3/klines",
            params={
                "symbol": symbol.upper(),
                "interval": interval,
                "limit": limit,
            },
        )

    if response.status_code >= 400:
        raise RuntimeError(f"Binance API error ({response.status_code}): {response.text}")

    rows: list[list[Any]] = response.json()
    candles: list[Candle] = []
    for row in rows:
        if len(row) < 6:
            continue
        candles.append(
            Candle(
                time=int(row[0]) // 1000,
                open=float(row[1]),
                high=float(row[2]),
                low=float(row[3]),
                close=float(row[4]),
                volume=float(row[5]),
            )
        )

    if not candles:
        raise RuntimeError("No candle data received from Binance")

    return candles
