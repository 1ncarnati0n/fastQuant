<script lang="ts">
  import type { AnalysisResponse, FundamentalsResponse, MarketType } from "$lib/api/types";
  import type { Theme } from "$lib/stores/workspace.svelte";
  import ApiStatus from "$lib/components/ApiStatus.svelte";
  import { getKrStockLabel } from "$lib/utils/krStocks";

  let {
    analysis = null,
    fundamentals = null,
    symbol = "",
    market = "usStock" as MarketType,
    loading = false,
    activeMainTab = "chart",
    theme = "light" as Theme,
    onSelectMainTab,
    onToggleTheme,
    onOpenSettings,
    onOpenPalette,
  }: {
    analysis?: AnalysisResponse | null;
    fundamentals?: FundamentalsResponse | null;
    symbol?: string;
    market?: MarketType;
    loading?: boolean;
    activeMainTab?: "chart" | "fundamentals";
    theme?: Theme;
    onSelectMainTab?: (tab: "chart" | "fundamentals") => void;
    onToggleTheme?: () => void;
    onOpenSettings?: () => void;
    onOpenPalette?: () => void;
  } = $props();

  const MARKET_META: Record<MarketType, { label: string; color: string }> = {
    crypto:  { label: "코인", color: "var(--warning)" },
    usStock: { label: "미장", color: "var(--primary)" },
    krStock: { label: "국장", color: "var(--market-kr)" },
    forex:   { label: "FX",   color: "var(--market-fx)" },
  };

  const candles = $derived(analysis?.candles ?? []);
  const last = $derived(candles.at(-1) ?? null);
  const prev = $derived(candles.length > 1 ? candles.at(-2) ?? null : null);
  const hasChange = $derived(last !== null && prev !== null && Number.isFinite(last.close) && Number.isFinite(prev.close));
  const change = $derived(hasChange ? last!.close - prev!.close : null);
  const changePct = $derived(hasChange && prev!.close !== 0 ? (change! / prev!.close) * 100 : null);
  const isUp = $derived(change !== null && change >= 0);
  const meta = $derived(MARKET_META[market] ?? MARKET_META.usStock);

  function fmt(n: number | null | undefined, digits = 2): string {
    if (n == null || !Number.isFinite(n)) return "–";
    const abs = Math.abs(n);
    const d = abs >= 1000 ? 2 : abs >= 1 ? digits : 6;
    return n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d });
  }

  function currencySuffix(): string {
    if (market === "krStock" || fundamentals?.currency === "KRW") return "원";
    if (fundamentals?.currency === "USD") return "$";
    return fundamentals?.currency ?? "";
  }

  function fmtMoney(v: number | null | undefined, digits = 0): string {
    if (v == null || !Number.isFinite(v)) return "—";
    const suffix = currencySuffix();
    const value = v.toLocaleString(undefined, {
      maximumFractionDigits: digits,
      minimumFractionDigits: 0,
    });
    return suffix === "$" ? `$${value}` : `${value}${suffix}`;
  }

  function fmtVolume(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    return `${Math.round(v).toLocaleString()}주`;
  }

  function fmtMarketCap(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    const currency = fundamentals?.currency;
    if (currency === "KRW" || market === "krStock") {
      if (v >= 1e12) return `${(v / 1e12).toFixed(2)}조원`;
      return `${(v / 1e8).toFixed(2)}억`;
    }
    if (currency === "USD" || market === "usStock") {
      if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
      if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
      if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    }
    return v.toLocaleString();
  }

  function rangePercent(value: number | null | undefined, low: number | null | undefined, high: number | null | undefined): number {
    if (value == null || low == null || high == null || high <= low) return 50;
    return Math.max(3, Math.min(97, ((value - low) / (high - low)) * 100));
  }

  const dayLow = $derived(last?.low ?? null);
  const dayHigh = $derived(last?.high ?? null);
  const yearLow = $derived(fundamentals?.fiftyTwoWeekLow ?? null);
  const yearHigh = $derived(fundamentals?.fiftyTwoWeekHigh ?? null);
  const dayPos = $derived(rangePercent(last?.close, dayLow, dayHigh));
  const yearPos = $derived(rangePercent(last?.close, yearLow, yearHigh));
  const krStockLabel = $derived(market === "krStock" ? getKrStockLabel(symbol) : null);
  const symbolName = $derived(market === "krStock" ? (krStockLabel ?? fundamentals?.shortName ?? symbol) : symbol);
  const showSymbolCode = $derived(market === "krStock" && symbolName !== symbol);
</script>

<header class="appbar" class:loading>
  <div class="quote-row">
    <button
      type="button"
      class="symbol-block"
      onclick={onOpenPalette}
      title="심볼 검색 (⌘J)"
      aria-label="심볼 검색"
    >
      <span class="symbol-logo">{(symbolName || "FQ").slice(0, 2)}</span>
      <span class="symbol-copy">
        <span class="symbol-title">
          {#if showSymbolCode}
            <strong>{symbolName}</strong>
            <span class="symbol-code">{symbol}</span>
          {:else}
            <strong>{symbol || "심볼 선택"}</strong>
          {/if}
          <span class="market-chip" style:--badge-color={meta.color}>{meta.label}</span>
        </span>
        <span class="price-line">
          <strong class="quote-price" class:up={isUp} class:down={hasChange && !isUp}>
            {last ? fmt(last.close) : "—"}
          </strong>
          <span class="quote-sub">전일대비</span>
          <span class="quote-change" class:up={isUp} class:down={hasChange && !isUp}>
            {#if change === null}
              —
            {:else}
              {isUp ? "+" : ""}{fmt(change)} ({isUp ? "+" : ""}{changePct?.toFixed(2)}%)
            {/if}
          </span>
        </span>
      </span>
    </button>

    <div class="metrics" aria-label="종목 요약">
      <div class="metric range-metric">
        <div class="range-line">
          <span>1일 범위</span>
          <strong>{fmtMoney(dayLow)}</strong>
          <i style:--pos={`${dayPos}%`}></i>
          <strong>{fmtMoney(dayHigh)}</strong>
        </div>
        <div class="range-line">
          <span>52주 범위</span>
          <strong>{fmtMoney(yearLow)}</strong>
          <i style:--pos={`${yearPos}%`}></i>
          <strong>{fmtMoney(yearHigh)}</strong>
        </div>
      </div>
      <div class="metric compact"><span>거래대금</span><strong>{fmtVolume(fundamentals?.averageVolume)}</strong></div>
      <div class="metric compact"><span>시가총액</span><strong>{fmtMarketCap(fundamentals?.marketCap)}</strong></div>
    </div>
  </div>

  <nav class="tab-row" aria-label="앱 메뉴">
    <button
      type="button"
      class="nav-link"
      class:active={activeMainTab === "chart"}
      onclick={() => onSelectMainTab?.("chart")}
    >종목차트</button>
    <button
      type="button"
      class="nav-link"
      class:active={activeMainTab === "fundamentals"}
      onclick={() => onSelectMainTab?.("fundamentals")}
    >종목정보</button>
    <div class="main-actions">
      <ApiStatus compact />
      <button
        type="button"
        class="icon-btn"
        onclick={onToggleTheme}
        title={theme === "dark" ? "라이트 모드" : "다크 모드"}
      >
        {#if theme === "dark"}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
        {:else}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
        {/if}
      </button>
      <button
        type="button"
        class="icon-btn"
        onclick={onOpenSettings}
        title="설정"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .92 1.7 1.7 0 0 1-3.2 0 1.7 1.7 0 0 0-1-.92 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.92-1 1.7 1.7 0 0 1 0-3.2 1.7 1.7 0 0 0 .92-1 1.7 1.7 0 0 0-.34-1.87l-.06.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.92 1.7 1.7 0 0 1 3.2 0 1.7 1.7 0 0 0 1 .92 1.7 1.7 0 0 0 1.87-.34l.06.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.24.39.57.7.96.89a1.7 1.7 0 0 1 0 3.2c-.39.19-.72.5-.96.91Z" /></svg>
      </button>
    </div>
  </nav>
</header>

<style>
  .appbar {
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 0;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    flex-shrink: 0;
  }

  .appbar.loading {
    opacity: 0.96;
  }

  .quote-row {
    display: grid;
    grid-template-columns: minmax(280px, 390px) minmax(0, 1fr) auto;
    align-items: center;
    padding: 6px 20px 5px;
    gap: 10px;
  }

  .symbol-block {
    display: flex;
    align-items: center;
    gap: 12px;
    min-width: 0;
    border: 0;
    padding: 0;
    background: transparent;
    color: var(--foreground);
    text-align: left;
    cursor: pointer;
  }

  .symbol-logo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--logo-bg);
    color: #fff;
    font-size: var(--fs-2xs);
    font-weight: 800;
    letter-spacing: -0.02em;
    flex-shrink: 0;
  }

  .symbol-copy {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .symbol-title {
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--muted-fore);
    font-size: var(--fs-base);
  }

  .symbol-title strong {
    color: var(--foreground);
    font-size: var(--fs-lg);
    letter-spacing: -0.02em;
  }

  .symbol-code {
    color: var(--muted-fore);
    font-size: var(--fs-xs);
    font-weight: 500;
    letter-spacing: 0.03em;
  }

  .market-chip {
    padding: 5px 9px;
    border-radius: var(--radius-md);
    background: var(--muted-bg);
    color: var(--foreground);
    font-size: var(--fs-xs);
    font-weight: 700;
  }

  .price-line {
    display: flex;
    align-items: baseline;
    gap: 7px;
    white-space: nowrap;
  }

  .quote-price {
    color: var(--foreground);
    font-size: var(--fs-3xl);
    line-height: 1;
    font-weight: 800;
    letter-spacing: -0.04em;
  }

  .quote-sub {
    color: var(--muted-fore);
    font-size: var(--fs-sm);
  }

  .quote-change {
    font-size: var(--fs-md);
    font-weight: 700;
  }

  .metrics {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 0;
    margin-left: auto;
    min-width: 0;
    overflow: hidden;
  }

  .metric {
    display: grid;
    grid-template-columns: auto auto 52px auto;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 0 10px;
    border-left: 1px solid var(--border);
    color: var(--muted-fore);
    font-size: var(--fs-xs);
  }

  .metric.range-metric {
    display: grid;
    grid-template-columns: 56px auto 52px auto;
    grid-template-rows: auto auto;
    align-items: center;
    column-gap: 6px;
    row-gap: 4px;
    min-width: 0;
  }

  .range-line {
    display: contents;
  }

  .range-line > span {
    white-space: nowrap;
  }

  .metric.compact {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    align-items: flex-start;
  }

  .metric strong {
    color: var(--metric-value);
    font-size: var(--fs-sm);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    font-feature-settings: "tnum" 1;
    white-space: nowrap;
  }

  .metric i {
    height: 4px;
    border-radius: var(--radius-full);
    background:
      linear-gradient(90deg,
        var(--range-track) 0%,
        var(--range-track) calc(var(--pos, 50%) - 1.5px),
        var(--range-needle) calc(var(--pos, 50%) - 1.5px),
        var(--range-needle) calc(var(--pos, 50%) + 1.5px),
        var(--range-track) calc(var(--pos, 50%) + 1.5px));
  }


  .tab-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 1px 20px 4px;
    border-top: 1px solid transparent;
    flex-wrap: wrap;
  }

  .nav-link {
    border: 0;
    padding: 8px 12px;
    border-radius: var(--radius-md);
    background: transparent;
    font-size: var(--fs-base);
    font-weight: 700;
    color: var(--nav-inactive);
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }

  .nav-link:hover { color: var(--foreground); background: var(--muted-bg); }
  .nav-link.active { color: var(--foreground); background: var(--muted-bg); }

  @keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }

  .main-actions {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
    margin-left: auto;
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--muted-bg);
    color: var(--muted-fore);
    cursor: pointer;
    transition: all var(--dur-fast) var(--ease);
  }

  .icon-btn:hover {
    color: var(--foreground);
    border-color: color-mix(in srgb, var(--primary) 50%, var(--border));
    background: var(--primary-soft);
  }


  /* ── Responsive ── */
  @media (max-width: 1180px) {
    .quote-row {
      grid-template-columns: minmax(250px, 340px) minmax(0, 1fr);
    }


    .metrics {
      display: grid;
      grid-template-columns: repeat(3, minmax(96px, 1fr));
      row-gap: 8px;
      margin-left: 0;
    }

    .metric.range-metric {
      grid-column: span 3;
    }

    .main-actions {
      margin-left: 0;
    }
  }

  @media (max-width: 760px) {
    .quote-row {
      grid-template-columns: 1fr;
      gap: 10px;
      padding: 10px 12px 8px;
    }

    .metrics {
      display: grid;
      grid-template-columns: 1fr 1fr;
      overflow: visible;
      margin-left: 0;
    }

    .metric {
      grid-column: auto;
      padding: 8px 10px;
      border-left: 0;
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      background: var(--surface);
    }


    .metric.range-metric {
      grid-column: 1 / -1;
    }

    .tab-row {
      overflow-x: auto;
      padding: 0 12px;
    }

    .main-actions {
      justify-content: flex-end;
      width: 100%;
    }
  }
</style>
