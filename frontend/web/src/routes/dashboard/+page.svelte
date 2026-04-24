<script lang="ts">
  import { onMount } from "svelte";
  import AnalysisSummary from "$lib/components/AnalysisSummary.svelte";
  import MarketChart from "$lib/components/MarketChart.svelte";
  import AppBar from "$lib/components/dashboard/AppBar.svelte";
  import ChartAreaHeader from "$lib/components/dashboard/ChartAreaHeader.svelte";
  import FundamentalsMainView from "$lib/components/dashboard/FundamentalsMainView.svelte";
  import RightDock from "$lib/components/dashboard/RightDock.svelte";
  import CommandPalette from "$lib/components/command/CommandPalette.svelte";
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
        theme={dashboard.theme}
        onSelectMainTab={(tab) => (dashboard.mainTab = tab)}
        onToggleTheme={dashboard.settingsActions.toggleTheme}
        onOpenSettings={() => dashboard.openSettings("indicators")}
        onOpenPalette={() => (dashboard.paletteOpen = true)}
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
          params={dashboard.params}
          selectedSymbol={dashboard.params.symbol}
          selectedMarket={dashboard.params.market}
          interval={dashboard.params.interval}
          fundamentals={dashboard.fundamentals}
          fundamentalsLoading={dashboard.fundamentalsLoading}
          fundamentalsError={dashboard.fundamentalsError}
          settingsState={dashboard.settingsState}
          settingsActions={dashboard.settingsActions}
          onTabChange={dashboard.openDockTab}
          onClose={() => dashboard.toggleDockTab(dashboard.dockTab)}
          onSelectSymbol={dashboard.selectSymbol}
          onParamsChange={dashboard.updateParams}
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
            params={dashboard.params}
            selectedSymbol={dashboard.params.symbol}
            selectedMarket={dashboard.params.market}
            interval={dashboard.params.interval}
            fundamentals={dashboard.fundamentals}
            fundamentalsLoading={dashboard.fundamentalsLoading}
            fundamentalsError={dashboard.fundamentalsError}
            settingsState={dashboard.settingsState}
            settingsActions={dashboard.settingsActions}
            onTabChange={dashboard.openDockTab}
            onClose={() => dashboard.toggleDockTab(dashboard.dockTab)}
            onSelectSymbol={dashboard.selectSymbol}
            onParamsChange={dashboard.updateParams}
            onOpenSettings={() => dashboard.openSettings("appearance")}
          />
        </div>
      </div>
    {/if}

    <!-- ── Quick rail (rightmost, always-on nav) ── -->
    {#if !dashboard.isFullscreen}
      <aside class="quick-rail top-rail" aria-label="빠른 메뉴">
        <button
          type="button"
          class="rail-btn"
          class:active={dashboard.dockOpen && dashboard.dockTab === "settings"}
          onclick={() => dashboard.toggleDockTab("settings")}
          title="설정"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18h16v2H4zM5 10h3v6H5zm5-4h3v10h-3zm5 6h3v4h-3z"/></svg>
          <span>설정</span>
        </button>
        <button
          type="button"
          class="rail-btn"
          class:active={dashboard.dockOpen && dashboard.dockTab === "watchlist"}
          onclick={() => dashboard.toggleDockTab("watchlist")}
          title="관심종목"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.35-9.33-8.2C.36 8.96 2.4 4.5 6.7 4.5c2.1 0 3.47 1.02 4.3 2.07.83-1.05 2.2-2.07 4.3-2.07 4.3 0 6.34 4.46 4.03 8.3C19 16.65 12 21 12 21Z"/></svg>
          <span>관심종목</span>
        </button>
        <button
          type="button"
          class="rail-btn"
          class:active={dashboard.dockOpen && dashboard.dockTab === "fundamentals"}
          onclick={() => dashboard.toggleDockTab("fundamentals")}
          title="펀더멘털"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-2.34-5.66L15 9h7V2l-2.92 2.92A9.97 9.97 0 0 0 12 2Zm1 5h-2v6l5 3 1-1.73-4-2.27Z"/></svg>
          <span>펀더멘털</span>
        </button>
        <span class="rail-sep"></span>
        <button
          type="button"
          class="rail-btn"
          class:active={dashboard.dockOpen && dashboard.dockTab === "strategy"}
          onclick={() => dashboard.toggleDockTab("strategy")}
          title="전략"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>
          <span>전략</span>
        </button>
      </aside>
    {/if}
  </div>
</main>

<CommandPalette bind:open={dashboard.paletteOpen} commands={dashboard.commands} />
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
    width: min(720px, calc(100% - 28px));
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
    padding: 0 10px 12px 10px;
  }

  /* ── Quick rail (rightmost flex sibling) ── */
  .quick-rail {
    width: 64px;
    flex-shrink: 0;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    padding: 12px 0 0;
    border-left: 1px solid var(--border);
    background: var(--muted-bg);
  }

  .mobile-dock {
    display: none;
  }

  .rail-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    width: 100%;
    min-height: 58px;
    border: 0;
    background: transparent;
    color: var(--muted-fore);
    cursor: pointer;
    font-size: var(--fs-xs);
    font-weight: 700;
  }

  .rail-btn svg {
    color: var(--muted-fore);
  }

  .rail-btn:hover,
  .rail-btn.active {
    color: var(--foreground);
    background: color-mix(in srgb, var(--muted-bg) 60%, var(--border));
  }

  .rail-btn.active svg {
    color: var(--primary);
  }

  .rail-sep {
    width: 32px;
    height: 1px;
    background: var(--border);
  }

  .dock-resizer {
    position: relative;
    width: 14px;
    border: 0;
    padding: 0;
    background: transparent;
    cursor: col-resize;
  }

  .dock-resizer::before,
  .dock-resizer::after {
    content: "";
    position: absolute;
    opacity: 0;
    transition: opacity var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }

  .dock-resizer::before {
    top: 12px;
    bottom: 12px;
    left: 50%;
    width: 2px;
    transform: translateX(-50%);
    border-radius: 999px;
    background: var(--primary);
    box-shadow: 0 0 14px color-mix(in srgb, var(--primary) 48%, transparent);
  }

  .dock-resizer::after {
    inset: 0;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--primary) 13%, transparent), transparent);
  }

  .dock-resizer:hover::before,
  .dock-resizer:hover::after,
  .dock-resizer.active::before,
  .dock-resizer.active::after {
    opacity: 1;
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

    .rail-btn {
      flex: 1;
      width: auto;
      min-height: 0;
      gap: 3px;
      border-radius: 8px;
      font-size: var(--fs-2xs);
    }

    .rail-sep {
      display: none;
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
