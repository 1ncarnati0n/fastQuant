import math

from app.models.market import (
    AdxPoint,
    AdxResult,
    AutoFibLevel,
    AutoFibResult,
    BollingerBandsPoint,
    Candle,
    ChannelPoint,
    DonchianResult,
    IchimokuPoint,
    IchimokuResult,
    KeltnerResult,
    MacdPoint,
    MacdResult,
    MovingAverageResult,
    ParabolicSarPoint,
    ParabolicSarResult,
    PeriodPointValueResult,
    PointValue,
    PointValueResult,
    RsiPoint,
    SmcEvent,
    SmcResult,
    StochasticPoint,
    StochasticResult,
    StcResult,
    SupertrendPoint,
    SupertrendResult,
)


def calculate_bollinger(
    candles: list[Candle],
    period: int,
    multiplier: float,
) -> list[BollingerBandsPoint]:
    if len(candles) < period or period <= 0:
        return []

    closes = [candle.close for candle in candles]
    output: list[BollingerBandsPoint] = []
    for index in range(period - 1, len(candles)):
        window = closes[index + 1 - period : index + 1]
        middle = sum(window) / period
        variance = sum((value - middle) ** 2 for value in window) / period
        std_dev = math.sqrt(variance)
        output.append(
            BollingerBandsPoint(
                time=candles[index].time,
                upper=middle + multiplier * std_dev,
                middle=middle,
                lower=middle - multiplier * std_dev,
            )
        )
    return output


def calculate_sma(candles: list[Candle], period: int) -> MovingAverageResult:
    closes = [candle.close for candle in candles]
    values = sma_values(closes, period)
    data = [
        PointValue(time=candles[index + period - 1].time, value=value)
        for index, value in enumerate(values)
    ]
    return MovingAverageResult(period=period, data=data)


def calculate_ema(candles: list[Candle], period: int) -> MovingAverageResult:
    closes = [candle.close for candle in candles]
    values = ema_values(closes, period)
    data = [
        PointValue(time=candles[index + period - 1].time, value=value)
        for index, value in enumerate(values)
    ]
    return MovingAverageResult(period=period, data=data)


def calculate_hma(candles: list[Candle], period: int) -> MovingAverageResult:
    closes = [candle.close for candle in candles]
    values = hma_values(closes, period)
    if not values:
        return MovingAverageResult(period=period, data=[])
    sqrt_period = max(1, int(math.sqrt(period)))
    total_offset = period - 1 + sqrt_period - 1
    data = [
        PointValue(time=candles[index + total_offset].time, value=value)
        for index, value in enumerate(values)
    ]
    return MovingAverageResult(period=period, data=data)


def calculate_rsi(candles: list[Candle], period: int) -> list[RsiPoint]:
    if len(candles) < period + 1 or period <= 0:
        return []

    closes = [candle.close for candle in candles]
    changes = [current - previous for previous, current in zip(closes, closes[1:], strict=False)]
    gains = [change if change > 0 else 0 for change in changes]
    losses = [-change if change < 0 else 0 for change in changes]

    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period
    output = [RsiPoint(time=candles[period].time, value=rsi_from_average(avg_gain, avg_loss))]

    for index in range(period, len(changes)):
        avg_gain = (avg_gain * (period - 1) + gains[index]) / period
        avg_loss = (avg_loss * (period - 1) + losses[index]) / period
        output.append(
            RsiPoint(time=candles[index + 1].time, value=rsi_from_average(avg_gain, avg_loss))
        )

    return output


def calculate_macd(
    candles: list[Candle],
    fast_period: int,
    slow_period: int,
    signal_period: int,
) -> MacdResult:
    if fast_period <= 0 or slow_period <= 0 or signal_period <= 0 or fast_period >= slow_period:
        return MacdResult(data=[])

    closes = [candle.close for candle in candles]
    fast = ema_values(closes, fast_period)
    slow = ema_values(closes, slow_period)
    if not fast or not slow:
        return MacdResult(data=[])

    offset = slow_period - fast_period
    macd_line = [fast[index + offset] - slow_value for index, slow_value in enumerate(slow)]
    signal_values = ema_values(macd_line, signal_period)
    if not signal_values:
        return MacdResult(data=[])

    candle_start = slow_period - 1 + signal_period - 1
    data = []
    for index, signal_value in enumerate(signal_values):
        macd_index = index + signal_period - 1
        macd_value = macd_line[macd_index]
        data.append(
            MacdPoint(
                time=candles[candle_start + index].time,
                macd=macd_value,
                signal=signal_value,
                histogram=macd_value - signal_value,
            )
        )
    return MacdResult(data=data)


def calculate_obv(candles: list[Candle]) -> PointValueResult:
    if not candles:
        return PointValueResult(data=[])

    obv = 0.0
    data = [PointValue(time=candles[0].time, value=obv)]
    for previous, current in zip(candles, candles[1:], strict=False):
        if current.close > previous.close:
            obv += current.volume
        elif current.close < previous.close:
            obv -= current.volume
        data.append(PointValue(time=current.time, value=obv))
    return PointValueResult(data=data)


def calculate_vwap(candles: list[Candle]) -> PointValueResult:
    cumulative_pv = 0.0
    cumulative_volume = 0.0
    data: list[PointValue] = []
    for candle in candles:
        typical_price = (candle.high + candle.low + candle.close) / 3
        cumulative_pv += typical_price * candle.volume
        cumulative_volume += max(candle.volume, 0)
        value = cumulative_pv / cumulative_volume if cumulative_volume > 1e-12 else typical_price
        data.append(PointValue(time=candle.time, value=value))
    return PointValueResult(data=data)


def calculate_atr(candles: list[Candle], period: int) -> PeriodPointValueResult:
    if not candles or period <= 0 or len(candles) < period:
        return PeriodPointValueResult(period=period, data=[])

    ranges = true_ranges(candles)
    atr = sum(ranges[:period]) / period
    data = [PointValue(time=candles[period - 1].time, value=atr)]
    for index in range(period, len(candles)):
        atr = (atr * (period - 1) + ranges[index]) / period
        data.append(PointValue(time=candles[index].time, value=atr))
    return PeriodPointValueResult(period=period, data=data)


def calculate_stochastic(
    candles: list[Candle],
    k_period: int,
    d_period: int,
    smooth: int,
) -> StochasticResult:
    if len(candles) < k_period or min(k_period, d_period, smooth) <= 0:
        return StochasticResult(data=[])

    raw_k = []
    for index in range(k_period - 1, len(candles)):
        window = candles[index + 1 - k_period : index + 1]
        highest = max(candle.high for candle in window)
        lowest = min(candle.low for candle in window)
        value = (
            50.0
            if abs(highest - lowest) < 1e-12
            else 100 * (candles[index].close - lowest) / (highest - lowest)
        )
        raw_k.append(value)

    k_smoothed = sma_values(raw_k, smooth)
    d_values = sma_values(k_smoothed, d_period)
    if not k_smoothed or not d_values:
        return StochasticResult(data=[])

    candle_offset = k_period - 1 + smooth - 1 + d_period - 1
    data = []
    for index, d_value in enumerate(d_values):
        k_index = index + d_period - 1
        data.append(
            StochasticPoint(
                time=candles[candle_offset + index].time,
                k=k_smoothed[k_index],
                d=d_value,
            )
        )
    return StochasticResult(data=data)


def calculate_donchian(candles: list[Candle], period: int) -> DonchianResult:
    if len(candles) < period or period <= 0:
        return DonchianResult(period=period, data=[])
    data = []
    for index in range(period - 1, len(candles)):
        window = candles[index + 1 - period : index + 1]
        upper = max(candle.high for candle in window)
        lower = min(candle.low for candle in window)
        data.append(
            ChannelPoint(
                time=candles[index].time, upper=upper, middle=(upper + lower) / 2, lower=lower
            )
        )
    return DonchianResult(period=period, data=data)


def calculate_keltner(
    candles: list[Candle],
    ema_period: int,
    atr_period: int,
    atr_multiplier: float,
) -> KeltnerResult:
    closes = [candle.close for candle in candles]
    ema = ema_values(closes, ema_period)
    atr = calculate_atr(candles, atr_period)
    if not ema or not atr.data:
        return KeltnerResult(
            ema_period=ema_period, atr_period=atr_period, atr_multiplier=atr_multiplier, data=[]
        )

    ema_start = ema_period - 1
    atr_start = atr_period - 1
    common_start = max(ema_start, atr_start)
    data = []
    for candle_index in range(common_start, len(candles)):
        ema_index = candle_index - ema_start
        atr_index = candle_index - atr_start
        if ema_index >= len(ema) or atr_index >= len(atr.data):
            break
        middle = ema[ema_index]
        atr_value = atr.data[atr_index].value
        data.append(
            ChannelPoint(
                time=candles[candle_index].time,
                upper=middle + atr_multiplier * atr_value,
                middle=middle,
                lower=middle - atr_multiplier * atr_value,
            )
        )
    return KeltnerResult(
        ema_period=ema_period, atr_period=atr_period, atr_multiplier=atr_multiplier, data=data
    )


def calculate_mfi(candles: list[Candle], period: int) -> PeriodPointValueResult:
    if len(candles) < period + 1 or period <= 0:
        return PeriodPointValueResult(period=period, data=[])

    typical = [(candle.high + candle.low + candle.close) / 3 for candle in candles]
    data = []
    for index in range(period, len(candles)):
        positive_flow = 0.0
        negative_flow = 0.0
        for cursor in range(index + 1 - period, index + 1):
            flow = typical[cursor] * candles[cursor].volume
            if typical[cursor] > typical[cursor - 1]:
                positive_flow += flow
            elif typical[cursor] < typical[cursor - 1]:
                negative_flow += flow
        value = (
            100.0 if abs(negative_flow) < 1e-12 else 100 - 100 / (1 + positive_flow / negative_flow)
        )
        data.append(PointValue(time=candles[index].time, value=value))
    return PeriodPointValueResult(period=period, data=data)


def calculate_cmf(candles: list[Candle], period: int) -> PeriodPointValueResult:
    if len(candles) < period or period <= 0:
        return PeriodPointValueResult(period=period, data=[])

    multipliers = []
    for candle in candles:
        high_low = candle.high - candle.low
        multipliers.append(
            0.0
            if abs(high_low) < 1e-12
            else ((candle.close - candle.low) - (candle.high - candle.close)) / high_low
        )

    data = []
    for index in range(period - 1, len(candles)):
        start = index + 1 - period
        money_flow_volume = sum(
            multipliers[cursor] * candles[cursor].volume for cursor in range(start, index + 1)
        )
        volume = sum(candles[cursor].volume for cursor in range(start, index + 1))
        value = 0.0 if abs(volume) < 1e-12 else money_flow_volume / volume
        data.append(PointValue(time=candles[index].time, value=value))
    return PeriodPointValueResult(period=period, data=data)


def calculate_choppiness(candles: list[Candle], period: int) -> PeriodPointValueResult:
    if len(candles) < period + 1 or period < 2:
        return PeriodPointValueResult(period=period, data=[])

    ranges = true_ranges(candles)
    log_period = math.log10(period)
    data = []
    for index in range(period - 1, len(candles)):
        window = candles[index + 1 - period : index + 1]
        highest = max(candle.high for candle in window)
        lowest = min(candle.low for candle in window)
        range_value = highest - lowest
        range_sum = sum(ranges[index + 1 - period : index + 1])
        value = (
            50.0
            if abs(range_value) < 1e-12 or abs(log_period) < 1e-12
            else 100 * math.log10(range_sum / range_value) / log_period
        )
        data.append(PointValue(time=candles[index].time, value=max(0.0, min(100.0, value))))
    return PeriodPointValueResult(period=period, data=data)


def calculate_williams_r(candles: list[Candle], period: int) -> PeriodPointValueResult:
    if len(candles) < period or period <= 0:
        return PeriodPointValueResult(period=period, data=[])
    data = []
    for index in range(period - 1, len(candles)):
        window = candles[index + 1 - period : index + 1]
        highest = max(candle.high for candle in window)
        lowest = min(candle.low for candle in window)
        value = (
            -50.0
            if abs(highest - lowest) < 1e-12
            else -100 * (highest - candles[index].close) / (highest - lowest)
        )
        data.append(PointValue(time=candles[index].time, value=value))
    return PeriodPointValueResult(period=period, data=data)


def calculate_cvd(candles: list[Candle]) -> PointValueResult:
    cumulative = 0.0
    data = []
    for candle in candles:
        if candle.close > candle.open:
            cumulative += candle.volume
        elif candle.close < candle.open:
            cumulative -= candle.volume
        data.append(PointValue(time=candle.time, value=cumulative))
    return PointValueResult(data=data)


def calculate_adx(candles: list[Candle], period: int) -> AdxResult:
    if len(candles) < period * 2 + 1 or period <= 0:
        return AdxResult(period=period, data=[])

    plus_dm = [0.0]
    minus_dm = [0.0]
    ranges = [candles[0].high - candles[0].low]
    for index in range(1, len(candles)):
        up = candles[index].high - candles[index - 1].high
        down = candles[index - 1].low - candles[index].low
        plus_dm.append(up if up > down and up > 0 else 0.0)
        minus_dm.append(down if down > up and down > 0 else 0.0)
        previous_close = candles[index - 1].close
        ranges.append(
            max(
                candles[index].high - candles[index].low,
                abs(candles[index].high - previous_close),
                abs(candles[index].low - previous_close),
            )
        )

    smooth_plus = sum(plus_dm[1 : period + 1])
    smooth_minus = sum(minus_dm[1 : period + 1])
    smooth_range = sum(ranges[1 : period + 1])
    dx_values = []

    plus_di = 100 * smooth_plus / smooth_range if smooth_range > 0 else 0.0
    minus_di = 100 * smooth_minus / smooth_range if smooth_range > 0 else 0.0
    di_sum = plus_di + minus_di
    dx = 100 * abs(plus_di - minus_di) / di_sum if di_sum > 0 else 0.0
    dx_values.append((candles[period].time, plus_di, minus_di, dx))

    for index in range(period + 1, len(candles)):
        smooth_plus = smooth_plus - smooth_plus / period + plus_dm[index]
        smooth_minus = smooth_minus - smooth_minus / period + minus_dm[index]
        smooth_range = smooth_range - smooth_range / period + ranges[index]
        plus_di = 100 * smooth_plus / smooth_range if smooth_range > 0 else 0.0
        minus_di = 100 * smooth_minus / smooth_range if smooth_range > 0 else 0.0
        di_sum = plus_di + minus_di
        dx = 100 * abs(plus_di - minus_di) / di_sum if di_sum > 0 else 0.0
        dx_values.append((candles[index].time, plus_di, minus_di, dx))

    if len(dx_values) < period:
        return AdxResult(period=period, data=[])

    adx = sum(value[3] for value in dx_values[:period]) / period
    data = [
        AdxPoint(
            time=dx_values[period - 1][0],
            adx=adx,
            plus_di=dx_values[period - 1][1],
            minus_di=dx_values[period - 1][2],
        )
    ]
    for time, plus_di, minus_di, dx in dx_values[period:]:
        adx = (adx * (period - 1) + dx) / period
        data.append(AdxPoint(time=time, adx=adx, plus_di=plus_di, minus_di=minus_di))
    return AdxResult(period=period, data=data)


def calculate_ichimoku(
    candles: list[Candle],
    conversion_period: int,
    base_period: int,
    span_b_period: int,
    displacement: int,
) -> IchimokuResult:
    if not candles or min(conversion_period, base_period, span_b_period, displacement) <= 0:
        return IchimokuResult(data=[])

    data = []
    for index, candle in enumerate(candles):
        conversion = (
            midpoint(candles, index + 1 - conversion_period, index)
            if index + 1 >= conversion_period
            else None
        )
        base = (
            midpoint(candles, index + 1 - base_period, index) if index + 1 >= base_period else None
        )
        span_a = (conversion + base) / 2 if conversion is not None and base is not None else None
        span_b = (
            midpoint(candles, index + 1 - span_b_period, index)
            if index + 1 >= span_b_period
            else None
        )
        lagging = (
            candles[index + displacement].close if index + displacement < len(candles) else None
        )
        data.append(
            IchimokuPoint(
                time=candle.time,
                conversion=conversion,
                base=base,
                span_a=span_a,
                span_b=span_b,
                lagging=lagging,
            )
        )
    return IchimokuResult(data=data)


def calculate_supertrend(
    candles: list[Candle],
    period: int,
    multiplier: float,
) -> SupertrendResult:
    if len(candles) < period or period <= 0:
        return SupertrendResult(period=period, multiplier=multiplier, data=[])

    atr = calculate_atr(candles, period)
    atr_by_time = {point.time: point.value for point in atr.data}
    final_upper = [0.0 for _ in candles]
    final_lower = [0.0 for _ in candles]
    data: list[SupertrendPoint] = []
    started = False
    previous_super = 0.0

    for index, candle in enumerate(candles):
        atr_value = atr_by_time.get(candle.time)
        if atr_value is None:
            continue

        hl2 = (candle.high + candle.low) / 2
        basic_upper = hl2 + multiplier * atr_value
        basic_lower = hl2 - multiplier * atr_value

        if not started:
            final_upper[index] = basic_upper
            final_lower[index] = basic_lower
            previous_super = basic_upper
            started = True
            data.append(SupertrendPoint(time=candle.time, value=previous_super, direction=-1))
            continue

        previous_close = candles[index - 1].close
        previous_final_upper = final_upper[index - 1]
        previous_final_lower = final_lower[index - 1]

        final_upper[index] = (
            basic_upper
            if basic_upper < previous_final_upper or previous_close > previous_final_upper
            else previous_final_upper
        )
        final_lower[index] = (
            basic_lower
            if basic_lower > previous_final_lower or previous_close < previous_final_lower
            else previous_final_lower
        )

        if previous_super == previous_final_upper:
            current_super, direction = (
                (final_upper[index], -1)
                if candle.close <= final_upper[index]
                else (final_lower[index], 1)
            )
        else:
            current_super, direction = (
                (final_lower[index], 1)
                if candle.close >= final_lower[index]
                else (final_upper[index], -1)
            )

        previous_super = current_super
        data.append(SupertrendPoint(time=candle.time, value=current_super, direction=direction))

    return SupertrendResult(period=period, multiplier=multiplier, data=data)


def calculate_parabolic_sar(
    candles: list[Candle],
    step: float,
    max_step: float,
) -> ParabolicSarResult:
    if not candles:
        return ParabolicSarResult(step=step, max_step=max_step, data=[])
    if len(candles) == 1:
        return ParabolicSarResult(
            step=step,
            max_step=max_step,
            data=[ParabolicSarPoint(time=candles[0].time, value=candles[0].close)],
        )

    uptrend = candles[1].close >= candles[0].close
    sar = candles[0].low if uptrend else candles[0].high
    extreme_point = (
        max(candles[0].high, candles[1].high) if uptrend else min(candles[0].low, candles[1].low)
    )
    acceleration = step
    data = [ParabolicSarPoint(time=candles[0].time, value=sar)]

    for index in range(1, len(candles)):
        sar = sar + acceleration * (extreme_point - sar)
        candle = candles[index]

        if uptrend:
            sar = min(sar, candles[index - 1].low)
            if index > 1:
                sar = min(sar, candles[index - 2].low)

            if candle.low < sar:
                uptrend = False
                sar = extreme_point
                extreme_point = candle.low
                acceleration = step
            elif candle.high > extreme_point:
                extreme_point = candle.high
                acceleration = min(acceleration + step, max_step)
        else:
            sar = max(sar, candles[index - 1].high)
            if index > 1:
                sar = max(sar, candles[index - 2].high)

            if candle.high > sar:
                uptrend = True
                sar = extreme_point
                extreme_point = candle.high
                acceleration = step
            elif candle.low < extreme_point:
                extreme_point = candle.low
                acceleration = min(acceleration + step, max_step)

        data.append(ParabolicSarPoint(time=candle.time, value=sar))

    return ParabolicSarResult(step=step, max_step=max_step, data=data)


def calculate_stc(candles: list[Candle], tc_len: int, fast_ma: int, slow_ma: int) -> StcResult:
    closes = [candle.close for candle in candles]
    fast = ema_values(closes, fast_ma)
    slow = ema_values(closes, slow_ma)
    if not fast or not slow or min(tc_len, fast_ma, slow_ma) <= 0 or fast_ma >= slow_ma:
        return StcResult(tc_len=tc_len, fast_ma=fast_ma, slow_ma=slow_ma, data=[])

    offset = slow_ma - fast_ma
    if len(fast) <= offset:
        return StcResult(tc_len=tc_len, fast_ma=fast_ma, slow_ma=slow_ma, data=[])

    macd_line = [fast[index + offset] - slow_value for index, slow_value in enumerate(slow)]
    stoch1 = stochastic_smooth(macd_line, tc_len)
    stoch2 = stochastic_smooth(stoch1, tc_len)
    total_offset = slow_ma - 1 + (tc_len - 1) * 2
    data = [
        PointValue(time=candles[index + total_offset].time, value=max(0.0, min(100.0, value)))
        for index, value in enumerate(stoch2)
        if index + total_offset < len(candles)
    ]
    return StcResult(tc_len=tc_len, fast_ma=fast_ma, slow_ma=slow_ma, data=data)


def calculate_smc(candles: list[Candle], swing_length: int) -> SmcResult:
    if len(candles) < swing_length * 2 + 1 or swing_length <= 0:
        return SmcResult(data=[])

    swings: list[tuple[int, float, bool]] = []
    for index in range(swing_length, len(candles) - swing_length):
        is_high = True
        is_low = True
        for step in range(1, swing_length + 1):
            if (
                candles[index].high < candles[index - step].high
                or candles[index].high < candles[index + step].high
            ):
                is_high = False
            if (
                candles[index].low > candles[index - step].low
                or candles[index].low > candles[index + step].low
            ):
                is_low = False
            if not is_high and not is_low:
                break
        if is_high:
            swings.append((index, candles[index].high, True))
        if is_low:
            swings.append((index, candles[index].low, False))

    swings.sort(key=lambda item: item[0])
    trend = 0
    last_high: tuple[int, float] | None = None
    last_low: tuple[int, float] | None = None
    events: list[SmcEvent] = []

    for swing_index, swing_price, is_high in swings:
        if is_high:
            if last_high is not None and swing_price > last_high[1]:
                event_type = "choch_bull" if trend <= 0 else "bos_bull"
                events.append(
                    SmcEvent(
                        time=candles[swing_index].time,
                        event_type=event_type,
                        price=swing_price,
                        swing_time=candles[last_high[0]].time,
                        swing_price=last_high[1],
                    )
                )
                if trend <= 0:
                    trend = 1
            last_high = (swing_index, swing_price)
        else:
            if last_low is not None and swing_price < last_low[1]:
                event_type = "choch_bear" if trend >= 0 else "bos_bear"
                events.append(
                    SmcEvent(
                        time=candles[swing_index].time,
                        event_type=event_type,
                        price=swing_price,
                        swing_time=candles[last_low[0]].time,
                        swing_price=last_low[1],
                    )
                )
                if trend >= 0:
                    trend = -1
            last_low = (swing_index, swing_price)

    return SmcResult(data=events)


def calculate_anchored_vwap(candles: list[Candle], anchor_time: int) -> PointValueResult:
    start_index = next(
        (index for index, candle in enumerate(candles) if candle.time >= anchor_time), len(candles)
    )
    if start_index >= len(candles):
        return PointValueResult(data=[])

    cumulative_pv = 0.0
    cumulative_volume = 0.0
    data = []
    for candle in candles[start_index:]:
        typical_price = (candle.high + candle.low + candle.close) / 3
        cumulative_pv += typical_price * candle.volume
        cumulative_volume += max(candle.volume, 0)
        value = cumulative_pv / cumulative_volume if cumulative_volume > 1e-12 else typical_price
        data.append(PointValue(time=candle.time, value=value))
    return PointValueResult(data=data)


def calculate_auto_fib(candles: list[Candle], lookback: int, swing_length: int) -> AutoFibResult:
    empty = AutoFibResult(
        high_time=0,
        high_price=0.0,
        low_time=0,
        low_price=0.0,
        is_uptrend=True,
        levels=[],
    )
    if len(candles) < swing_length * 2 + 1 or lookback <= 0 or swing_length <= 0:
        return empty

    scan_start = max(0, len(candles) - lookback)
    range_start = max(scan_start, swing_length)
    range_end = max(range_start, len(candles) - swing_length)
    swing_highs: list[tuple[int, float]] = []
    swing_lows: list[tuple[int, float]] = []

    for index in range(range_start, range_end):
        is_high = True
        is_low = True
        for step in range(1, swing_length + 1):
            if (
                candles[index].high < candles[index - step].high
                or candles[index].high < candles[index + step].high
            ):
                is_high = False
            if (
                candles[index].low > candles[index - step].low
                or candles[index].low > candles[index + step].low
            ):
                is_low = False
            if not is_high and not is_low:
                break
        if is_high:
            swing_highs.append((index, candles[index].high))
        if is_low:
            swing_lows.append((index, candles[index].low))

    if not swing_highs or not swing_lows:
        return empty

    high_index, high_price = max(swing_highs, key=lambda item: item[1])
    low_index, low_price = min(swing_lows, key=lambda item: item[1])
    if abs(high_price - low_price) < 1e-12:
        return empty

    is_uptrend = low_index < high_index
    price_range = high_price - low_price
    levels = [
        AutoFibLevel(
            ratio=ratio,
            price=high_price - ratio * price_range
            if is_uptrend
            else low_price + ratio * price_range,
        )
        for ratio in [0.0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0]
    ]
    return AutoFibResult(
        high_time=candles[high_index].time,
        high_price=high_price,
        low_time=candles[low_index].time,
        low_price=low_price,
        is_uptrend=is_uptrend,
        levels=levels,
    )


def sma_values(values: list[float], period: int) -> list[float]:
    if len(values) < period or period <= 0:
        return []
    output = []
    rolling_sum = sum(values[:period])
    output.append(rolling_sum / period)
    for index in range(period, len(values)):
        rolling_sum += values[index] - values[index - period]
        output.append(rolling_sum / period)
    return output


def ema_values(values: list[float], period: int) -> list[float]:
    if len(values) < period or period <= 0:
        return []
    seed = sma_values(values[:period], period)
    if not seed:
        return []
    multiplier = 2 / (period + 1)
    output = [seed[0]]
    for value in values[period:]:
        previous = output[-1]
        output.append((value - previous) * multiplier + previous)
    return output


def wma_values(values: list[float], period: int) -> list[float]:
    if len(values) < period or period <= 0:
        return []
    denominator = period * (period + 1) / 2
    weights = list(range(1, period + 1))
    output = []
    for index in range(period - 1, len(values)):
        window = values[index + 1 - period : index + 1]
        output.append(
            sum(value * weight for value, weight in zip(window, weights, strict=False))
            / denominator
        )
    return output


def hma_values(values: list[float], period: int) -> list[float]:
    if period < 2 or len(values) < period:
        return []
    half = max(1, period // 2)
    sqrt_period = max(1, int(math.sqrt(period)))
    half_wma = wma_values(values, half)
    full_wma = wma_values(values, period)
    if not half_wma or not full_wma:
        return []
    offset = period - half
    if len(half_wma) <= offset:
        return []
    diff = [2 * half_wma[index + offset] - full for index, full in enumerate(full_wma)]
    return wma_values(diff, sqrt_period)


def stochastic_smooth(values: list[float], period: int) -> list[float]:
    if len(values) < period or period <= 0:
        return []

    output = []
    previous_stoch = 0.0
    for index in range(period - 1, len(values)):
        window = values[index + 1 - period : index + 1]
        highest = max(window)
        lowest = min(window)
        raw = (
            previous_stoch
            if abs(highest - lowest) < 1e-12
            else 100 * (values[index] - lowest) / (highest - lowest)
        )
        smoothed = previous_stoch + 0.5 * (raw - previous_stoch)
        previous_stoch = smoothed
        output.append(smoothed)
    return output


def rsi_from_average(avg_gain: float, avg_loss: float) -> float:
    if avg_loss == 0:
        return 100.0
    rs = avg_gain / avg_loss
    return 100 - (100 / (1 + rs))


def true_ranges(candles: list[Candle]) -> list[float]:
    if not candles:
        return []
    output = [candles[0].high - candles[0].low]
    for previous, current in zip(candles, candles[1:], strict=False):
        output.append(
            max(
                current.high - current.low,
                abs(current.high - previous.close),
                abs(current.low - previous.close),
            )
        )
    return output


def midpoint(candles: list[Candle], start: int, end: int) -> float:
    window = candles[start : end + 1]
    return (max(candle.high for candle in window) + min(candle.low for candle in window)) / 2
