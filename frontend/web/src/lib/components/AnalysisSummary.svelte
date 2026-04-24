<script lang="ts">
  import { crosshair } from "$lib/stores/crosshair.svelte";
  import type { AnalysisParams, AnalysisResponse, Candle } from "$lib/api/types";
  import { INDICATOR_SPECS } from "$lib/chart/indicatorSpecs";
  import { toggleIndicatorActivation } from "$lib/features/indicators/panelParams";
  import { indicatorVisibility } from "$lib/stores/indicatorVisibility.svelte";
  import IndicatorVisibilityButton from "$lib/components/chart/IndicatorVisibilityButton.svelte";

  let {
    analysis = null,
    loading = false,
    error = null,
    params,
    onParamsChange,
  }: {
    analysis?: AnalysisResponse | null;
    loading?: boolean;
    error?: string | null;
    params?: AnalysisParams;
    onParamsChange?: (next: AnalysisParams) => void;
  } = $props();

  // Color palette matches the chart overlay colors in src/lib/chart/overlays/
  const SMA_COLORS = ["#0d9488", "#0891b2", "#0e7490", "#0369a1"];
  const EMA_COLORS = ["#ea580c", "#c2410c", "#b45309", "#92400e"];
  const HMA_COLORS = ["#2563eb", "#1d4ed8", "#1e40af", "#1e3a8a"];

  let collapsed = $state(false);
  const hiddenIndicators = $derived(indicatorVisibility.hidden);

  // Latest OHLC fallback, or hovered candle while the chart crosshair is active.
  const latest = $derived(analysis?.candles.at(-1) ?? null);
  const hoveredTime = $derived(crosshair.values.time);
  function pointAtTimeOrLast<T extends { time: number }>(data: T[] | null | undefined, time: number | null): T | null {
    if (!data?.length) return null;
    if (time === null) return data[data.length - 1] ?? null;
    for (let i = data.length - 1; i >= 0; i -= 1) {
      if (data[i].time <= time) return data[i];
    }
    return data[0] ?? null;
  }

  const hoveredCandle = $derived.by<Candle | null>(() => {
    const cv = crosshair.values;
    if (cv.time === null || cv.open === null || cv.high === null || cv.low === null || cv.close === null) {
      return null;
    }
    return {
      time: cv.time,
      open: cv.open,
      high: cv.high,
      low: cv.low,
      close: cv.close,
      volume: cv.volume ?? 0,
    };
  });
  const displayCandle = $derived(hoveredCandle ?? latest);
  const prevCandle = $derived.by<Candle | null>(() => {
    if (!analysis?.candles.length || !displayCandle) return null;
    const index = hoveredTime === null
      ? analysis.candles.length - 1
      : analysis.candles.findIndex((c) => c.time === displayCandle.time);
    if (index <= 0) return null;
    return analysis.candles[index - 1] ?? null;
  });
  const prevClose = $derived(prevCandle?.close ?? null);

  function fmtPrice(v: number): string {
    const abs = Math.abs(v);
    if (abs >= 1000) return `$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    if (abs >= 1) return `$${v.toFixed(2)}`;
    if (abs >= 0.01) return `$${v.toFixed(4)}`;
    return `$${v.toFixed(6)}`;
  }

  function fmtVolume(v: number): string {
    if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(2)}B`;
    if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
    if (v >= 1_000) return `${(v / 1_000).toFixed(1)}K`;
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  function pct(current: number, base: number | null): { txt: string; up: boolean } | null {
    if (base === null || base === 0) return null;
    const p = ((current / base) - 1) * 100;
    return { txt: `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`, up: p >= 0 };
  }

  const emaEntries = $derived.by(() => {
    if (!analysis?.ema.length) return null;
    return analysis.ema.map((e, i) => ({
      period: e.period,
      value: pointAtTimeOrLast(e.data, hoveredTime)?.value ?? null,
      color: EMA_COLORS[i % EMA_COLORS.length],
    }));
  });

  const smaEntries = $derived.by(() => {
    if (!analysis?.sma.length) return null;
    return analysis.sma.map((e, i) => ({
      period: e.period,
      value: pointAtTimeOrLast(e.data, hoveredTime)?.value ?? null,
      color: SMA_COLORS[i % SMA_COLORS.length],
    }));
  });

  const hmaEntries = $derived.by(() => {
    if (!analysis?.hma.length) return null;
    return analysis.hma.map((e, i) => ({
      period: e.period,
      value: pointAtTimeOrLast(e.data, hoveredTime)?.value ?? null,
      color: HMA_COLORS[i % HMA_COLORS.length],
    }));
  });

  const bbEntry = $derived.by(() => {
    if (!params?.showBollingerBands || !analysis?.bollingerBands.length) return null;
    const point = pointAtTimeOrLast(analysis.bollingerBands, hoveredTime);
    if (!point) return null;
    return { upper: point.upper, middle: point.middle, lower: point.lower };
  });

  const vwapEntry = $derived.by(() => {
    const v = pointAtTimeOrLast(analysis?.vwap?.data, hoveredTime)?.value;
    if (!params?.showVwap || v === undefined) return null;
    return v;
  });

  const anchoredVwapEntry = $derived.by(() => {
    const v = pointAtTimeOrLast(analysis?.anchoredVwap?.data, hoveredTime)?.value;
    if (!params?.anchoredVwap || v === undefined) return null;
    return v;
  });

  const supertrendEntry = $derived.by(() => {
    const st = pointAtTimeOrLast(analysis?.supertrend?.data, hoveredTime);
    if (!params?.showSupertrend || !st) return null;
    return st;
  });

  const ichimokuEntry = $derived.by(() => {
    const ic = pointAtTimeOrLast(analysis?.ichimoku?.data, hoveredTime);
    if (!params?.showIchimoku || !ic) return null;
    return ic;
  });

  const donchianEntry = $derived.by(() => {
    const d = pointAtTimeOrLast(analysis?.donchian?.data, hoveredTime);
    if (!d) return null;
    return d;
  });

  const keltnerEntry = $derived.by(() => {
    const k = pointAtTimeOrLast(analysis?.keltner?.data, hoveredTime);
    if (!k) return null;
    return k;
  });

  const parabolicSarEntry = $derived.by(() => {
    const v = pointAtTimeOrLast(analysis?.parabolicSar?.data, hoveredTime)?.value;
    if (!params?.showParabolicSar || v === undefined) return null;
    return v;
  });

  const autoFibEntry = $derived.by(() => {
    if (!params?.autoFib || !analysis?.autoFib) return null;
    return analysis.autoFib;
  });

  const volumeProfileEntry = $derived.by(() => {
    if (!params?.showVolumeProfile) return null;
    return true;
  });

  const paneEntries = $derived.by(() => {
    const entries: Array<{ key: string; label: string; detail: string }> = [];
    if (params?.showVolume && analysis?.candles.length) entries.push({ key: "volume", label: "거래량", detail: "하단" });
    if (params?.showRsi && analysis?.rsi.length) entries.push({ key: "rsi", label: "RSI", detail: "하단" });
    if (params?.macd && analysis?.macd?.data.length) entries.push({ key: "macd", label: "MACD", detail: "하단" });
    if (params?.stochastic && analysis?.stochastic?.data.length) entries.push({ key: "stochastic", label: "Stochastic", detail: "하단" });
    if (params?.showObv && analysis?.obv?.data.length) entries.push({ key: "showObv", label: "OBV", detail: "하단" });
    if (params?.mfi && analysis?.mfi?.data.length) entries.push({ key: "mfi", label: "MFI", detail: "하단" });
    if (params?.cmf && analysis?.cmf?.data.length) entries.push({ key: "cmf", label: "CMF", detail: "하단" });
    if (params?.adx && analysis?.adx?.data.length) entries.push({ key: "adx", label: "ADX", detail: "하단" });
    if (params?.showCvd && analysis?.cvd?.data.length) entries.push({ key: "showCvd", label: "CVD", detail: "하단" });
    if (params?.stc && analysis?.stc?.data.length) entries.push({ key: "stc", label: "STC", detail: "하단" });
    if (params?.showAtr && analysis?.atr?.data.length) entries.push({ key: "atr", label: "ATR", detail: "하단" });
    return entries;
  });

  const hasAnyIndicator = $derived(
    !!emaEntries || !!smaEntries || !!hmaEntries || !!bbEntry || vwapEntry !== null ||
    anchoredVwapEntry !== null || !!supertrendEntry || !!ichimokuEntry || !!donchianEntry || !!keltnerEntry ||
    parabolicSarEntry !== null || !!autoFibEntry || !!volumeProfileEntry || paneEntries.length > 0,
  );

  // Precomputed OHLCV % changes (from previous close)
  const pctOpen  = $derived(displayCandle ? pct(displayCandle.open,  prevClose) : null);
  const pctHigh  = $derived(displayCandle ? pct(displayCandle.high,  prevClose) : null);
  const pctLow   = $derived(displayCandle ? pct(displayCandle.low,   prevClose) : null);
  const pctClose = $derived(displayCandle ? pct(displayCandle.close, prevClose) : null);

  function isHidden(key: string): boolean {
    return hiddenIndicators.has(key);
  }

  function deactivateIndicator(key: string) {
    if (!params || !onParamsChange) return;
    if (key === "anchoredVwap") {
      onParamsChange({ ...($state.snapshot(params) as AnalysisParams), anchoredVwap: null });
      indicatorVisibility.show(key);
      return;
    }
    const spec = INDICATOR_SPECS.find((s) => s.key === key);
    if (!spec || spec.activation.kind === "always") return;
    onParamsChange(toggleIndicatorActivation($state.snapshot(params) as AnalysisParams, spec));
    indicatorVisibility.show(key);
  }
</script>

{#if loading}
  <div class="analysis-legend analysis-legend--loading" role="status" aria-label="분석 로딩 중">
    <span class="spinner" aria-hidden="true"></span>
    <span>분석 데이터 로딩 중…</span>
  </div>
{:else if error}
  <div class="analysis-legend analysis-legend--error" role="alert">
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">
      <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
    </svg>
    <span>{error}</span>
  </div>
{:else if analysis && displayCandle}
  <div class="analysis-legend" class:is-collapsed={collapsed}>
    <!-- OHLCV row -->
    <div class="ohlcv-row">
      <span class="ohlc"><span class="ohlc-key">시작</span>
        <span class="ohlc-val">{fmtPrice(displayCandle.open)}</span>
        {#if pctOpen}<span class="ohlc-pct" class:up={pctOpen.up} class:down={!pctOpen.up}>({pctOpen.txt})</span>{/if}
      </span>
      <span class="ohlc"><span class="ohlc-key">고가</span>
        <span class="ohlc-val">{fmtPrice(displayCandle.high)}</span>
        {#if pctHigh}<span class="ohlc-pct" class:up={pctHigh.up} class:down={!pctHigh.up}>({pctHigh.txt})</span>{/if}
      </span>
      <span class="ohlc"><span class="ohlc-key">저가</span>
        <span class="ohlc-val">{fmtPrice(displayCandle.low)}</span>
        {#if pctLow}<span class="ohlc-pct" class:up={pctLow.up} class:down={!pctLow.up}>({pctLow.txt})</span>{/if}
      </span>
      <span class="ohlc"><span class="ohlc-key">종가</span>
        <span class="ohlc-val">{fmtPrice(displayCandle.close)}</span>
        {#if pctClose}<span class="ohlc-pct" class:up={pctClose.up} class:down={!pctClose.up}>({pctClose.txt})</span>{/if}
      </span>
      <span class="ohlc"><span class="ohlc-key">거래량</span>
        <span class="ohlc-val">{fmtVolume(displayCandle.volume)}</span>
      </span>
    </div>

    {#if !collapsed && hasAnyIndicator}
      <div class="ind-list">
        {#if emaEntries}
          <div class="ind-row" class:is-hidden={isHidden("ema")}>
            <button type="button" class="close-x" onclick={() => deactivateIndicator("ema")} aria-label="지수이동평균선 비활성화">
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <IndicatorVisibilityButton indicatorKey="ema" label="지수이동평균선" />
            <span class="ind-name">지수이동평균선</span>
            {#each emaEntries as e}
              <span class="ind-period" style:color={e.color}>{e.period}</span>
              {#if e.value !== null}
                <span class="ind-val">{fmtPrice(e.value)}</span>
              {:else}
                <span class="ind-val ind-val--na">—</span>
              {/if}
            {/each}
          </div>
        {/if}

        {#if smaEntries}
          <div class="ind-row" class:is-hidden={isHidden("sma")}>
            <button type="button" class="close-x" onclick={() => deactivateIndicator("sma")} aria-label="이동평균선 비활성화">
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <IndicatorVisibilityButton indicatorKey="sma" label="이동평균선" />
            <span class="ind-name">이동평균선</span>
            {#each smaEntries as e}
              <span class="ind-period" style:color={e.color}>{e.period}</span>
              {#if e.value !== null}
                <span class="ind-val">{fmtPrice(e.value)}</span>
              {:else}
                <span class="ind-val ind-val--na">—</span>
              {/if}
            {/each}
          </div>
        {/if}

        {#if hmaEntries}
          <div class="ind-row" class:is-hidden={isHidden("hma")}>
            <button type="button" class="close-x" onclick={() => deactivateIndicator("hma")} aria-label="Hull 이동평균 비활성화">
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <IndicatorVisibilityButton indicatorKey="hma" label="Hull 이동평균" />
            <span class="ind-name">Hull 이동평균</span>
            {#each hmaEntries as e}
              <span class="ind-period" style:color={e.color}>{e.period}</span>
              {#if e.value !== null}
                <span class="ind-val">{fmtPrice(e.value)}</span>
              {/if}
            {/each}
          </div>
        {/if}

        {#if bbEntry}
          <div class="ind-row" class:is-hidden={isHidden("bb")}>
            <button type="button" class="close-x" onclick={() => deactivateIndicator("bb")} aria-label="볼린저 밴드 비활성화">
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <IndicatorVisibilityButton indicatorKey="bb" label="볼린저 밴드" />
            <span class="ind-name">볼린저 밴드</span>
            <span class="ind-sub" style:color="#64748b">중심선</span>
            <span class="ind-val">{fmtPrice(bbEntry.middle)}</span>
            <span class="ind-sub" style:color="#a78bfa">상한선</span>
            <span class="ind-val">{fmtPrice(bbEntry.upper)}</span>
            <span class="ind-sub" style:color="#a78bfa">하한선</span>
            <span class="ind-val">{fmtPrice(bbEntry.lower)}</span>
          </div>
        {/if}

        {#if vwapEntry !== null}
          <div class="ind-row" class:is-hidden={isHidden("vwap")}>
            <button type="button" class="close-x" onclick={() => deactivateIndicator("vwap")} aria-label="VWAP 비활성화">
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <IndicatorVisibilityButton indicatorKey="vwap" label="VWAP" />
            <span class="ind-name" style:color="#a855f7">VWAP</span>
            <span class="ind-sub">기본</span>
            <span class="ind-val">{fmtPrice(vwapEntry)}</span>
          </div>
        {/if}

        {#if anchoredVwapEntry !== null}
          <div class="ind-row" class:is-hidden={isHidden("anchoredVwap")}>
            <button type="button" class="close-x" onclick={() => deactivateIndicator("anchoredVwap")} aria-label="Anchored VWAP 비활성화">
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <IndicatorVisibilityButton indicatorKey="anchoredVwap" label="Anchored VWAP" />
            <span class="ind-name" style:color="#7c3aed">Anchored VWAP</span>
            <span class="ind-val">{fmtPrice(anchoredVwapEntry)}</span>
          </div>
        {/if}

        {#if supertrendEntry}
          <div class="ind-row" class:is-hidden={isHidden("supertrend")}>
            <button type="button" class="close-x" onclick={() => deactivateIndicator("supertrend")} aria-label="슈퍼트렌드 비활성화">
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <IndicatorVisibilityButton indicatorKey="supertrend" label="슈퍼트렌드" />
            <span class="ind-name">슈퍼트렌드</span>
            <span class="ind-val" class:up={supertrendEntry.direction > 0} class:down={supertrendEntry.direction < 0}>
              {fmtPrice(supertrendEntry.value)}
            </span>
            <span class="ind-sub">{supertrendEntry.direction > 0 ? "상승" : "하락"}</span>
          </div>
        {/if}

        {#if parabolicSarEntry !== null}
          <div class="ind-row" class:is-hidden={isHidden("parabolicSar")}>
            <button type="button" class="close-x" onclick={() => deactivateIndicator("parabolicSar")} aria-label="Parabolic SAR 비활성화">
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <IndicatorVisibilityButton indicatorKey="parabolicSar" label="Parabolic SAR" />
            <span class="ind-name">Parabolic SAR</span>
            <span class="ind-val">{fmtPrice(parabolicSarEntry)}</span>
          </div>
        {/if}

        {#if ichimokuEntry}
          <div class="ind-row" class:is-hidden={isHidden("ichimoku")}>
            <button type="button" class="close-x" onclick={() => deactivateIndicator("ichimoku")} aria-label="일목균형표 비활성화">
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <IndicatorVisibilityButton indicatorKey="ichimoku" label="일목균형표" />
            <span class="ind-name">일목균형표</span>
            {#if ichimokuEntry.conversion !== null}
              <span class="ind-sub">전환선</span>
              <span class="ind-val">{fmtPrice(ichimokuEntry.conversion)}</span>
            {/if}
            {#if ichimokuEntry.base !== null}
              <span class="ind-sub">기준선</span>
              <span class="ind-val">{fmtPrice(ichimokuEntry.base)}</span>
            {/if}
          </div>
        {/if}

        {#if donchianEntry}
          <div class="ind-row" class:is-hidden={isHidden("donchian")}>
            <button type="button" class="close-x" onclick={() => deactivateIndicator("donchian")} aria-label="돈치안 비활성화">
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <IndicatorVisibilityButton indicatorKey="donchian" label="돈치안" />
            <span class="ind-name">돈치안</span>
            <span class="ind-sub">상단</span>
            <span class="ind-val">{fmtPrice(donchianEntry.upper)}</span>
            <span class="ind-sub">하단</span>
            <span class="ind-val">{fmtPrice(donchianEntry.lower)}</span>
          </div>
        {/if}

        {#if keltnerEntry}
          <div class="ind-row" class:is-hidden={isHidden("keltner")}>
            <button type="button" class="close-x" onclick={() => deactivateIndicator("keltner")} aria-label="켈트너 비활성화">
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <IndicatorVisibilityButton indicatorKey="keltner" label="켈트너" />
            <span class="ind-name">켈트너</span>
            <span class="ind-sub">상단</span>
            <span class="ind-val">{fmtPrice(keltnerEntry.upper)}</span>
            <span class="ind-sub">하단</span>
            <span class="ind-val">{fmtPrice(keltnerEntry.lower)}</span>
          </div>
        {/if}

        {#if autoFibEntry}
          <div class="ind-row" class:is-hidden={isHidden("autoFib")}>
            <button type="button" class="close-x" onclick={() => deactivateIndicator("autoFib")} aria-label="Auto Fibonacci 비활성화">
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <IndicatorVisibilityButton indicatorKey="autoFib" label="Auto Fibonacci" />
            <span class="ind-name">Auto Fibonacci</span>
            <span class="ind-sub">{autoFibEntry.isUptrend ? "상승 스윙" : "하락 스윙"}</span>
            <span class="ind-sub">고점</span>
            <span class="ind-val">{fmtPrice(autoFibEntry.highPrice)}</span>
            <span class="ind-sub">저점</span>
            <span class="ind-val">{fmtPrice(autoFibEntry.lowPrice)}</span>
          </div>
        {/if}

        {#if volumeProfileEntry}
          <div class="ind-row" class:is-hidden={isHidden("volumeProfile")}>
            <button type="button" class="close-x" onclick={() => deactivateIndicator("volumeProfile")} aria-label="거래량 프로파일 비활성화">
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <IndicatorVisibilityButton indicatorKey="volumeProfile" label="거래량 프로파일" />
            <span class="ind-name">거래량 프로파일</span>
            <span class="ind-sub">활성</span>
          </div>
        {/if}

        {#each paneEntries as entry (entry.key)}
          <div class="ind-row" class:is-hidden={isHidden(entry.key)}>
            <button type="button" class="close-x" onclick={() => deactivateIndicator(entry.key)} aria-label={`${entry.label} 비활성화`}>
              <svg width="8" height="8" viewBox="0 0 10 10" aria-hidden="true"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
            </button>
            <IndicatorVisibilityButton indicatorKey={entry.key} label={entry.label} />
            <span class="ind-name">{entry.label}</span>
            <span class="ind-sub">{entry.detail}</span>
          </div>
        {/each}

      </div>
    {/if}

    {#if hasAnyIndicator}
      <button
        type="button"
        class="collapse-btn"
        aria-label={collapsed ? "지표 목록 펼치기" : "지표 목록 접기"}
        aria-expanded={!collapsed}
        onclick={() => (collapsed = !collapsed)}
      >
        <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" class:flipped={collapsed}>
          <path d="M2 3.5l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" />
        </svg>
      </button>
    {/if}
  </div>
{/if}

<style>
  .analysis-legend {
    position: relative;
    padding: 8px 12px 6px;
    border-bottom: 1px solid var(--line-soft);
    background: color-mix(in srgb, var(--surface) 97%, var(--text) 3%);
    font-size: var(--fs-xs);
    line-height: 1.55;
    flex-shrink: 0;
  }

  .analysis-legend.is-collapsed {
    padding-bottom: 4px;
  }

  /* Loading / error variant */
  .analysis-legend--loading,
  .analysis-legend--error {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--muted);
    padding: 8px 12px;
  }
  .analysis-legend--error { color: var(--danger); background: var(--danger-soft); }

  .spinner {
    width: 12px; height: 12px;
    border: 1.5px solid color-mix(in srgb, var(--muted) 30%, transparent);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* OHLCV row */
  .ohlcv-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 10px 14px;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
  }

  .ohlc {
    display: inline-flex;
    align-items: baseline;
    gap: 5px;
  }

  .ohlc-key {
    color: var(--muted);
    font-size: var(--fs-xs);
    font-weight: 500;
  }

  .ohlc-val {
    color: var(--text);
    font-weight: 600;
    font-size: var(--fs-sm);
  }

  .ohlc-pct {
    font-size: var(--fs-xs);
    font-weight: 500;
  }

  .ohlc-pct.up   { color: var(--success); }
  .ohlc-pct.down { color: var(--danger); }

  /* Indicator list */
  .ind-list {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px dashed color-mix(in srgb, var(--line) 70%, transparent);
  }

  .ind-row {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.01em;
  }

  .ind-row.is-hidden {
    opacity: 0.56;
  }

  .close-x {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--muted);
    border-radius: 4px;
    cursor: pointer;
    flex-shrink: 0;
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }

  .close-x:hover {
    color: var(--danger);
    background: color-mix(in srgb, var(--danger) 15%, transparent);
  }

  .ind-name {
    color: var(--text);
    font-weight: 600;
    font-size: var(--fs-xs);
    margin-right: 2px;
  }

  .ind-period {
    font-weight: 700;
    font-size: var(--fs-xs);
    letter-spacing: 0.01em;
  }

  .ind-sub {
    color: var(--muted);
    font-size: var(--fs-xs);
    font-weight: 500;
  }

  .ind-val {
    color: var(--text);
    font-weight: 600;
    font-size: var(--fs-xs);
  }

  .ind-val--na { color: var(--muted); }
  .ind-val.up   { color: var(--success); }
  .ind-val.down { color: var(--danger); }

  /* Collapse button (bottom-left) */
  .collapse-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    margin-top: 4px;
    width: 22px;
    height: 16px;
    padding: 0;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--input);
    color: var(--muted);
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }

  .collapse-btn:hover {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 50%, var(--line));
  }

  .collapse-btn svg {
    transition: transform var(--dur-base) var(--ease);
  }

  .collapse-btn svg.flipped {
    transform: rotate(180deg);
  }
</style>
