<script lang="ts">
  import { onMount } from "svelte";
  import AnalysisSummary from "$lib/components/AnalysisSummary.svelte";
  import MarketChart from "$lib/components/MarketChart.svelte";
  import ApiStatus from "$lib/components/ApiStatus.svelte";
  import AppBar from "$lib/components/dashboard/AppBar.svelte";
  import ChartAreaHeader from "$lib/components/dashboard/ChartAreaHeader.svelte";
  import FundamentalsMainView from "$lib/components/dashboard/FundamentalsMainView.svelte";
  import RightDock from "$lib/components/dashboard/RightDock.svelte";
  import ShortcutsModal from "$lib/components/command/ShortcutsModal.svelte";
  import SettingsPanel from "$lib/components/dashboard/SettingsPanel.svelte";
  import IndicatorDialog from "$lib/components/IndicatorDialog.svelte";
  import ReplayControls from "$lib/components/chart/ReplayControls.svelte";
  import { createDashboardPageController } from "$lib/features/dashboard/useDashboardPage.svelte";

  let shellEl = $state<HTMLDivElement | null>(null);
  const dashboard = createDashboardPageController();

  onMount(() => dashboard.initialize());
</script>

<main class:app={!dashboard.isFullscreen} class:fullscreen-app={dashboard.isFullscreen}>
  {#if !dashboard.isFullscreen}
    <div class="ambient ambient--top" aria-hidden="true"></div>
    <div class="ambient ambient--grid" aria-hidden="true"></div>
  {/if}
  <div
    class="workspace-frame"
    class:has-dock={dashboard.dockOpen && !dashboard.isFullscreen}
    style:--dock-width={`${dashboard.dockWidth}px`}
    bind:this={shellEl}
  >
    <!-- ── Main column (AppBar + chart body) ── -->
    <div class="main-column">
      <AppBar
        analysis={dashboard.effectiveAnalysis}
        fundamentals={dashboard.fundamentals}
        symbol={dashboard.params.symbol}
        market={dashboard.params.market}
        loading={dashboard.loading}
        activeMainTab={dashboard.mainTab}
        onSelectMainTab={(tab) => (dashboard.mainTab = tab)}
        onOpenSymbolSearch={() => dashboard.openDockTab("watchlist")}
      />

      <div
        class:body={!dashboard.isFullscreen}
        class:fullscreen-body={dashboard.isFullscreen}
      >
        <!-- ── Chart area ── -->
        <div class="chart-area">
          {#if dashboard.mainTab === "chart"}
            <ChartAreaHeader
              interval={dashboard.params.interval}
              loading={dashboard.loading}
              indicatorCount={dashboard.indicatorCount}
              chartType={dashboard.settingsState.chartType}
              chartTypeLabels={dashboard.chartTypeLabels}
              drawingTool={dashboard.settingsState.drawingActiveTool}
              drawingCount={dashboard.settingsState.drawingCount}
              onSelectInterval={dashboard.setInterval}
              onSelectChartType={dashboard.settingsActions.setChartType}
              onSelectDrawingTool={dashboard.settingsActions.setDrawingTool}
              onDeleteOrUndoDrawing={dashboard.deleteOrUndoDrawing}
              onRefresh={() => void dashboard.loadAnalysis()}
              onOpenIndicators={() => (dashboard.indicatorOpen = true)}
            />
            <div class="chart-stack">
              <AnalysisSummary
                analysis={dashboard.effectiveAnalysis}
                loading={dashboard.loading}
                error={dashboard.error}
                params={dashboard.params}
                onParamsChange={dashboard.updateParams}
              />
              <MarketChart
                analysis={dashboard.effectiveAnalysis}
                symbol={dashboard.params.symbol}
                interval={dashboard.params.interval}
                compareData={dashboard.compareData}
              />
            </div>
            {#if dashboard.settingsState.replayEnabled && dashboard.analysis}
              <ReplayControls
                totalBars={dashboard.analysis.candles.length}
                replayState={dashboard.replayState}
                replayActions={dashboard.replayActions}
              />
            {/if}
          {:else}
            <FundamentalsMainView
              symbol={dashboard.params.symbol}
              market={dashboard.params.market}
              fundamentals={dashboard.fundamentals}
              loading={dashboard.fundamentalsLoading}
              error={dashboard.fundamentalsError}
            />
          {/if}
        </div>
      </div>
    </div>

    <!-- ── Right sidebar (between chart and quick-rail) ── -->
    {#if dashboard.dockOpen && !dashboard.isFullscreen}
      <button
        type="button"
        class="dock-resizer"
        class:active={dashboard.dockResizing}
        onmousedown={(event) => dashboard.startDockResize(event, shellEl?.getBoundingClientRect().width ?? window.innerWidth)}
        ondblclick={dashboard.settingsActions.resetDockWidth}
        aria-label="우측 패널 너비 조절"
        title="우측 패널 너비 조절, 더블클릭으로 초기화"
      ></button>
      <aside class="sidebar">
        <RightDock
          activeTab={dashboard.dockTab}
          selectedSymbol={dashboard.params.symbol}
          selectedMarket={dashboard.params.market}
          interval={dashboard.params.interval}
          settingsState={dashboard.settingsState}
          settingsActions={dashboard.settingsActions}
          onSelectSymbol={dashboard.selectSymbol}
          onOpenSettings={() => dashboard.openSettings("appearance")}
        />
      </aside>
    {/if}

    {#if dashboard.dockOpen && !dashboard.isFullscreen}
      <div class="mobile-dock" role="presentation">
        <button
          type="button"
          class="mobile-dock__backdrop"
          aria-label="패널 닫기"
          onclick={() => dashboard.toggleDockTab(dashboard.dockTab)}
        ></button>
        <div class="mobile-dock__sheet">
          <RightDock
            variant="sheet"
            activeTab={dashboard.dockTab}
            selectedSymbol={dashboard.params.symbol}
            selectedMarket={dashboard.params.market}
            interval={dashboard.params.interval}
            settingsState={dashboard.settingsState}
            settingsActions={dashboard.settingsActions}
            onSelectSymbol={dashboard.selectSymbol}
            onOpenSettings={() => dashboard.openSettings("appearance")}
          />
        </div>
      </div>
    {/if}

    <!-- ── Quick rail (rightmost, always-on nav) ── -->
    {#if !dashboard.isFullscreen}
      <aside class="quick-rail top-rail" aria-label="빠른 메뉴">
        <div class="rail-tools">
          <div class="rail-status">
            <ApiStatus compact rail />
          </div>
          <button
            type="button"
            class="rail-tool-btn"
            onclick={dashboard.settingsActions.toggleTheme}
            title={dashboard.theme === "dark" ? "라이트 모드" : "다크 모드"}
            aria-label={dashboard.theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
          >
            <span class="rail-tool-icon">
              {#if dashboard.theme === "dark"}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" />
                  <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
                </svg>
              {:else}
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
                </svg>
              {/if}
            </span>
          </button>
          <button
            type="button"
            class="rail-tool-btn"
            class:active={dashboard.dockOpen && dashboard.dockTab === "settings"}
            onclick={() => dashboard.toggleDockTab("settings")}
            title="설정"
            aria-label="설정 열기"
          >
            <span class="rail-tool-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"/>
                <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2.05 2.05 0 1 1-2.9 2.9l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 1.55V21a2.05 2.05 0 1 1-4.1 0v-.09A1.7 1.7 0 0 0 9 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06a2.05 2.05 0 1 1-2.9-2.9l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2.05 2.05 0 1 1 0-4.1h.09A1.7 1.7 0 0 0 4.6 9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2.05 2.05 0 1 1 2.9-2.9l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.55V3a2.05 2.05 0 1 1 4.1 0v.09A1.7 1.7 0 0 0 15 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06a2.05 2.05 0 1 1 2.9 2.9l-.06.06A1.7 1.7 0 0 0 19.4 9a1.7 1.7 0 0 0 1.55 1H21a2.05 2.05 0 1 1 0 4.1h-.09a1.7 1.7 0 0 0-1.51.9Z"/>
              </svg>
            </span>
          </button>
        </div>
        <div class="rail-primary">
          <button
            type="button"
            class="rail-btn"
            class:active={dashboard.dockOpen && dashboard.dockTab === "watchlist"}
            onclick={() => dashboard.toggleDockTab("watchlist")}
            title="종목"
          >
            <span class="rail-icon">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.35-9.33-8.2C.36 8.96 2.4 4.5 6.7 4.5c2.1 0 3.47 1.02 4.3 2.07.83-1.05 2.2-2.07 4.3-2.07 4.3 0 6.34 4.46 4.03 8.3C19 16.65 12 21 12 21Z"/></svg>
            </span>
            <span>종목</span>
          </button>
        </div>
      </aside>
    {/if}
  </div>
</main>

<ShortcutsModal bind:open={dashboard.shortcutsOpen} />
<SettingsPanel
  bind:open={dashboard.settingsOpen}
  initialTab={dashboard.settingsInitialTab}
  params={dashboard.params}
  settingsState={dashboard.settingsState}
  settingsActions={dashboard.settingsActions}
  onParamsChange={dashboard.updateParams}
/>
<IndicatorDialog
  bind:open={dashboard.indicatorOpen}
  params={dashboard.params}
  onParamsChange={dashboard.updateParams}
/>

<style>
  .app {
    height: 100dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;
    background: var(--page-bg);
    position: relative;
    isolation: isolate;
  }

  .fullscreen-app {
    position: fixed;
    inset: 0;
    z-index: 50;
    display: flex;
    flex-direction: column;
    background: var(--chart-bg);
  }

  .ambient {
    position: absolute;
    pointer-events: none;
    z-index: 0;
  }

  .ambient--top {
    inset: -18% auto auto 14%;
    width: min(640px, 45vw);
    height: 360px;
    background: radial-gradient(circle, color-mix(in srgb, var(--primary) 16%, transparent) 0%, transparent 68%);
    filter: blur(10px);
    opacity: 0;
  }

  .ambient--grid {
    inset: 0;
    background-image:
      linear-gradient(to right, color-mix(in srgb, var(--border) 18%, transparent) 1px, transparent 1px),
      linear-gradient(to bottom, color-mix(in srgb, var(--border) 14%, transparent) 1px, transparent 1px);
    background-size: 86px 86px;
    mask-image: linear-gradient(180deg, transparent 0%, #000 18%, #000 82%, transparent 100%);
    opacity: 0;
  }

  .workspace-frame {
    position: relative;
    z-index: 1;
    display: flex;
    flex: 1;
    min-height: 0;
    flex-direction: row;
    gap: 0;
  }

  /* Main column: AppBar + chart body */
  .main-column {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .body {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden;
    padding: 0 0 12px 20px;
  }

  .fullscreen-body {
    flex: 1;
    min-height: 0;
    display: flex;
    overflow: hidden;
  }

  /* ── Chart area ── */
  .chart-area {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    min-height: 0;
    overflow: hidden;
    background: var(--chart-bg);
    border: 1px solid var(--border);
    border-radius: 8px;
    box-shadow: 0 10px 24px rgba(25, 31, 40, 0.05);
  }

  .chart-stack {
    position: relative;
    display: flex;
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .chart-stack :global(.chart-wrapper) {
    flex: 1;
    min-width: 0;
  }

  .chart-stack :global(.analysis-legend) {
    position: absolute;
    top: 12px;
    left: 14px;
    right: auto;
    z-index: 12;
    width: fit-content;
    max-width: calc(100% - 28px);
    max-height: min(34%, 220px);
    overflow: auto;
    padding: 0;
    border: 0;
    background: transparent;
    pointer-events: auto;
    overscroll-behavior: contain;
  }

  .chart-stack :global(.analysis-legend.is-collapsed) {
    width: fit-content;
    max-width: calc(100% - 28px);
    max-height: none;
  }

  .chart-stack :global(.ohlcv-row),
  .chart-stack :global(.ind-list) {
    width: fit-content;
    max-width: 100%;
    padding: 5px 7px;
    border: 1px solid color-mix(in srgb, var(--border) 58%, transparent);
    border-radius: 6px;
    background: color-mix(in srgb, var(--chart-bg) 92%, transparent);
    box-shadow: 0 6px 18px rgba(25, 31, 40, 0.05);
    backdrop-filter: blur(8px);
  }

  .chart-stack :global(.ohlcv-row) {
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
  }

  .chart-stack :global(.ind-list) {
    margin-top: 2px;
    border-top: 0;
    border-color: transparent;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;
  }

  /* ── Sidebar (top-level panel, between chart and quick-rail) ── */
  .sidebar {
    display: flex;
    flex-direction: column;
    min-height: 0;
    width: var(--dock-width);
    flex-shrink: 0;
    overflow: hidden;
    padding: 0;
  }

  /* ── Quick rail (rightmost flex sibling) ── */
  .quick-rail {
    width: 76px;
    flex-shrink: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 4px;
    padding: 18px 8px 12px;
    border-left: 1px solid var(--border);
    background: var(--card);
  }

  .rail-status {
    width: 100%;
  }

  .rail-tools {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    gap: 2px;
  }

  .rail-tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    padding: 0;
    border: 0;
    border-radius: 10px;
    background: transparent;
    color: var(--muted-fore);
    cursor: pointer;
    transition:
      color var(--dur-fast) var(--ease),
      background var(--dur-fast) var(--ease);
  }

  .rail-tool-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    height: 100%;
  }

  .rail-tool-btn:hover,
  .rail-tool-btn.active {
    color: var(--foreground);
    background: color-mix(in srgb, var(--muted-bg) 90%, var(--border));
  }

  .rail-primary {
    flex: 1;
    min-height: 0;
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mobile-dock {
    display: none;
  }

  .rail-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    width: 100%;
    min-height: 62px;
    padding: 2px 0;
    border: 0;
    background: transparent;
    color: var(--muted-fore);
    cursor: pointer;
    font-size: var(--fs-sm);
    font-weight: 700;
    letter-spacing: 0;
  }

  .rail-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 36px;
    height: 36px;
    border-radius: 10px;
    color: var(--muted-fore);
    transition:
      color var(--dur-fast) var(--ease),
      background var(--dur-fast) var(--ease);
  }

  .rail-btn:hover {
    color: var(--foreground);
  }

  .rail-btn:hover .rail-icon {
    color: var(--foreground);
    background: color-mix(in srgb, var(--muted-bg) 70%, transparent);
  }

  .rail-btn.active {
    color: var(--foreground);
  }

  .rail-btn.active .rail-icon {
    color: var(--foreground);
    background: color-mix(in srgb, var(--muted-bg) 90%, var(--border));
  }

  .dock-resizer {
    position: relative;
    width: 16px;
    flex-shrink: 0;
    border: 0;
    padding: 0;
    background: color-mix(in srgb, var(--muted-bg) 60%, var(--card));
    cursor: col-resize;
    transition: background var(--dur-fast) var(--ease);
  }

  .dock-resizer::before {
    content: "";
    position: absolute;
    transition:
      opacity var(--dur-fast) var(--ease),
      background var(--dur-fast) var(--ease),
      box-shadow var(--dur-fast) var(--ease);
    top: 0;
    bottom: 0;
    left: 50%;
    width: 1px;
    transform: translateX(-50%);
    background: color-mix(in srgb, var(--muted-fore) 22%, var(--border));
    opacity: 0;
  }

  .dock-resizer:hover,
  .dock-resizer.active,
  .dock-resizer:focus-visible {
    background: color-mix(in srgb, var(--muted-bg) 85%, var(--card));
  }

  .dock-resizer:hover::before,
  .dock-resizer.active::before,
  .dock-resizer:focus-visible::before {
    background: color-mix(in srgb, var(--muted-fore) 54%, var(--border));
    box-shadow: 0 0 0 1px color-mix(in srgb, var(--muted-fore) 8%, transparent);
    opacity: 1;
  }

  .dock-resizer:focus-visible {
    outline: none;
  }

  .fullscreen-body .chart-area {
    flex: 1;
    border: 0;
    border-radius: 0;
    box-shadow: none;
  }

  /* ── Responsive ── */
  @media (max-width: 900px) {
    .sidebar,
    .dock-resizer { display: none; }
    .app { padding: 0; }
    .body { padding: 0 8px 72px; }

    .quick-rail {
      position: fixed;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 31;
      width: auto;
      height: calc(58px + env(safe-area-inset-bottom));
      flex-direction: row;
      align-items: stretch;
      gap: 4px;
      padding: 6px 8px calc(6px + env(safe-area-inset-bottom));
      border-left: 0;
      border-top: 1px solid var(--border);
      background: color-mix(in srgb, var(--card) 96%, var(--muted-bg));
      box-shadow: 0 -10px 24px rgba(25, 31, 40, 0.14);
    }

    .rail-status {
      display: none;
    }

    .rail-tools,
    .rail-primary {
      display: contents;
    }

    .rail-tool-btn {
      flex: 0 0 46px;
      width: 46px;
      height: 46px;
    }

    .rail-tool-icon {
      width: 100%;
      height: 100%;
    }

    .rail-tool-icon :global(svg) {
      width: 16px;
      height: 16px;
    }

    .rail-btn {
      flex: 1;
      width: auto;
      min-height: 0;
      gap: 1px;
      border-radius: 8px;
      font-size: var(--fs-2xs);
    }

    .rail-icon {
      width: 26px;
      height: 26px;
      border-radius: 7px;
    }

    .rail-icon :global(svg) {
      width: 16px;
      height: 16px;
    }

    .mobile-dock {
      display: block;
      position: fixed;
      inset: 0;
      z-index: 40;
      pointer-events: none;
    }

    .mobile-dock__backdrop {
      position: absolute;
      inset: 0;
      border: 0;
      padding: 0;
      background: rgba(8, 12, 20, 0.48);
      backdrop-filter: blur(3px);
      pointer-events: auto;
    }

    .mobile-dock__sheet {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: min(78dvh, 640px);
      padding: 8px 8px calc(8px + env(safe-area-inset-bottom));
      pointer-events: auto;
    }

    .mobile-dock__sheet :global(.dock) {
      height: 100%;
    }

    .chart-stack :global(.analysis-legend) {
      top: 8px;
      left: 8px;
      width: min(560px, calc(100% - 16px));
      max-height: min(40%, 180px);
    }
  }
</style>
