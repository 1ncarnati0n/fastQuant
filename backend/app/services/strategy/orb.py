from dataclasses import dataclass
from datetime import UTC, datetime

from app.models.market import (
    Candle,
    OrbConfig,
    OrbScanResponse,
    OrbSignal,
    PremarketSnapshot,
    PremarketStock,
)
from app.services.market_data.service import fetch_market_candles
from app.services.market_data.yahoo import fetch_premarket

US_MARKET_OPEN_HOUR_UTC = 14
US_MARKET_OPEN_MINUTE_UTC = 30


@dataclass(frozen=True)
class OpeningRange:
    high: float
    low: float
    range_width: float
    start_time: int
    end_time: int


async def scan_orb(
    symbols: list[str],
    config: OrbConfig,
    interval: str = "1m",
    limit: int = 240,
) -> OrbScanResponse:
    snapshots: list[PremarketSnapshot] = []
    signals: list[OrbSignal] = []
    errors: dict[str, str] = {}

    for symbol in symbols[:30]:
        normalized = symbol.upper()
        try:
            snapshots.append(await fetch_premarket(normalized))
            candles, _, _ = await fetch_market_candles(
                symbol=normalized,
                interval=interval,
                market="usStock",
                output_limit=max(50, min(limit, 600)),
            )
            opening_range = detect_opening_range(candles, config.range_minutes)
            if opening_range is None:
                continue
            symbol_signals = detect_breakout(candles, opening_range, config)
            for signal in symbol_signals:
                signals.append(signal.model_copy(update={"symbol": normalized}))
        except Exception as error:
            errors[normalized] = str(error)

    return OrbScanResponse(
        signals=signals,
        stocks_in_play=filter_stocks_in_play(snapshots, config),
        errors=errors,
    )


def detect_opening_range(candles: list[Candle], range_minutes: int) -> OpeningRange | None:
    if not candles:
        return None

    latest_date = datetime.fromtimestamp(candles[-1].time, UTC)
    market_open = latest_date.replace(
        hour=US_MARKET_OPEN_HOUR_UTC,
        minute=US_MARKET_OPEN_MINUTE_UTC,
        second=0,
        microsecond=0,
    )
    start_time = int(market_open.timestamp())
    end_time = start_time + max(1, range_minutes) * 60
    range_bars = [candle for candle in candles if start_time <= candle.time < end_time]
    if not range_bars:
        return None

    high = max(candle.high for candle in range_bars)
    low = min(candle.low for candle in range_bars)
    return OpeningRange(
        high=high,
        low=low,
        range_width=high - low,
        start_time=start_time,
        end_time=end_time,
    )


def detect_breakout(
    candles: list[Candle],
    opening_range: OpeningRange,
    config: OrbConfig,
) -> list[OrbSignal]:
    signals = []
    cumulative_price_volume = 0.0
    cumulative_volume = 0.0

    for candle in [item for item in candles if item.time >= opening_range.start_time]:
        typical = (candle.high + candle.low + candle.close) / 3
        cumulative_price_volume += typical * candle.volume
        cumulative_volume += candle.volume
        if candle.time < opening_range.end_time:
            continue

        current_vwap = cumulative_price_volume / cumulative_volume if cumulative_volume > 0 else 0.0
        if candle.close > opening_range.high:
            if not config.use_vwap_filter or candle.close > current_vwap:
                entry = candle.close
                signals.append(
                    OrbSignal(
                        symbol="",
                        direction="long",
                        entry=entry,
                        target1=entry + opening_range.range_width,
                        target2=entry + opening_range.range_width * 1.5,
                        stop=opening_range.low - 0.02,
                        range_high=opening_range.high,
                        range_low=opening_range.low,
                        time=candle.time,
                    )
                )
                break

        if candle.close < opening_range.low:
            if not config.use_vwap_filter or candle.close < current_vwap:
                entry = candle.close
                signals.append(
                    OrbSignal(
                        symbol="",
                        direction="short",
                        entry=entry,
                        target1=entry - opening_range.range_width,
                        target2=entry - opening_range.range_width * 1.5,
                        stop=opening_range.high + 0.02,
                        range_high=opening_range.high,
                        range_low=opening_range.low,
                        time=candle.time,
                    )
                )
                break

    return signals


def filter_stocks_in_play(
    snapshots: list[PremarketSnapshot],
    config: OrbConfig,
) -> list[PremarketStock]:
    stocks = []
    for snapshot in snapshots:
        premarket_volume = snapshot.pre_market_volume or 0.0
        regular_volume = snapshot.regular_market_volume or 1.0
        normal_volume = regular_volume * 0.02
        rvol = premarket_volume / normal_volume if normal_volume > 0 else 0.0
        premarket_change = (snapshot.pre_market_change or 0.0) * 100
        stocks.append(
            PremarketStock(
                symbol=snapshot.symbol,
                pre_price=snapshot.pre_market_price or 0.0,
                pre_change=premarket_change,
                pre_volume=premarket_volume,
                normal_volume=normal_volume,
                r_vol=rvol,
            )
        )

    return sorted(
        [
            stock
            for stock in stocks
            if stock.r_vol >= config.rvol_threshold
            and abs(stock.pre_change) >= config.premarket_change_threshold
        ],
        key=lambda stock: stock.r_vol,
        reverse=True,
    )
