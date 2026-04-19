from app.models.market import AnalysisParams, AnalysisResponse
from app.services.analysis.indicators import (
    calculate_adx,
    calculate_anchored_vwap,
    calculate_atr,
    calculate_auto_fib,
    calculate_bollinger,
    calculate_choppiness,
    calculate_cmf,
    calculate_cvd,
    calculate_donchian,
    calculate_ema,
    calculate_hma,
    calculate_ichimoku,
    calculate_keltner,
    calculate_macd,
    calculate_mfi,
    calculate_obv,
    calculate_parabolic_sar,
    calculate_rsi,
    calculate_smc,
    calculate_sma,
    calculate_stochastic,
    calculate_stc,
    calculate_supertrend,
    calculate_vwap,
    calculate_williams_r,
)
from app.services.analysis.signals import (
    detect_cmf_obv,
    detect_ema_crossover,
    detect_ibs_mean_reversion,
    detect_macd_hist_reversal,
    detect_parabolic_sar_reversal,
    detect_rsi_divergence,
    detect_stoch_rsi_combined,
    detect_supertrend_adx,
    detect_ttm_squeeze,
    detect_vwap_breakout,
)
from app.services.market_data.service import fetch_market_candles


async def analyze_market(params: AnalysisParams) -> AnalysisResponse:
    candles, data_source, plan = await fetch_market_candles(
        symbol=params.symbol,
        interval=params.interval,
        market=params.market,
    )

    macd_params = normalize_period_params(
        params.macd,
        {
            "fastPeriod": 12,
            "fast_period": 12,
            "slowPeriod": 26,
            "slow_period": 26,
            "signalPeriod": 9,
            "signal_period": 9,
        },
    )
    stochastic_params = normalize_period_params(
        params.stochastic,
        {"kPeriod": 14, "dPeriod": 3, "smooth": 3},
    )

    rsi = calculate_rsi(candles, params.rsi_period)
    bollinger_bands = calculate_bollinger(candles, params.bb_period, params.bb_multiplier)
    vwap = calculate_vwap(candles)
    atr = calculate_atr(candles, 14)
    ichimoku = calculate_ichimoku(candles, 9, 26, 52, 26)
    supertrend = calculate_supertrend(candles, 10, 3.0)
    parabolic_sar = calculate_parabolic_sar(candles, 0.02, 0.2)
    macd = (
        calculate_macd(
            candles,
            macd_params["fastPeriod"],
            macd_params["slowPeriod"],
            macd_params["signalPeriod"],
        )
        if params.macd is not None
        else None
    )
    stochastic = (
        calculate_stochastic(
            candles,
            stochastic_params["kPeriod"],
            stochastic_params["dPeriod"],
            stochastic_params["smooth"],
        )
        if params.stochastic is not None
        else None
    )
    obv = calculate_obv(candles) if params.show_obv else None
    donchian = (
        calculate_donchian(candles, int_param(params.donchian, "period", 20))
        if params.donchian is not None
        else None
    )
    keltner = (
        calculate_keltner(
            candles,
            int_param(params.keltner, "emaPeriod", 20),
            int_param(params.keltner, "atrPeriod", 10),
            float_param(params.keltner, "atrMultiplier", 2.0),
        )
        if params.keltner is not None
        else None
    )
    mfi = (
        calculate_mfi(candles, int_param(params.mfi, "period", 14))
        if params.mfi is not None
        else None
    )
    cmf = (
        calculate_cmf(candles, int_param(params.cmf, "period", 20))
        if params.cmf is not None
        else None
    )
    choppiness = (
        calculate_choppiness(candles, int_param(params.choppiness, "period", 14))
        if params.choppiness is not None
        else None
    )
    williams_r = (
        calculate_williams_r(candles, int_param(params.williams_r, "period", 14))
        if params.williams_r is not None
        else None
    )
    adx = (
        calculate_adx(candles, int_param(params.adx, "period", 14))
        if params.adx is not None
        else None
    )
    cvd = calculate_cvd(candles) if params.show_cvd else None
    signals = build_signals(
        params=params,
        candles=candles,
        bollinger_bands=bollinger_bands,
        rsi=rsi,
        supertrend=supertrend,
        parabolic_sar=parabolic_sar,
        macd=macd,
        stochastic=stochastic,
        vwap=vwap,
        adx=adx,
        cmf=cmf,
        obv=obv,
        keltner=keltner,
    )

    return AnalysisResponse(
        candles=candles,
        bollinger_bands=bollinger_bands,
        rsi=rsi,
        signals=signals,
        sma=[calculate_sma(candles, period) for period in params.sma_periods],
        ema=[calculate_ema(candles, period) for period in params.ema_periods],
        hma=[calculate_hma(candles, period) for period in params.hma_periods],
        macd=macd,
        stochastic=stochastic,
        obv=obv,
        vwap=vwap,
        atr=atr,
        ichimoku=ichimoku,
        supertrend=supertrend,
        parabolic_sar=parabolic_sar,
        donchian=donchian,
        keltner=keltner,
        mfi=mfi,
        cmf=cmf,
        choppiness=choppiness,
        williams_r=williams_r,
        adx=adx,
        cvd=cvd,
        stc=calculate_stc(
            candles,
            int_param(params.stc, "tcLen", 10),
            int_param(params.stc, "fastMa", 23),
            int_param(params.stc, "slowMa", 50),
        )
        if params.stc is not None
        else None,
        smc=calculate_smc(candles, int_param(params.smc, "swingLength", 5))
        if params.smc is not None
        else None,
        anchored_vwap=calculate_anchored_vwap(
            candles,
            int_param(params.anchored_vwap, "anchorTime", candles[0].time if candles else 0),
        )
        if params.anchored_vwap is not None
        else None,
        auto_fib=calculate_auto_fib(
            candles,
            int_param(params.auto_fib, "lookback", 120),
            int_param(params.auto_fib, "swingLength", 5),
        )
        if params.auto_fib is not None
        else None,
        symbol=params.symbol.upper(),
        interval=params.interval,
        data_source=data_source,
        source_interval=plan.source,
    )


def normalize_period_params(raw: dict | None, defaults: dict[str, int]) -> dict[str, int]:
    if raw is None:
        return defaults
    output = defaults.copy()
    for key, fallback in defaults.items():
        value = raw.get(key, fallback)
        if isinstance(value, int) and value > 0:
            output[key] = value
    return output


def int_param(raw: dict | None, key: str, default: int) -> int:
    if raw is None:
        return default
    value = raw.get(key)
    if value is None:
        snake_key = camel_to_snake(key)
        value = raw.get(snake_key, default)
    return value if isinstance(value, int) and value > 0 else default


def float_param(raw: dict | None, key: str, default: float) -> float:
    if raw is None:
        return default
    value = raw.get(key)
    if value is None:
        snake_key = camel_to_snake(key)
        value = raw.get(snake_key, default)
    return float(value) if isinstance(value, int | float) else default


def bool_param(raw: dict | None, key: str, default: bool = False) -> bool:
    if raw is None:
        return default
    value = raw.get(key)
    if value is None:
        value = raw.get(camel_to_snake(key), default)
    return bool(value) if isinstance(value, bool) else default


def build_signals(
    *,
    params: AnalysisParams,
    candles,
    bollinger_bands,
    rsi,
    supertrend,
    parabolic_sar,
    macd,
    stochastic,
    vwap,
    adx,
    cmf,
    obv,
    keltner,
):
    signal_params = params.signal_strategies
    signals = []

    if bool_param(signal_params, "supertrendAdx"):
        signals.extend(
            detect_supertrend_adx(supertrend, adx or calculate_adx(candles, 14), candles)
        )

    if bool_param(signal_params, "emaCrossover"):
        fast = int_param(signal_params, "emaFastPeriod", 20)
        slow = int_param(signal_params, "emaSlowPeriod", 50)
        signals.extend(
            detect_ema_crossover(
                calculate_ema(candles, fast), calculate_ema(candles, slow), candles
            )
        )

    if bool_param(signal_params, "stochRsiCombined") and stochastic is not None:
        signals.extend(detect_stoch_rsi_combined(stochastic, rsi, candles))

    if bool_param(signal_params, "cmfObv"):
        signals.extend(
            detect_cmf_obv(
                cmf or calculate_cmf(candles, 20), obv or calculate_obv(candles), candles
            )
        )

    if bool_param(signal_params, "ttmSqueeze") and macd is not None:
        signals.extend(
            detect_ttm_squeeze(
                bollinger_bands, keltner or calculate_keltner(candles, 20, 10, 2.0), macd, candles
            )
        )

    if bool_param(signal_params, "vwapBreakout"):
        signals.extend(detect_vwap_breakout(vwap, candles))

    if bool_param(signal_params, "parabolicSar"):
        signals.extend(detect_parabolic_sar_reversal(parabolic_sar, candles))

    if bool_param(signal_params, "macdHistReversal") and macd is not None:
        signals.extend(detect_macd_hist_reversal(macd, candles))

    if bool_param(signal_params, "ibsMeanReversion"):
        signals.extend(detect_ibs_mean_reversion(rsi, candles))

    if bool_param(signal_params, "rsiDivergence"):
        swing_length = int_param(signal_params, "divergenceSwingLength", 5)
        signals.extend(detect_rsi_divergence(rsi, candles, swing_length))

    return sorted(signals, key=lambda signal: signal.time)


def camel_to_snake(value: str) -> str:
    output = []
    for char in value:
        if char.isupper():
            output.append("_")
            output.append(char.lower())
        else:
            output.append(char)
    return "".join(output).lstrip("_")
