<script lang="ts">
  import Toggle from "$lib/components/ui/Toggle.svelte";
  import { CHART_TYPE_ORDER } from "$lib/features/chart/controlConfig";
  import type {
    DashboardSettingsActions,
    DashboardSettingsState,
  } from "$lib/features/dashboard/useDashboardPage.svelte";

  let {
    settingsState,
    settingsActions,
    onOpenSettings,
  }: {
    settingsState: DashboardSettingsState;
    settingsActions: DashboardSettingsActions;
    onOpenSettings?: () => void;
  } = $props();
</script>

<div class="panel">

  <!-- 테마 -->
  <div class="section-label">화면</div>

  <div class="setting-row">
    <span class="setting-name">다크 모드</span>
    <Toggle
      checked={settingsState.theme === "dark"}
      onchange={settingsActions.toggleTheme}
    />
  </div>

  <div class="setting-row">
    <span class="setting-name">시간축 표시</span>
    <Toggle
      checked={settingsState.timeAxisVisible}
      onchange={settingsActions.toggleTimeAxis}
    />
  </div>

  <!-- 차트 타입 -->
  <div class="section-label" style:margin-top="8px">차트 타입</div>
  <div class="seg-group">
    {#each CHART_TYPE_ORDER as type}
      <button
        type="button"
        class="seg-btn"
        class:active={settingsState.chartType === type}
        onclick={() => settingsActions.setChartType(type)}
      >
        {settingsState.chartTypeLabels[type]}
      </button>
    {/each}
  </div>

  <!-- 가격 스케일 -->
  <div class="section-label" style:margin-top="8px">가격 스케일</div>
  <div class="seg-group">
    <button
      type="button"
      class="seg-btn"
      class:active={settingsState.priceScaleMode === "normal"}
      onclick={() => settingsActions.setPriceScaleMode("normal")}
    >기본</button>
    <button
      type="button"
      class="seg-btn"
      class:active={settingsState.priceScaleMode === "log"}
      onclick={() => settingsActions.setPriceScaleMode("log")}
    >로그</button>
  </div>

  <!-- 전체화면 -->
  <div class="section-label" style:margin-top="8px">화면</div>
  <div class="setting-row">
    <span class="setting-name">전체화면 전환</span>
    <button type="button" class="action-btn" onclick={settingsActions.toggleFullscreen}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      </svg>
      전체화면
    </button>
  </div>

  <!-- 상세 설정 링크 -->
  {#if onOpenSettings}
    <div class="divider"></div>
    <button type="button" class="open-settings-btn" onclick={onOpenSettings}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3"/>
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>
      </svg>
      상세 설정 열기
      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style:margin-left="auto">
        <path d="M9 18l6-6-6-6"/>
      </svg>
    </button>
  {/if}
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
    padding: 10px 16px 6px;
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: var(--muted-fore);
  }

  .setting-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 9px 16px;
    border-bottom: 1px solid color-mix(in srgb, var(--border) 50%, transparent);
  }

  .setting-name {
    font-size: var(--fs-sm);
    font-weight: 500;
    color: var(--foreground);
  }

  /* Segmented control */
  .seg-group {
    display: flex;
    gap: 4px;
    padding: 4px 16px 10px;
    flex-wrap: wrap;
  }

  .seg-btn {
    flex: 1;
    padding: 5px 8px;
    font-size: var(--fs-sm);
    font-weight: 500;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--background);
    color: var(--muted-fore);
    cursor: pointer;
    white-space: nowrap;
    transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }

  .seg-btn.active {
    background: var(--primary);
    border-color: var(--primary);
    color: #fff;
  }

  .seg-btn:not(.active):hover {
    background: var(--muted-bg);
    color: var(--foreground);
  }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 10px;
    font-size: var(--fs-sm);
    font-weight: 500;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--background);
    color: var(--muted-fore);
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
  }

  .action-btn:hover {
    background: var(--muted-bg);
    color: var(--foreground);
  }

  .divider {
    height: 1px;
    background: var(--border);
    margin: 12px 0 0;
  }

  .open-settings-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    width: 100%;
    padding: 12px 16px;
    font-size: var(--fs-sm);
    font-weight: 500;
    border: none;
    background: transparent;
    color: var(--primary);
    cursor: pointer;
    text-align: left;
    transition: background var(--dur-fast) var(--ease);
  }

  .open-settings-btn:hover {
    background: var(--primary-soft);
  }
</style>
