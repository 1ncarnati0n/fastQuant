<script lang="ts">
  import type { FundamentalsResponse, MarketType } from "$lib/api/types";

  let {
    symbol = "",
    market = "usStock" as MarketType,
    fundamentals = null,
    loading = false,
    error = null,
  }: {
    symbol?: string;
    market?: MarketType;
    fundamentals?: FundamentalsResponse | null;
    loading?: boolean;
    error?: string | null;
  } = $props();

  function fmtNum(v: number | null | undefined, digits = 2): string {
    if (v == null || !Number.isFinite(v)) return "—";
    return v.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: digits });
  }

  function fmtPct(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    return `${(v * 100).toFixed(2)}%`;
  }

  function fmtCap(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    const currency = fundamentals?.currency ?? (market === "krStock" ? "KRW" : "USD");
    if (currency === "KRW") {
      if (v >= 1e12) return `${(v / 1e12).toFixed(2)}조원`;
      return `${(v / 1e8).toFixed(2)}억원`;
    }
    if (v >= 1e12) return `$${(v / 1e12).toFixed(2)}T`;
    if (v >= 1e9) return `$${(v / 1e9).toFixed(2)}B`;
    if (v >= 1e6) return `$${(v / 1e6).toFixed(2)}M`;
    return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  }

  function fmtVol(v: number | null | undefined): string {
    if (v == null || !Number.isFinite(v)) return "—";
    if (v >= 1e6) return `${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `${(v / 1e3).toFixed(2)}K`;
    return v.toLocaleString(undefined, { maximumFractionDigits: 0 });
  }

  const sections = $derived.by(() => {
    if (!fundamentals) return [];
    return [
      {
        title: "밸류에이션",
        rows: [
          { label: "시가총액", value: fmtCap(fundamentals.marketCap) },
          { label: "Trailing PER", value: fmtNum(fundamentals.trailingPe) },
          { label: "Forward PER", value: fmtNum(fundamentals.forwardPe) },
          { label: "PBR", value: fmtNum(fundamentals.priceToBook) },
        ],
      },
      {
        title: "주당 지표",
        rows: [
          { label: "EPS (TTM)", value: fmtNum(fundamentals.trailingEps) },
          { label: "EPS (Forward)", value: fmtNum(fundamentals.forwardEps) },
          { label: "배당수익률", value: fmtPct(fundamentals.dividendYield) },
        ],
      },
      {
        title: "수익성",
        rows: [
          { label: "ROE", value: fmtPct(fundamentals.returnOnEquity) },
          { label: "매출총이익률", value: fmtPct(fundamentals.grossMargins) },
          { label: "영업이익률", value: fmtPct(fundamentals.operatingMargins) },
          { label: "순이익률", value: fmtPct(fundamentals.profitMargins) },
        ],
      },
      {
        title: "성장/건전성",
        rows: [
          { label: "부채비율 (D/E)", value: fmtNum(fundamentals.debtToEquity) },
          { label: "매출성장률", value: fmtPct(fundamentals.revenueGrowth) },
          { label: "평균 거래량", value: fmtVol(fundamentals.averageVolume) },
        ],
      },
      {
        title: "52주 범위",
        rows: [
          { label: "52주 고가", value: fmtNum(fundamentals.fiftyTwoWeekHigh) },
          { label: "52주 저가", value: fmtNum(fundamentals.fiftyTwoWeekLow) },
        ],
      },
    ];
  });
</script>

<section class="fund-shell" aria-label="종목정보">
  {#if loading}
    <div class="state">데이터를 불러오는 중…</div>
  {:else if error}
    <div class="state state--error">{error}</div>
  {:else if !fundamentals}
    <div class="state">펀더멘털 데이터가 없습니다.</div>
  {:else}
    <header class="head">
      <h2>{fundamentals.shortName ?? symbol}</h2>
      <p>{symbol} · {fundamentals.currency ?? "—"}</p>
    </header>

    <div class="grid">
      {#each sections as section}
        <section class="block">
          <h3>{section.title}</h3>
          {#each section.rows as row}
            <div class="row">
              <span>{row.label}</span>
              <strong>{row.value}</strong>
            </div>
          {/each}
        </section>
      {/each}
    </div>
  {/if}
</section>

<style>
  .fund-shell {
    padding: 18px 20px;
    overflow: auto;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: var(--chart-bg);
  }

  .state {
    color: var(--muted-fore);
    font-size: var(--fs-md);
    padding: 6px 2px;
  }

  .state--error {
    color: var(--danger);
  }

  .head h2 {
    margin: 0;
    font-size: var(--fs-xl);
    font-weight: 800;
    color: var(--foreground);
    letter-spacing: -0.01em;
  }

  .head p {
    margin: 5px 0 0;
    color: var(--muted-fore);
    font-size: var(--fs-sm);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(280px, 1fr));
    gap: 10px;
  }

  .block {
    border: 1px solid var(--border);
    border-radius: 8px;
    background: color-mix(in srgb, var(--card) 96%, white 4%);
    padding: 10px 12px;
  }

  .block h3 {
    margin: 0 0 8px;
    font-size: var(--fs-xs);
    color: var(--muted-fore);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 4px 0;
    font-size: var(--fs-base);
  }

  .row span {
    color: var(--muted-fore);
  }

  .row strong {
    color: var(--foreground);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 960px) {
    .grid {
      grid-template-columns: 1fr;
    }

    .fund-shell {
      padding: 14px 12px;
    }
  }
</style>
