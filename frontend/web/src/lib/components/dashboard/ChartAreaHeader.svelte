<script lang="ts">
  import { chart, CHART_TYPE_LABELS } from "$lib/stores/chart.svelte";
  import { drawing } from "$lib/stores/drawing.svelte";
  import DropdownMenu, { type DropdownItem } from "$lib/ui/DropdownMenu.svelte";
  import {
    CHART_TYPE_ORDER,
    DRAWING_TOOLS,
    MINUTE_INTERVALS,
    PERIOD_INTERVALS,
  } from "$lib/features/chart/controlConfig";

  let {
    interval = "1d",
    loading = false,
    indicatorCount = 0,
    onSelectInterval,
    onRefresh,
    onOpenIndicators,
  }: {
    interval?: string;
    loading?: boolean;
    indicatorCount?: number;
    onSelectInterval?: (iv: string) => void;
    onRefresh?: () => void;
    onOpenIndicators?: () => void;
  } = $props();

  const chartTypeItems: DropdownItem[] = $derived(
    CHART_TYPE_ORDER.map((key) => ({
      key,
      label: CHART_TYPE_LABELS[key],
      active: chart.chartType === key,
      onSelect: () => chart.setChartType(key),
    })),
  );

  const drawingItems: DropdownItem[] = $derived(
    DRAWING_TOOLS.map((it) => ({
      key: it.key,
      label: it.label,
      active: drawing.activeTool === it.key,
      onSelect: () => drawing.setTool(it.key),
    })),
  );

  const minuteItems: DropdownItem[] = $derived(
    MINUTE_INTERVALS.map((it) => ({
      key: it.key,
      label: it.label,
      active: interval === it.key,
      onSelect: () => onSelectInterval?.(it.key),
    })),
  );

  const minuteLabel = $derived(
    MINUTE_INTERVALS.find((it) => it.key === interval)?.label ?? "분봉",
  );
  const isDrawing = $derived(drawing.activeTool !== "none");
</script>

<div class="chart-area-head">
  <div class="left-controls">
    <div class="intervals" role="group" aria-label="차트 인터벌">
      <DropdownMenu
        items={minuteItems}
        triggerAriaLabel="분봉 선택"
        triggerTitle="분봉 선택"
        contentClass="minute-menu"
      >
        {#snippet trigger({ isOpen })}
          <span class="iv iv--dropdown" class:active={minuteLabel !== "분봉"} class:open={isOpen}>
            {minuteLabel}
            <svg class="caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9" /></svg>
          </span>
        {/snippet}
      </DropdownMenu>
      {#each PERIOD_INTERVALS as iv}
        <button
          type="button"
          class="iv"
          class:active={interval === iv.key}
          onclick={() => onSelectInterval?.(iv.key)}
        >{iv.label}</button>
      {/each}
    </div>

    <DropdownMenu items={chartTypeItems} triggerAriaLabel="차트 타입">
      {#snippet trigger({ isOpen })}
        <span class="tool" class:active={isOpen} title="차트 타입">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <line x1="8" y1="4" x2="8" y2="20" stroke="var(--candle-up)" stroke-width="2" stroke-linecap="round" />
            <rect x="5.5" y="8" width="5" height="7" rx="1" fill="var(--candle-up)" />
            <line x1="16" y1="4" x2="16" y2="20" stroke="var(--candle-down)" stroke-width="2" stroke-linecap="round" />
            <rect x="13.5" y="6" width="5" height="8" rx="1" fill="var(--candle-down)" />
          </svg>
          <svg class="caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9" /></svg>
        </span>
      {/snippet}
    </DropdownMenu>

    <button
      type="button"
      class="tool"
      onclick={onRefresh}
      disabled={loading}
      title="새로고침"
    >
      <svg class:spinning={loading} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M8 16H3v5" />
      </svg>
    </button>

    <button
      type="button"
      class="tool tool--label tool--indicator"
      class:has-count={indicatorCount > 0}
      onclick={onOpenIndicators}
      title="보조지표"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M4 19h16M7 16V9M12 16V5M17 16v-6" />
      </svg>
      <span>보조지표</span>
      {#if indicatorCount > 0}
        <span class="count-badge">{indicatorCount}</span>
      {/if}
    </button>
  </div>

  <div class="tools">
    <DropdownMenu items={drawingItems} triggerAriaLabel="그리기 도구">
      {#snippet trigger({ isOpen })}
        <span class="tool tool--label" class:active={isDrawing || isOpen} title="그리기">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <circle cx="5" cy="18" r="1.8" />
            <circle cx="19" cy="6" r="1.8" />
            <path d="M6.5 16.5 17.5 7.5" />
          </svg>
          <span>그리기</span>
          <svg class="caret" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9" /></svg>
        </span>
      {/snippet}
    </DropdownMenu>

    <button
      type="button"
      class="tool"
      disabled={drawing.drawings.length === 0}
      onclick={() => {
        if (drawing.selectedId) drawing.remove(drawing.selectedId);
        else if (drawing.drawings.length > 0) drawing.undo();
      }}
      title="드로잉 삭제/되돌리기"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      </svg>
    </button>
  </div>
</div>

<style>
  .chart-area-head {
    display: grid;
    grid-template-columns: minmax(0, auto) minmax(180px, 1fr);
    align-items: center;
    min-height: 50px;
    padding: 0 14px;
    gap: 14px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 62%, transparent);
    background: color-mix(in srgb, var(--card) 96%, var(--chart-bg));
    box-shadow: 0 4px 14px color-mix(in srgb, var(--foreground) 8%, transparent);
  }

  .left-controls {
    display: flex;
    align-items: center;
    gap: 8px;
    min-width: 0;
  }

  .intervals {
    display: flex;
    align-items: center;
    gap: 1px;
    justify-content: center;
    padding: 2px;
    border: 0;
    border-radius: 0;
    background: transparent;
  }

  .iv {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    height: 34px;
    padding: 8px 11px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--muted-fore);
    font: inherit;
    font-size: var(--fs-base);
    font-weight: 700;
    cursor: pointer;
    transition: all var(--dur-fast) var(--ease);
  }

  .iv--dropdown {
    gap: 5px;
    min-width: 62px;
    padding: 0 10px 0 12px;
  }

  .iv--dropdown .caret {
    width: 9px;
    height: 9px;
    flex: 0 0 auto;
    margin-top: 1px;
  }

  .iv:hover { color: var(--foreground); background: var(--muted-bg); }
  .iv.active,
  .iv.open {
    color: var(--foreground);
    background: var(--muted-bg);
    border-color: transparent;
  }

  :global(.minute-menu) {
    min-width: 184px;
    padding: 10px 0;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--card);
    box-shadow: var(--shadow-lg);
  }

  :global(.minute-menu .dd-item) {
    min-height: 48px;
    padding: 0 24px;
    border-radius: 0;
    color: var(--text);
    font-size: var(--fs-xl);
    font-weight: 700;
    letter-spacing: 0;
  }

  :global(.minute-menu .dd-item[data-highlighted]),
  :global(.minute-menu .dd-item:hover) {
    background: var(--muted-bg);
  }

  :global(.minute-menu .dd-item.is-active) {
    color: var(--primary);
    background: var(--primary-soft);
  }

  .tools {
    display: flex;
    align-items: center;
    gap: 2px;
    justify-content: flex-end;
    min-width: 0;
    overflow-x: auto;
    scrollbar-width: none;
  }

  .tools::-webkit-scrollbar { display: none; }

  .tool {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 34px;
    padding: 0 10px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--muted-fore);
    cursor: pointer;
    font: inherit;
    font-size: var(--fs-base);
    font-weight: 800;
    transition: all var(--dur-fast) var(--ease);
    white-space: nowrap;
  }

  .tool:hover:not(:disabled) { color: var(--foreground); background: var(--muted-bg); }
  .tool:disabled { opacity: 0.35; cursor: not-allowed; }
  .tool.active {
    color: var(--primary);
    background: var(--primary-soft);
    border-color: color-mix(in srgb, var(--primary) 35%, transparent);
  }

  .tool--label { min-width: 74px; }
  .tool--indicator { flex-shrink: 0; }
  .tool.has-count { color: var(--primary); }

  .count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: var(--radius-full);
    background: var(--primary);
    color: #fff;
    font-size: var(--fs-2xs);
    font-weight: 800;
  }

  .caret { color: var(--muted-fore); }

  .spinning { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }

  @media (max-width: 1180px) {
    .chart-area-head {
      grid-template-columns: 1fr auto;
    }

    .left-controls {
      overflow-x: auto;
      scrollbar-width: none;
    }

    .left-controls::-webkit-scrollbar { display: none; }

    .intervals {
      justify-content: flex-start;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .intervals::-webkit-scrollbar { display: none; }

    .tools {
      justify-content: flex-end;
    }

    .tools .tool--label span { display: none; }
    .tools .tool--label { min-width: 30px; }
  }

  @media (max-width: 760px) {
    .chart-area-head {
      grid-template-columns: 1fr;
      align-items: start;
      gap: 8px;
      padding: 8px 10px;
    }

    .tools {
      width: 100%;
      justify-content: flex-end;
    }
  }
</style>
