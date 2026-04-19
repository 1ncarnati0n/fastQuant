import math

from app.models.market import (
    AnalysisParams,
    AnalysisResponse,
    Candle,
    MacdBbSignal,
    PairTradingResult,
    ZScorePoint,
)
from app.services.analysis.service import analyze_market
from app.services.market_data import yahoo


async def scan_macd_bb(params: AnalysisParams) -> list[MacdBbSignal]:
    analysis = await analyze_market(params)
    return detect_macd_bb_signals(analysis)


def detect_macd_bb_signals(data: AnalysisResponse) -> list[MacdBbSignal]:
    if data.macd is None or not data.bollinger_bands:
        return []

    bb_by_time = {point.time: point for point in data.bollinger_bands}
    macd_by_time = {point.time: point for point in data.macd.data}
    rsi_by_time = {point.time: point for point in data.rsi}
    signals: list[MacdBbSignal] = []

    for index in range(21, len(data.candles)):
        candle = data.candles[index]
        previous = data.candles[index - 1]
        bb = bb_by_time.get(candle.time)
        macd = macd_by_time.get(candle.time)
        previous_macd = macd_by_time.get(previous.time)
        rsi = rsi_by_time.get(candle.time)
        if bb is None or macd is None or previous_macd is None:
            continue

        average_volume = avg_volume(data.candles, index, 20)
        volume_surge = candle.volume / average_volume if average_volume > 0 else 0

        buy_conditions: list[str] = []
        is_buy = True
        if candle.close <= bb.lower:
            buy_conditions.append("BB 하단 접촉")
        else:
            is_buy = False

        macd_cross = previous_macd.macd <= previous_macd.signal and macd.macd > macd.signal
        histogram_positive = previous_macd.histogram <= 0 and macd.histogram > 0
        if macd_cross or histogram_positive:
            buy_conditions.append("MACD 골든크로스" if macd_cross else "히스토그램 양전환")
        else:
            is_buy = False

        if volume_surge >= 1.2:
            buy_conditions.append(f"거래량 {volume_surge:.1f}x")
        else:
            is_buy = False

        if is_buy:
            is_strong = rsi is not None and rsi.value < 30
            if is_strong:
                buy_conditions.append("RSI < 30 (강한 매수)")
            signals.append(
                MacdBbSignal(
                    time=candle.time,
                    direction="buy",
                    price=candle.close,
                    confidence="strong" if is_strong else "normal",
                    conditions=buy_conditions,
                )
            )
            continue

        sell_conditions: list[str] = []
        is_sell = True
        if candle.close >= bb.upper:
            sell_conditions.append("BB 상단 접촉")
        else:
            is_sell = False

        dead_cross = previous_macd.macd >= previous_macd.signal and macd.macd < macd.signal
        histogram_negative = previous_macd.histogram >= 0 and macd.histogram < 0
        if dead_cross or histogram_negative:
            sell_conditions.append("MACD 데드크로스" if dead_cross else "히스토그램 음전환")
        else:
            is_sell = False

        if rsi is not None and rsi.value > 70:
            sell_conditions.append(f"RSI {rsi.value:.0f} > 70")
        else:
            is_sell = False

        if is_sell:
            signals.append(
                MacdBbSignal(
                    time=candle.time,
                    direction="sell",
                    price=candle.close,
                    confidence="strong" if rsi is not None and rsi.value > 80 else "normal",
                    conditions=sell_conditions,
                )
            )

    return signals


async def analyze_pair_trading(
    pair_a: str,
    pair_b: str,
    interval: str,
    limit: int,
) -> PairTradingResult:
    normalized_interval = "1M" if interval in {"1mo", "1M"} else interval
    bounded_limit = max(50, min(limit, 600))
    candles_a = await yahoo.fetch_klines(pair_a.upper(), normalized_interval, bounded_limit)
    candles_b = await yahoo.fetch_klines(pair_b.upper(), normalized_interval, bounded_limit)

    aligned_a, aligned_b, aligned_times = align_close_prices(candles_a, candles_b)
    if len(aligned_a) < 30:
        raise RuntimeError("공통 데이터가 부족합니다.")

    regression = ols(aligned_a, aligned_b)
    adf = adf_test(regression["residuals"])
    half_life_value = half_life(regression["residuals"])
    z_window = max(20, min(60, round(half_life_value))) if math.isfinite(half_life_value) else 60
    z_scores = compute_z_score(regression["residuals"], z_window)
    z_scores_with_time = [
        ZScorePoint(
            time=aligned_times[point.time] if point.time < len(aligned_times) else point.time,
            value=point.value,
        )
        for point in z_scores
    ]
    current_z = z_scores[-1].value if z_scores else 0.0

    return PairTradingResult(
        pair_a=pair_a.upper(),
        pair_b=pair_b.upper(),
        beta=regression["beta"],
        alpha=regression["alpha"],
        adf_statistic=adf["statistic"],
        is_cointegrated=adf["is_cointegrated"],
        half_life=half_life_value if math.isfinite(half_life_value) else None,
        z_scores=z_scores_with_time,
        current_z_score=current_z,
        signal=get_z_score_signal(current_z),
    )


def avg_volume(candles: list[Candle], end_index: int, period: int) -> float:
    start = max(0, end_index - period + 1)
    window = candles[start : end_index + 1]
    return sum(candle.volume for candle in window) / len(window) if window else 0


def align_close_prices(
    candles_a: list[Candle],
    candles_b: list[Candle],
) -> tuple[list[float], list[float], list[int]]:
    by_time_b = {candle.time: candle for candle in candles_b}
    aligned_a = []
    aligned_b = []
    times = []
    for candle_a in candles_a:
        candle_b = by_time_b.get(candle_a.time)
        if candle_b is None:
            continue
        aligned_a.append(candle_a.close)
        aligned_b.append(candle_b.close)
        times.append(candle_a.time)
    return aligned_a, aligned_b, times


def ols(y: list[float], x: list[float]) -> dict[str, float | list[float]]:
    count = min(len(y), len(x))
    if count < 3:
        return {"beta": 0.0, "alpha": 0.0, "residuals": []}

    sum_x = sum(x[:count])
    sum_y = sum(y[:count])
    sum_xx = sum(value * value for value in x[:count])
    sum_xy = sum(x[index] * y[index] for index in range(count))
    denominator = count * sum_xx - sum_x * sum_x
    if abs(denominator) < 1e-12:
        return {"beta": 0.0, "alpha": 0.0, "residuals": []}

    beta = (count * sum_xy - sum_x * sum_y) / denominator
    alpha = (sum_y - beta * sum_x) / count
    residuals = [y[index] - alpha - beta * x[index] for index in range(count)]
    return {"beta": beta, "alpha": alpha, "residuals": residuals}


def adf_test(series: list[float]) -> dict[str, float | bool | str]:
    count = len(series)
    if count < 20:
        return {"statistic": 0.0, "is_cointegrated": False, "p_value": ">0.10"}

    delta_y = [series[index] - series[index - 1] for index in range(1, count)]
    y_lag = series[:-1]
    mean_x = sum(y_lag) / len(y_lag)
    mean_y = sum(delta_y) / len(delta_y)
    sxx = sum((value - mean_x) ** 2 for value in y_lag)
    sxy = sum((y_lag[index] - mean_x) * (delta_y[index] - mean_y) for index in range(len(delta_y)))
    if sxx < 1e-12:
        return {"statistic": 0.0, "is_cointegrated": False, "p_value": ">0.10"}

    gamma = sxy / sxx
    alpha = mean_y - gamma * mean_x
    sse = sum(
        (delta_y[index] - (alpha + gamma * y_lag[index])) ** 2 for index in range(len(delta_y))
    )
    se = math.sqrt(sse / ((len(delta_y) - 2) * sxx))
    if se < 1e-12:
        return {"statistic": 0.0, "is_cointegrated": False, "p_value": ">0.10"}

    statistic = gamma / se
    if statistic < -3.90:
        p_value = "<0.01"
    elif statistic < -3.37:
        p_value = "<0.05"
    elif statistic < -3.07:
        p_value = "<0.10"
    else:
        p_value = ">0.10"
    return {"statistic": statistic, "is_cointegrated": statistic < -3.37, "p_value": p_value}


def compute_z_score(residuals: list[float], window: int) -> list[ZScorePoint]:
    output = []
    for index in range(window - 1, len(residuals)):
        values = residuals[index + 1 - window : index + 1]
        mean = sum(values) / window
        variance = sum(value * value for value in values) / window - mean * mean
        std = math.sqrt(max(0.0, variance))
        z_score = (residuals[index] - mean) / std if std > 1e-12 else 0.0
        output.append(ZScorePoint(time=index, value=z_score))
    return output


def half_life(residuals: list[float]) -> float:
    if len(residuals) < 10:
        return math.inf

    y = residuals[1:]
    x = residuals[:-1]
    count = len(y)
    mean_x = sum(x) / count
    mean_y = sum(y) / count
    sxx = sum((value - mean_x) ** 2 for value in x)
    sxy = sum((x[index] - mean_x) * (y[index] - mean_y) for index in range(count))
    if sxx < 1e-12:
        return math.inf

    gamma = sxy / sxx
    if gamma >= 1 or gamma >= 0:
        return math.inf
    return -math.log(2) / math.log(gamma)


def get_z_score_signal(z_score: float) -> str:
    if abs(z_score) > 3.5:
        return "stoploss"
    if z_score > 2.0:
        return "short"
    if z_score < -2.0:
        return "long"
    if abs(z_score) < 0.5:
        return "close"
    return "none"
