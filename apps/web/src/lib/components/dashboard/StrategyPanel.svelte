<script lang="ts">
  import type { AnalysisParams } from "$lib/api/types";
  import Toggle from "$lib/components/ui/Toggle.svelte";

  let {
    params,
    onParamsChange,
  }: {
    params: AnalysisParams;
    onParamsChange: (next: AnalysisParams) => void;
  } = $props();

  const SIGNAL_ITEMS = [
    { key: "supertrendAdx",    label: "Supertrend + ADX",   hint: "추세 강도 기반 진입" },
    { key: "emaCrossover",     label: "EMA Crossover",      hint: "단기/장기 EMA 교차" },
    { key: "stochRsiCombined", label: "Stoch + RSI",        hint: "이중 오실레이터 확인" },
    { key: "cmfObv",           label: "CMF + OBV",          hint: "자금 흐름 확인" },
    { key: "ttmSqueeze",       label: "TTM Squeeze",        hint: "변동성 압축 돌파" },
    { key: "vwapBreakout",     label: "VWAP Breakout",      hint: "VWAP 돌파 진입" },
    { key: "parabolicSar",     label: "SAR Reversal",       hint: "Parabolic SAR 전환" },
    { key: "macdHistReversal", label: "MACD Histogram",     hint: "히스토그램 방향 전환" },
    { key: "ibsMeanReversion", label: "IBS Mean Reversion", hint: "내부 바 강도" },
    { key: "rsiDivergence",    label: "RSI Divergence",     hint: "가격-RSI 다이버전스" },
  ] as const;

  function isOn(key: string): boolean {
    return Boolean((params.signalStrategies as Record<string, unknown>)?.[key]);
  }

  function toggleSignal(key: string) {
    const snap = $state.snapshot(params) as AnalysisParams;
    const strategies = { ...(snap.signalStrategies as Record<string, unknown>) };
    strategies[key] = !Boolean(strategies[key]);
    onParamsChange({ ...snap, signalStrategies: strategies });
  }
</script>

<div class="panel">
  <div class="section-label">전략 시그널</div>
  <p class="section-desc">활성화된 전략이 조건을 충족하면 차트에 신호를 표시합니다.</p>

  <div class="signal-list">
    {#each SIGNAL_ITEMS as item}
      <div class="signal-row">
        <div class="signal-copy">
          <span class="signal-name">{item.label}</span>
          <span class="signal-hint">{item.hint}</span>
        </div>
        <Toggle
          checked={isOn(item.key)}
          size="sm"
          onchange={() => toggleSignal(item.key)}
        />
      </div>
    {/each}
  </div>
</div>

<style>
  .panel {
    display: flex;
    flex-direction: column;
    padding: 8px 0;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
  }

  .section-label {
    padding: 10px 16px 4px;
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted-fore);
  }

  .section-desc {
    padding: 0 16px 10px;
    font-size: var(--fs-xs);
    color: var(--muted-fore);
    line-height: 1.5;
    margin: 0;
    border-bottom: 1px solid var(--border);
  }

  .signal-list {
    display: flex;
    flex-direction: column;
  }

  .signal-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 10px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
    transition: background var(--dur-fast) var(--ease);
  }

  .signal-row:last-child {
    border-bottom: none;
  }

  .signal-row:hover {
    background: color-mix(in srgb, var(--primary) 5%, transparent);
  }

  .signal-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .signal-name {
    font-size: var(--fs-sm);
    font-weight: 600;
    color: var(--foreground);
  }

  .signal-hint {
    font-size: var(--fs-xs);
    color: var(--muted-fore);
  }
</style>
