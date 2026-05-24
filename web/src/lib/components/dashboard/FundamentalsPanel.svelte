<script lang="ts">
  import StateMessage from "$lib/ui/StateMessage.svelte";
  import type { FundamentalsResponse, MarketType } from "$lib/api/types";
  import { getKrStockLabel } from "$lib/utils/krStocks";

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
    const currency = data?.currency ?? (market === "krStock" ? "KRW" : "USD");
    if (currency === "KRW" || market === "krStock") {
      if (v >= 1e12) return `${(v / 1e12).toFixed(2)}조원`;
      return `${(v / 1e8).toFixed(2)}억원`;
    }
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
  const krStockLabel = $derived(market === "krStock" ? getKrStockLabel(symbol) : null);
  const companyName = $derived(krStockLabel ?? data?.shortName ?? symbol);
</script>

<div class="panel">
  {#if loading}
    <StateMessage kind="loading" message="불러오는 중..." compact />
  {:else if error}
    <StateMessage kind="error" message={error} compact />
  {:else if data}
    <div class="header">
      <div class="company-name">{companyName}</div>
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
    <StateMessage kind="empty" message="데이터 없음" compact />
  {/if}
</div>

<style>
  .panel {
    padding: 10px 12px 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

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
