<script lang="ts">
  import type { FundamentalsResponse, MarketType } from "$lib/api/types";

  let {
    symbol,
    market,
    data = null,
    loading = false,
    error = null,
  }: {
    symbol: string;
    market: MarketType;
    data?: FundamentalsResponse | null;
    loading?: boolean;
    error?: string | null;
  } = $props();

  function fmtCap(v: number | null | undefined): string {
    if (v == null) return "—";
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    return `$${v.toFixed(0)}`;
  }

  function fmtNum(v: number | null | undefined, digits = 2): string {
    return v == null ? "—" : v.toFixed(digits);
  }

  function fmtPct(v: number | null | undefined): string {
    return v == null ? "—" : `${(v * 100).toFixed(2)}%`;
  }

  function fmtVol(v: number | null | undefined): string {
    if (v == null) return "—";
    if (v >= 1e6) return `${(v / 1e6).toFixed(1)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(1)}K`;
    return v.toFixed(0);
  }

  const sections = $derived.by(() => {
    if (!data) return [];
    return [
      {
        title: "밸류에이션",
        rows: [
          { label: "시가총액", value: fmtCap(data.marketCap) },
          { label: "Trailing P/E", value: fmtNum(data.trailingPe) },
          { label: "Forward P/E", value: fmtNum(data.forwardPe) },
          { label: "P/B", value: fmtNum(data.priceToBook) },
        ],
      },
      {
        title: "주당 지표",
        rows: [
          { label: "EPS (TTM)", value: fmtNum(data.trailingEps) },
          { label: "EPS (Forward)", value: fmtNum(data.forwardEps) },
          { label: "배당 수익률", value: fmtPct(data.dividendYield) },
        ],
      },
      {
        title: "수익성",
        rows: [
          { label: "자기자본이익률", value: fmtPct(data.returnOnEquity) },
          { label: "매출총이익률", value: fmtPct(data.grossMargins) },
          { label: "영업이익률", value: fmtPct(data.operatingMargins) },
          { label: "순이익률", value: fmtPct(data.profitMargins) },
        ],
      },
      {
        title: "재무 건전성",
        rows: [
          { label: "부채비율 (D/E)", value: fmtNum(data.debtToEquity) },
          { label: "매출 성장률", value: fmtPct(data.revenueGrowth) },
        ],
      },
      {
        title: "가격 범위",
        rows: [
          { label: "52주 최고", value: fmtNum(data.fiftyTwoWeekHigh) },
          { label: "52주 최저", value: fmtNum(data.fiftyTwoWeekLow) },
          { label: "평균 거래량", value: fmtVol(data.averageVolume) },
        ],
      },
    ];
  });
</script>

<div class="panel">
  {#if loading}
    <div class="state-msg">
      <div class="spinner" aria-label="로딩 중"></div>
      <span>불러오는 중…</span>
    </div>
  {:else if error}
    <div class="state-msg error">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
      </svg>
      <span>{error}</span>
    </div>
  {:else if data}
    <div class="header">
      <div class="company-name">{data.shortName ?? symbol}</div>
      <div class="meta">{symbol} · {data.currency ?? "—"}</div>
    </div>

    {#each sections as section}
      <div class="section">
        <div class="section-title">{section.title}</div>
        <div class="rows">
          {#each section.rows as row}
            <div class="row">
              <span class="row-label">{row.label}</span>
              <span class="row-value" class:dash={row.value === "—"}>{row.value}</span>
            </div>
          {/each}
        </div>
      </div>
    {/each}
  {:else}
    <div class="state-msg">데이터 없음</div>
  {/if}
</div>

<style>
  .panel {
    padding: 10px 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .state-msg {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 32px 12px;
    color: var(--muted);
    font-size: var(--fs-sm);
  }

  .state-msg.error { color: var(--danger); }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--line);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .header {
    padding: 8px 0 4px;
    border-bottom: 1px solid var(--line-soft);
  }

  .company-name {
    font-size: var(--fs-md);
    font-weight: 600;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .meta {
    font-size: var(--fs-sm);
    color: var(--muted);
    margin-top: 2px;
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .section-title {
    font-size: var(--fs-xs);
    font-weight: 600;
    color: var(--muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 2px 0 4px;
    border-bottom: 1px solid var(--line-soft);
    margin-bottom: 2px;
  }

  .rows { display: flex; flex-direction: column; gap: 1px; }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 4px 0;
    font-size: var(--fs-sm);
  }

  .row-label { color: var(--muted); }

  .row-value {
    font-weight: 500;
    color: var(--text);
    font-variant-numeric: tabular-nums;
  }

  .row-value.dash { color: var(--muted); font-weight: 400; }
</style>
