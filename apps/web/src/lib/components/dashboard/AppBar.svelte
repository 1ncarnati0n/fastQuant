<script lang="ts">
  import type { AnalysisResponse, FundamentalsResponse, MarketType } from "$lib/api/types";
  import { workspace } from "$lib/stores/workspace.svelte";
  import ApiStatus from "$lib/components/ApiStatus.svelte";

  let {
    analysis = null,
    fundamentals = null,
    symbol = "",
    market = "usStock" as MarketType,
    loading = false,
    activeMainTab = "chart",
    onSelectMainTab,
    onOpenSettings,
    onOpenPalette,
    onOpenDockTab,
    dockOpen = true,
    activeDockTab = "watchlist",
  }: {
    analysis?: AnalysisResponse | null;
    fundamentals?: FundamentalsResponse | null;
    symbol?: string;
    market?: MarketType;
    loading?: boolean;
    activeMainTab?: "chart" | "fundamentals";
    onSelectMainTab?: (tab: "chart" | "fundamentals") => void;
    onOpenSettings?: () => void;
    onOpenPalette?: () => void;
    onOpenDockTab?: (tab: "watchlist" | "indicators" | "strategy" | "fundamentals" | "settings") => void;
    dockOpen?: boolean;
    activeDockTab?: "watchlist" | "indicators" | "strategy" | "fundamentals" | "settings";
  } = $props();

  const MARKET_META: Record<MarketType, { label: string; color: string }> = {
    crypto:  { label: "코인", color: "#f59e0b" },
    usStock: { label: "미장", color: "var(--primary)" },
    krStock: { label: "국장", color: "#ec4899" },
    forex:   { label: "FX",   color: "#14b8a6" },
  };

  const candles = $derived(analysis?.candles ?? []);
  const last = $derived(candles.at(-1) ?? null);
  const prev = $derived(candles.length > 1 ? candles.at(-2) ?? null : null);
  const change = $derived(last && prev ? last.close - prev.close : 0);
  const changePct = $derived(last && prev && prev.close !== 0 ? (change / prev.close) * 100 : 0);
  const isUp = $derived(change >= 0);
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
      <span class="symbol-logo">{symbol.slice(0, 2) || "FQ"}</span>
      <span class="symbol-copy">
        <span class="symbol-title">
          <strong>{symbol || "심볼 선택"}</strong>
          <span class="market-chip" style:--badge-color={meta.color}>{meta.label}</span>
        </span>
        <span class="price-line">
          <strong class="quote-price" class:up={isUp} class:down={!isUp}>
            {last ? fmt(last.close) : "—"}
          </strong>
          <span class="quote-sub">전일대비</span>
          <span class="quote-change" class:up={isUp} class:down={!isUp}>
            {isUp ? "+" : ""}{fmt(change)} ({isUp ? "+" : ""}{changePct.toFixed(2)}%)
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

    <div class="quick-actions">
      <button type="button" class="round-btn" title="알림">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      </button>
      <button type="button" class="round-btn" title="관심">
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.35-9.33-8.2C.36 8.96 2.4 4.5 6.7 4.5c2.1 0 3.47 1.02 4.3 2.07.83-1.05 2.2-2.07 4.3-2.07 4.3 0 6.34 4.46 4.03 8.3C19 16.65 12 21 12 21Z"/></svg>
      </button>
      <button type="button" class="invest-btn">내 투자</button>
    </div>
  </div>

  <nav class="tab-row" aria-label="앱 메뉴">
    <button
      type="button"
      class="nav-link"
      class:active={activeMainTab === "chart"}
      onclick={() => onSelectMainTab?.("chart")}
    >차트 · 호가</button>
    <button
      type="button"
      class="nav-link"
      class:active={activeMainTab === "fundamentals"}
      onclick={() => onSelectMainTab?.("fundamentals")}
    >종목정보</button>
    <div class="main-actions">
      <ApiStatus compact />
      <div class="panel-switcher" role="group" aria-label="우측 패널">
        <button
          type="button"
          class="icon-btn panel-btn"
          class:active={dockOpen && activeDockTab === "watchlist"}
          onclick={() => onOpenDockTab?.("watchlist")}
          title="관심종목"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5h16M4 12h16M4 19h10" /></svg>
        </button>
        <button
          type="button"
          class="icon-btn panel-btn"
          class:active={dockOpen && activeDockTab === "fundamentals"}
          onclick={() => onOpenDockTab?.("fundamentals")}
          title="펀더멘털"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18" /><path d="M18 17V9M13 17V5M8 17v-4" /></svg>
        </button>
        <button
          type="button"
          class="icon-btn panel-btn"
          class:active={dockOpen && activeDockTab === "strategy"}
          onclick={() => onOpenDockTab?.("strategy")}
          title="전략"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19V5M4 19h16" /><path d="m8 15 3-3 3 2 5-7" /></svg>
        </button>
      </div>
      <button
        type="button"
        class="icon-btn"
        onclick={() => workspace.toggleTheme()}
        title={workspace.theme === "dark" ? "라이트 모드" : "다크 모드"}
      >
        {#if workspace.theme === "dark"}
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
    background: #1d4ed8;
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

  .market-chip {
    padding: 5px 9px;
    border-radius: 8px;
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
    display: grid;
    grid-template-columns: minmax(260px, 1fr) repeat(2, minmax(88px, auto));
    align-items: center;
    justify-content: flex-end;
    gap: 0;
    min-width: 0;
    overflow: hidden;
  }

  .metric {
    display: grid;
    grid-template-columns: auto auto minmax(54px, 82px) auto;
    align-items: center;
    gap: 6px;
    min-width: 0;
    padding: 0 10px;
    border-left: 1px solid var(--border);
    color: var(--muted-fore);
    font-size: var(--fs-xs);
  }

  .metric.range-metric {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .range-line {
    display: grid;
    grid-template-columns: 48px minmax(54px, auto) minmax(54px, 82px) minmax(54px, auto);
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  .metric.compact {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
    align-items: flex-start;
  }

  .metric strong {
    color: #596171;
    font-size: var(--fs-sm);
    font-weight: 700;
  }

  .metric i {
    height: 4px;
    border-radius: 999px;
    background:
      linear-gradient(90deg,
        #e4e9f0 0%,
        #e4e9f0 calc(var(--pos, 50%) - 1.5px),
        #11a36a calc(var(--pos, 50%) - 1.5px),
        #11a36a calc(var(--pos, 50%) + 1.5px),
        #e4e9f0 calc(var(--pos, 50%) + 1.5px));
  }

  .quick-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .round-btn,
  .invest-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    border: 0;
    border-radius: 8px;
    background: var(--muted-bg);
    color: #9aa3af;
    cursor: pointer;
  }

  .round-btn {
    width: 34px;
  }

  .invest-btn {
    min-width: 74px;
    padding: 0 12px;
    color: var(--muted-fore);
    font-size: var(--fs-sm);
    font-weight: 700;
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
    border-radius: 8px;
    background: transparent;
    font-size: var(--fs-base);
    font-weight: 700;
    color: #333a45;
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

  .panel-switcher {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 2px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--input);
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

  .icon-btn.active {
    color: var(--primary);
    border-color: color-mix(in srgb, var(--primary) 44%, transparent);
    background: var(--primary-soft);
  }

  .panel-btn {
    width: 30px;
    height: 30px;
    border-color: transparent;
    background: transparent;
  }

  /* ── Responsive ── */
  @media (max-width: 1180px) {
    .quote-row {
      grid-template-columns: minmax(250px, 340px) minmax(0, 1fr);
    }

    .quick-actions {
      display: none;
    }

    .metrics {
      grid-template-columns: repeat(3, minmax(96px, 1fr));
      row-gap: 8px;
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
      grid-template-columns: 1fr 1fr;
      overflow: visible;
    }

    .metric {
      grid-column: auto;
      padding: 8px 10px;
      border-left: 0;
      border: 1px solid var(--border);
      border-radius: 8px;
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
