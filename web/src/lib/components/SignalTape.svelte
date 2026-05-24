<script lang="ts">
  import type { AnalysisResponse } from "$lib/api/types";

  let { analysis = null }: { analysis?: AnalysisResponse | null } = $props();

  const latest = $derived(analysis?.candles.at(-1) ?? null);
  const previous = $derived(analysis && analysis.candles.length > 1 ? analysis.candles.at(-2) : null);
  const change = $derived(latest && previous ? latest.close - previous.close : 0);
  const changePct = $derived(latest && previous && previous.close !== 0 ? (change / previous.close) * 100 : 0);
  const signals = $derived(analysis?.signals.slice(-6).reverse() ?? []);

  function fmtChange(v: number): string {
    return `${v >= 0 ? "+" : ""}${v.toFixed(2)}`;
  }
</script>

<section class="tape" aria-label="Market status">
  <div class="quote">
    <span>Last</span>
    <strong class:up={change >= 0} class:down={change < 0}>
      {latest ? latest.close.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}
    </strong>
    <small class:up={change >= 0} class:down={change < 0}>
      {fmtChange(change)} · {fmtChange(changePct)}%
    </small>
  </div>

  <div class="items">
    <div>
      <span>Volume</span>
      <strong>{latest ? latest.volume.toLocaleString() : "—"}</strong>
    </div>
    <div>
      <span>High</span>
      <strong>{latest ? latest.high.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}</strong>
    </div>
    <div>
      <span>Low</span>
      <strong>{latest ? latest.low.toLocaleString(undefined, { maximumFractionDigits: 6 }) : "—"}</strong>
    </div>
    <div>
      <span>Signals</span>
      <strong>{analysis?.signals.length ?? 0}</strong>
    </div>
  </div>

  <div class="signals">
    {#if signals.length === 0}
      <span class="no-signal">활성 시그널 없음</span>
    {:else}
      {#each signals as sig}
        {@const isBuy = sig.signalType.toLowerCase().includes("bull") || sig.signalType.toLowerCase().includes("oversold")}
        <mark class:buy={isBuy} class:sell={!isBuy}>
          {sig.signalType.replace(/_/g, " ")}
        </mark>
      {/each}
    {/if}
  </div>
</section>

<style>
  .tape {
    display: grid;
    grid-template-columns: 180px minmax(0, 1fr) 240px;
    gap: 1px;
    border-top: 1px solid var(--line-soft);
    background: var(--line-soft);
  }

  .quote,
  .items,
  .signals {
    background: var(--surface);
    padding: 12px 14px;
  }

  .quote span,
  .items span {
    color: var(--muted);
    font-size: var(--fs-xs);
  }

  .quote strong {
    display: block;
    margin-top: 3px;
    font-size: var(--fs-2xl);
    line-height: 1.1;
  }

  small {
    display: block;
    margin-top: 2px;
    font-size: var(--fs-sm);
    font-weight: 700;
  }

  .up { color: var(--success); }
  .down { color: var(--danger); }

  .items {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 12px;
  }

  .items strong {
    display: block;
    margin-top: 5px;
    font-size: var(--fs-base);
    overflow-wrap: anywhere;
  }

  .signals {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-content: center;
  }

  .no-signal {
    font-size: var(--fs-sm);
    color: var(--muted);
  }

  mark {
    border-radius: 999px;
    padding: 3px 8px;
    font-size: var(--fs-xs);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  mark.buy { background: rgba(11, 218, 94, 0.15); color: var(--success); }
  mark.sell { background: rgba(250, 98, 56, 0.15); color: var(--danger); }

  @media (max-width: 980px) {
    .tape { grid-template-columns: 1fr; }
  }

  @media (max-width: 560px) {
    .items { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  }
</style>
