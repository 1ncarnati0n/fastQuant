from app.models.market import (
    AdxResult,
    BollingerBandsPoint,
    Candle,
    KeltnerResult,
    MacdResult,
    MovingAverageResult,
    ParabolicSarResult,
    PointValueResult,
    PeriodPointValueResult,
    RsiPoint,
    SignalPoint,
    StochasticResult,
    SupertrendResult,
)


def detect_supertrend_adx(
    supertrend: SupertrendResult,
    adx: AdxResult,
    candles: list[Candle],
) -> list[SignalPoint]:
    adx_by_time = {point.time: point.adx for point in adx.data}
    candle_by_time = {candle.time: candle for candle in candles}
    signals = []
    for index in range(1, len(supertrend.data)):
        previous = supertrend.data[index - 1]
        current = supertrend.data[index]
        if previous.direction == current.direction or adx_by_time.get(current.time, 0.0) < 25:
            continue
        signal_type = "supertrendBuy" if current.direction == 1 else "supertrendSell"
        signals.append(signal_point(current.time, signal_type, candle_by_time, "supertrend_adx"))
    return signals


def detect_ema_crossover(
    fast: MovingAverageResult,
    slow: MovingAverageResult,
    candles: list[Candle],
) -> list[SignalPoint]:
    slow_by_time = {point.time: point.value for point in slow.data}
    candle_by_time = {candle.time: candle for candle in candles}
    signals = []
    for index in range(1, len(fast.data)):
        current_slow = slow_by_time.get(fast.data[index].time)
        previous_slow = slow_by_time.get(fast.data[index - 1].time)
        if current_slow is None or previous_slow is None:
            continue
        previous_fast = fast.data[index - 1].value
        current_fast = fast.data[index].value
        if previous_fast <= previous_slow and current_fast > current_slow:
            signals.append(
                signal_point(
                    fast.data[index].time, "emaCrossoverBuy", candle_by_time, "ema_crossover"
                )
            )
        if previous_fast >= previous_slow and current_fast < current_slow:
            signals.append(
                signal_point(
                    fast.data[index].time, "emaCrossoverSell", candle_by_time, "ema_crossover"
                )
            )
    return signals


def detect_stoch_rsi_combined(
    stochastic: StochasticResult,
    rsi: list[RsiPoint],
    candles: list[Candle],
) -> list[SignalPoint]:
    rsi_by_time = {point.time: point.value for point in rsi}
    candle_by_time = {candle.time: candle for candle in candles}
    signals = []
    for point in stochastic.data:
        rsi_value = rsi_by_time.get(point.time)
        if rsi_value is None:
            continue
        if point.k < 20 and rsi_value < 30:
            signals.append(
                signal_point(point.time, "stochRsiBuy", candle_by_time, "stoch_rsi", rsi_value)
            )
        if point.k > 80 and rsi_value > 70:
            signals.append(
                signal_point(point.time, "stochRsiSell", candle_by_time, "stoch_rsi", rsi_value)
            )
    return signals


def detect_cmf_obv(
    cmf: PeriodPointValueResult,
    obv: PointValueResult,
    candles: list[Candle],
) -> list[SignalPoint]:
    obv_by_time = {point.time: point.value for point in obv.data}
    obv_index_by_time = {point.time: index for index, point in enumerate(obv.data)}
    candle_by_time = {candle.time: candle for candle in candles}
    signals = []
    for index in range(1, len(cmf.data)):
        previous_cmf = cmf.data[index - 1].value
        current_cmf = cmf.data[index].value
        time = cmf.data[index].time
        current_obv = obv_by_time.get(time)
        obv_index = obv_index_by_time.get(time)
        if current_obv is None or obv_index is None or obv_index < 10:
            continue
        past_obv = obv.data[obv_index - 10].value
        if previous_cmf <= 0 < current_cmf and current_obv > past_obv:
            signals.append(signal_point(time, "cmfObvBuy", candle_by_time, "cmf_obv"))
        if previous_cmf >= 0 > current_cmf and current_obv < past_obv:
            signals.append(signal_point(time, "cmfObvSell", candle_by_time, "cmf_obv"))
    return signals


def detect_ttm_squeeze(
    bollinger: list[BollingerBandsPoint],
    keltner: KeltnerResult,
    macd: MacdResult,
    candles: list[Candle],
) -> list[SignalPoint]:
    keltner_by_time = {point.time: point for point in keltner.data}
    histogram_by_time = {point.time: point.histogram for point in macd.data}
    candle_by_time = {candle.time: candle for candle in candles}
    signals = []
    previous_squeeze = False
    for index, point in enumerate(bollinger):
        keltner_point = keltner_by_time.get(point.time)
        if keltner_point is None:
            continue
        in_squeeze = point.upper < keltner_point.upper and point.lower > keltner_point.lower
        if index > 0 and previous_squeeze and not in_squeeze:
            histogram = histogram_by_time.get(point.time, 0.0)
            if histogram > 0:
                signals.append(
                    signal_point(point.time, "ttmSqueezeBuy", candle_by_time, "ttm_squeeze")
                )
            elif histogram < 0:
                signals.append(
                    signal_point(point.time, "ttmSqueezeSell", candle_by_time, "ttm_squeeze")
                )
        previous_squeeze = in_squeeze
    return signals


def detect_vwap_breakout(vwap: PointValueResult, candles: list[Candle]) -> list[SignalPoint]:
    if len(candles) < 21:
        return []
    vwap_by_time = {point.time: point.value for point in vwap.data}
    signals = []
    for index in range(20, len(candles)):
        average_volume = sum(candle.volume for candle in candles[index - 20 : index]) / 20
        candle = candles[index]
        vwap_value = vwap_by_time.get(candle.time)
        if vwap_value is None or candle.volume <= average_volume * 1.5:
            continue
        previous = candles[index - 1]
        previous_vwap = vwap_by_time.get(previous.time, vwap_value)
        if previous.close <= previous_vwap and candle.close > vwap_value:
            signals.append(
                SignalPoint(
                    time=candle.time,
                    signal_type="vwapBreakoutBuy",
                    price=candle.close,
                    rsi=0.0,
                    source="vwap_breakout",
                )
            )
        if previous.close >= previous_vwap and candle.close < vwap_value:
            signals.append(
                SignalPoint(
                    time=candle.time,
                    signal_type="vwapBreakoutSell",
                    price=candle.close,
                    rsi=0.0,
                    source="vwap_breakout",
                )
            )
    return signals


def detect_parabolic_sar_reversal(
    sar: ParabolicSarResult,
    candles: list[Candle],
) -> list[SignalPoint]:
    candle_by_time = {candle.time: candle for candle in candles}
    signals = []
    for index in range(1, len(sar.data)):
        previous = sar.data[index - 1]
        current = sar.data[index]
        previous_candle = candle_by_time.get(previous.time)
        current_candle = candle_by_time.get(current.time)
        if previous_candle is None or current_candle is None:
            continue
        previous_above = previous.value > previous_candle.close
        current_above = current.value > current_candle.close
        if previous_above and not current_above:
            signals.append(
                SignalPoint(
                    time=current.time,
                    signal_type="parabolicSarBuy",
                    price=current_candle.close,
                    rsi=0.0,
                    source="parabolic_sar",
                )
            )
        if not previous_above and current_above:
            signals.append(
                SignalPoint(
                    time=current.time,
                    signal_type="parabolicSarSell",
                    price=current_candle.close,
                    rsi=0.0,
                    source="parabolic_sar",
                )
            )
    return signals


def detect_macd_hist_reversal(macd: MacdResult, candles: list[Candle]) -> list[SignalPoint]:
    candle_by_time = {candle.time: candle for candle in candles}
    signals = []
    for index in range(1, len(macd.data)):
        previous = macd.data[index - 1]
        current = macd.data[index]
        previous_candle = candle_by_time.get(previous.time)
        current_candle = candle_by_time.get(current.time)
        if previous_candle is None or current_candle is None:
            continue
        if (
            previous.histogram <= 0 < current.histogram
            and current_candle.close > previous_candle.close
        ):
            signals.append(
                SignalPoint(
                    time=current.time,
                    signal_type="macdHistReversalBuy",
                    price=current_candle.close,
                    rsi=0.0,
                    source="macd_hist",
                )
            )
        if (
            previous.histogram >= 0 > current.histogram
            and current_candle.close < previous_candle.close
        ):
            signals.append(
                SignalPoint(
                    time=current.time,
                    signal_type="macdHistReversalSell",
                    price=current_candle.close,
                    rsi=0.0,
                    source="macd_hist",
                )
            )
    return signals


def detect_ibs_mean_reversion(rsi: list[RsiPoint], candles: list[Candle]) -> list[SignalPoint]:
    rsi_by_time = {point.time: point.value for point in rsi}
    signals = []
    for candle in candles:
        price_range = candle.high - candle.low
        if price_range <= 1e-12:
            continue
        ibs = (candle.close - candle.low) / price_range
        rsi_value = rsi_by_time.get(candle.time, 50.0)
        if ibs < 0.2 and rsi_value < 35:
            signals.append(
                SignalPoint(
                    time=candle.time,
                    signal_type="ibsMeanRevBuy",
                    price=candle.close,
                    rsi=rsi_value,
                    source="ibs_mean_rev",
                )
            )
        if ibs > 0.8 and rsi_value > 65:
            signals.append(
                SignalPoint(
                    time=candle.time,
                    signal_type="ibsMeanRevSell",
                    price=candle.close,
                    rsi=rsi_value,
                    source="ibs_mean_rev",
                )
            )
    return signals


def detect_rsi_divergence(
    rsi: list[RsiPoint],
    candles: list[Candle],
    swing_length: int,
) -> list[SignalPoint]:
    if len(candles) < swing_length * 2 + 1 or len(rsi) < swing_length * 2 + 1:
        return []

    rsi_by_time = {point.time: point.value for point in rsi}
    swing_lows: list[tuple[int, float, float]] = []
    swing_highs: list[tuple[int, float, float]] = []
    for index in range(swing_length, len(candles) - swing_length):
        candle = candles[index]
        rsi_value = rsi_by_time.get(candle.time, 50.0)
        is_swing_low = all(
            candle.low <= candles[index - step].low and candle.low <= candles[index + step].low
            for step in range(1, swing_length + 1)
        )
        is_swing_high = all(
            candle.high >= candles[index - step].high and candle.high >= candles[index + step].high
            for step in range(1, swing_length + 1)
        )
        if is_swing_low:
            swing_lows.append((index, candle.low, rsi_value))
        if is_swing_high:
            swing_highs.append((index, candle.high, rsi_value))

    signals = []
    for index in range(1, len(swing_lows)):
        candle_index, price, rsi_value = swing_lows[index]
        _, previous_price, previous_rsi = swing_lows[index - 1]
        if price < previous_price and rsi_value > previous_rsi:
            candle = candles[candle_index]
            signals.append(
                SignalPoint(
                    time=candle.time,
                    signal_type="rsiDivergenceBuy",
                    price=candle.close,
                    rsi=rsi_value,
                    source="rsi_divergence",
                )
            )
    for index in range(1, len(swing_highs)):
        candle_index, price, rsi_value = swing_highs[index]
        _, previous_price, previous_rsi = swing_highs[index - 1]
        if price > previous_price and rsi_value < previous_rsi:
            candle = candles[candle_index]
            signals.append(
                SignalPoint(
                    time=candle.time,
                    signal_type="rsiDivergenceSell",
                    price=candle.close,
                    rsi=rsi_value,
                    source="rsi_divergence",
                )
            )
    return signals


def signal_point(
    time: int,
    signal_type: str,
    candle_by_time: dict[int, Candle],
    source: str,
    rsi: float = 0.0,
) -> SignalPoint:
    candle = candle_by_time.get(time)
    return SignalPoint(
        time=time,
        signal_type=signal_type,
        price=candle.close if candle is not None else 0.0,
        rsi=rsi,
        source=source,
    )
