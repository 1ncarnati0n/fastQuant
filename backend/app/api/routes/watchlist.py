from fastapi import APIRouter

from app.models.market import WatchlistSnapshot, WatchlistSnapshotParams
from app.services.market_data.service import fetch_market_candles

router = APIRouter()


@router.post("/snapshots", response_model=list[WatchlistSnapshot])
async def fetch_watchlist_snapshots(params: WatchlistSnapshotParams) -> list[WatchlistSnapshot]:
    snapshots = []
    interval = params.interval.strip() or "1d"
    limit = max(32, min(params.limit or 96, 240))
    for item in params.items[:24]:
        try:
            candles, data_source, plan = await fetch_market_candles(
                item.symbol,
                interval,
                item.market,
                output_limit=limit,
            )
        except Exception:
            continue
        if len(candles) < 2:
            continue

        tail = candles[-limit:]
        last = tail[-1]
        previous = tail[-2]
        change = last.close - previous.close
        change_pct = (change / previous.close) * 100 if abs(previous.close) > 1e-12 else 0.0
        snapshots.append(
            WatchlistSnapshot(
                symbol=item.symbol.upper(),
                market=item.market,
                last_price=last.close,
                change=change,
                change_pct=change_pct,
                high=max(candle.high for candle in tail),
                low=min(candle.low for candle in tail),
                sparkline=[candle.close for candle in tail[-32:]],
                data_source=data_source,
                source_interval=plan.source,
            )
        )
    return snapshots
