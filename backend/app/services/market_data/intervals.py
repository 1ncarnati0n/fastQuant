from dataclasses import dataclass
import re

from app.models.market import MarketType


@dataclass(frozen=True)
class IntervalPlan:
    requested: str
    source: str
    factor: int
    needs_resample: bool


NATIVE_INTERVALS: dict[MarketType, tuple[str, ...]] = {
    "crypto": ("1m", "3m", "5m", "15m", "30m", "1h", "2h", "4h", "1d", "1w", "1M"),
    "krStock": ("1m", "5m", "15m", "30m", "1h", "1d", "1w", "1M"),
    "usStock": ("1m", "2m", "5m", "15m", "30m", "1h", "1d", "1w", "1M"),
    "forex": ("1m", "2m", "5m", "15m", "30m", "1h", "1d", "1w", "1M"),
}


def resolve_interval_plan(interval: str, market: MarketType) -> IntervalPlan:
    requested = interval.strip() or "1d"
    native = NATIVE_INTERVALS[market]

    parsed = parse_interval_parts(requested)
    if parsed is not None:
        value, unit = parsed
        if unit == "Y" and "1M" in native:
            return IntervalPlan(
                requested=requested,
                source="1M",
                factor=max(1, value) * 12,
                needs_resample=True,
            )

    if requested in native:
        return IntervalPlan(requested=requested, source=requested, factor=1, needs_resample=False)

    target_seconds = interval_seconds(requested)
    if target_seconds is None:
        return IntervalPlan(requested="1d", source="1d", factor=1, needs_resample=False)

    best_source = "1d"
    best_seconds = 86_400
    found_divisor = False
    for candidate in native:
        source_seconds = interval_seconds(candidate)
        if source_seconds is None or source_seconds > target_seconds:
            continue
        if target_seconds % source_seconds != 0:
            continue
        if not found_divisor or source_seconds > best_seconds:
            found_divisor = True
            best_source = candidate
            best_seconds = source_seconds

    if not found_divisor:
        best_source = native[0]
        best_seconds = interval_seconds(best_source) or 86_400

    factor = max(1, target_seconds // best_seconds)
    return IntervalPlan(
        requested=requested,
        source=best_source,
        factor=factor,
        needs_resample=requested != best_source,
    )


def parse_interval_parts(interval: str) -> tuple[int, str] | None:
    match = re.fullmatch(r"([1-9]\d*)([mhdwMY])", interval.strip())
    if match is None:
        return None
    return int(match.group(1)), match.group(2)


def interval_seconds(interval: str) -> int | None:
    parsed = parse_interval_parts(interval)
    if parsed is None:
        return None
    value, unit = parsed
    multiplier = {
        "m": 60,
        "h": 3_600,
        "d": 86_400,
        "w": 604_800,
        "M": 2_592_000,
        "Y": 31_536_000,
    }.get(unit)
    return value * multiplier if multiplier is not None else None
