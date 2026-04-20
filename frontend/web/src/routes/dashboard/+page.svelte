<script lang="ts">
  import { onMount } from "svelte";
  import { browser } from "$app/environment";
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
  import {
    createCompareRequestKey,
    haveSameCompareSymbols,
    pruneCompareData,
  } from "$lib/features/dashboard/compareData";
  import { buildDashboardCommands } from "$lib/features/dashboard/commands";
  import { calculateDockWidth } from "$lib/features/dashboard/dockResize";
  import { installShortcuts } from "$lib/features/dashboard/useShortcuts.svelte";
  import { chart } from "$lib/stores/chart.svelte";
  import { snapshots, type WorkspaceSnapshot } from "$lib/stores/snapshots.svelte";
  import { replay } from "$lib/stores/replay.svelte";
  import { sliceAnalysisAt } from "$lib/utils/replaySlice";
  import { countActiveIndicators } from "$lib/chart/indicatorSpecs";
  import ReplayControls from "$lib/components/chart/ReplayControls.svelte";
  import { fetchAnalysis, fetchFundamentals } from "$lib/api/client";
  import type { AnalysisParams, AnalysisResponse, Candle, FundamentalsResponse, MarketType } from "$lib/api/types";
  import { workspace } from "$lib/stores/workspace.svelte";

  let analysis = $state<AnalysisResponse | null>(null);
  let fundamentals = $state<FundamentalsResponse | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);

  // Replay-aware analysis — when replay is enabled, slice to currentIndex
  const effectiveAnalysis = $derived(
    analysis && replay.enabled ? sliceAnalysisAt(analysis, replay.currentIndex) : analysis,
  );

  // ── Compare symbols (max 2) ─── cached candle data per requested symbol
  let compareData = $state<Record<string, Candle[]>>({});
  let compareInFlight = new Set<string>();

  async function fetchCompareCandles(symbol: string, market: MarketType, interval: string) {
    const key = createCompareRequestKey(symbol, market, interval);
    if (compareInFlight.has(key)) return;
    compareInFlight.add(key);
    try {
      const resp = await fetchAnalysis({
        ...workspace.params,
        symbol,
        market,
        interval,
      });
      compareData = { ...compareData, [symbol]: resp.candles };
    } catch {
      // keep previous data; do not surface error for a compare line
    } finally {
      compareInFlight.delete(key);
    }
  }

  $effect(() => {
    // Re-fetch whenever compareSymbols / market / interval changes
    const symbols = chart.compareSymbols;
    const market = workspace.params.market;
    const interval = workspace.params.interval;

    for (const s of symbols) {
      if (!compareData[s]) void fetchCompareCandles(s, market, interval);
    }
    // Drop data for symbols no longer requested
    const next = pruneCompareData(compareData, symbols);
    if (!haveSameCompareSymbols(compareData, next)) compareData = next;
  });

  // When market/interval changes, invalidate all cached compare candles
  $effect(() => {
    void workspace.params.market;
    void workspace.params.interval;
    compareData = {};
  });

  $effect(() => {
    const symbol = workspace.params.symbol;
    const market = workspace.params.market;
    if (!symbol || !market || market === "crypto") {
      fundamentals = null;
      return;
    }
    void loadFundamentals(symbol, market);
  });

  const indicatorCount = $derived(
    countActiveIndicators(workspace.params as unknown as Record<string, unknown>),
  );

  // Command palette + shortcuts help + settings + indicators
  let paletteOpen = $state(false);
  let shortcutsOpen = $state(false);
  let settingsOpen = $state(false);
  let indicatorOpen = $state(false);
  let settingsInitialTab = $state("indicators");
  let shellEl = $state<HTMLDivElement | null>(null);
  let dockResizing = $state(false);
  let mainTab = $state<"chart" | "fundamentals">("chart");

  function openSettings(tabKey: string = "indicators") {
    settingsInitialTab = tabKey;
    settingsOpen = true;
  }

  function applySnapshot(snap: WorkspaceSnapshot) {
    if (workspace.theme !== snap.theme) workspace.toggleTheme();
    chart.setChartType(snap.chartType);
    workspace.setDockTab(snap.dockTab);
    workspace.setParams(snap.params);
    void loadAnalysis(snap.params);
  }

  function captureSnapshot(name?: string) {
    return snapshots.save({
      name,
      params: workspace.params,
      theme: workspace.theme,
      chartType: chart.chartType,
      dockTab: workspace.dockTab,
      watchlist: workspace.watchlist,
    });
  }

  const commands = $derived.by(() => {
    return buildDashboardCommands({
      analysis,
      replayEnabled: replay.enabled,
      theme: workspace.theme,
      watchlist: workspace.watchlist,
      recentSymbols: workspace.recentSymbols,
      snapshots: snapshots.items,
      openDockTab,
      openSettings,
      selectSymbol,
      setInterval,
      toggleTheme: () => workspace.toggleTheme(),
      toggleFullscreen: () => chart.toggleFullscreen(),
      openShortcuts: () => (shortcutsOpen = true),
      loadAnalysis: () => loadAnalysis(),
      toggleReplay: () => {
        if (!analysis) return;
        replay.toggleEnabled(analysis.candles.length);
      },
      captureSnapshot: () => captureSnapshot(),
      applySnapshot,
    });
  });

  onMount(() => {
    void loadAnalysis();
    return installShortcuts({
      onCommandPalette: () => (paletteOpen = true),
      onShortcutsHelp: () => (shortcutsOpen = true),
      onOpenWatchlist: () => openDockTab("watchlist"),
      onOpenSettings: () => openSettings("indicators"),
      onOpenSymbolSearch: () => openDockTab("watchlist"),
      onToggleFullscreen: () => chart.toggleFullscreen(),
      onToggleReplay: () => {
        if (!analysis) return;
        replay.toggleEnabled(analysis.candles.length);
      },
      onReplayPlayPause: () => {
        if (replay.enabled) replay.togglePlaying();
      },
      onReplayStep: (delta) => {
        if (!analysis || !replay.enabled) return;
        replay.step(delta, analysis.candles.length);
      },
    });
  });

  async function loadAnalysis(target: AnalysisParams = workspace.params) {
    loading = true;
    error = null;
    try {
      analysis = await fetchAnalysis(target);
    } catch (caught) {
      error = caught instanceof Error ? caught.message : "분석 데이터를 불러오지 못했습니다";
    } finally {
      loading = false;
    }
  }

  async function loadFundamentals(symbol: string, market: MarketType) {
    try {
      fundamentals = await fetchFundamentals({ symbol, market });
    } catch {
      fundamentals = null;
    }
  }

  function selectSymbol(symbol: string, market: MarketType, label?: string) {
    const next = { ...workspace.params, symbol, market };
    workspace.selectSymbol(symbol, market, label);
    void loadAnalysis(next);
  }

  function setInterval(iv: string) {
    const next = { ...workspace.params, interval: iv };
    workspace.patchParams({ interval: iv });
    void loadAnalysis(next);
  }

  function updateParams(next: AnalysisParams) {
    workspace.setParams(next);
    void loadAnalysis(next);
  }

  function openDockTab(tab: typeof workspace.dockTab) {
    workspace.setDockTab(tab);
  }

  function toggleDockTab(tab: typeof workspace.dockTab) {
    if (workspace.dockOpen && workspace.dockTab === tab) {
      workspace.setDockOpen(false);
      return;
    }
    workspace.setDockTab(tab);
  }

  function startDockResize(event: MouseEvent) {
    if (!browser) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = workspace.dockWidth;
    const shellWidth = shellEl?.getBoundingClientRect().width ?? window.innerWidth;
    dockResizing = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      workspace.setDockWidth(calculateDockWidth({ startWidth, deltaX: delta, shellWidth }));
    };
    const cleanup = () => {
      dockResizing = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", cleanup);
    };

    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", cleanup);
  }
</script>

<main class:app={!chart.isFullscreen} class:fullscreen-app={chart.isFullscreen}>
  {#if !chart.isFullscreen}
    <div class="ambient ambient--top" aria-hidden="true"></div>
    <div class="ambient ambient--grid" aria-hidden="true"></div>
  {/if}
  <div
    class="workspace-frame"
    class:has-dock={workspace.dockOpen && !chart.isFullscreen}
    style:--dock-width={`${workspace.dockWidth}px`}
    bind:this={shellEl}
  >
    <!-- ── Main column (AppBar + chart body) ── -->
    <div class="main-column">
      <AppBar
        analysis={effectiveAnalysis}
        fundamentals={fundamentals}
        symbol={workspace.params.symbol}
        market={workspace.params.market}
        {loading}
        activeMainTab={mainTab}
        onSelectMainTab={(tab) => (mainTab = tab)}
        onOpenSettings={() => openSettings("indicators")}
        onOpenPalette={() => (paletteOpen = true)}
      />

      <div
        class:body={!chart.isFullscreen}
        class:fullscreen-body={chart.isFullscreen}
      >
        <!-- ── Chart area ── -->
        <div class="chart-area">
          {#if mainTab === "chart"}
            <ChartAreaHeader
              interval={workspace.params.interval}
              {loading}
              {indicatorCount}
              onSelectInterval={setInterval}
              onRefresh={() => loadAnalysis()}
              onOpenIndicators={() => (indicatorOpen = true)}
            />
            <div class="chart-stack">
              <AnalysisSummary
                analysis={effectiveAnalysis}
                {loading}
                {error}
                params={workspace.params}
                onParamsChange={updateParams}
              />
              <MarketChart
                analysis={effectiveAnalysis}
                symbol={workspace.params.symbol}
                interval={workspace.params.interval}
                {compareData}
              />
            </div>
            {#if replay.enabled && analysis}
              <ReplayControls totalBars={analysis.candles.length} />
            {/if}
          {:else}
            <FundamentalsMainView
              symbol={workspace.params.symbol}
              market={workspace.params.market}
              fundamentals={fundamentals}
              {loading}
            />
          {/if}
        </div>
      </div>
    </div>

    <!-- ── Right sidebar (between chart and quick-rail) ── -->
    {#if workspace.dockOpen && !chart.isFullscreen}
      <button
        type="button"
        class="dock-resizer"
        class:active={dockResizing}
        onmousedown={startDockResize}
        ondblclick={() => workspace.resetDockWidth()}
        aria-label="우측 패널 너비 조절"
        title="우측 패널 너비 조절, 더블클릭으로 초기화"
      ></button>
      <aside class="sidebar">
        <RightDock
          activeTab={workspace.dockTab}
          params={workspace.params}
          selectedSymbol={workspace.params.symbol}
          selectedMarket={workspace.params.market}
          interval={workspace.params.interval}
          onTabChange={(tab) => workspace.setDockTab(tab)}
          onClose={() => workspace.setDockOpen(false)}
          onSelectSymbol={selectSymbol}
          onParamsChange={updateParams}
          onOpenSettings={() => openSettings("appearance")}
        />
      </aside>
    {/if}

    <!-- ── Quick rail (rightmost, always-on nav) ── -->
    {#if !chart.isFullscreen}
      <aside class="quick-rail top-rail" aria-label="빠른 메뉴">
        <button
          type="button"
          class="rail-btn"
          class:active={workspace.dockOpen && workspace.dockTab === "settings"}
          onclick={() => toggleDockTab("settings")}
          title="내 투자"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18h16v2H4zM5 10h3v6H5zm5-4h3v10h-3zm5 6h3v4h-3z"/></svg>
          <span>내 투자</span>
        </button>
        <button
          type="button"
          class="rail-btn"
          class:active={workspace.dockOpen && workspace.dockTab === "watchlist"}
          onclick={() => toggleDockTab("watchlist")}
          title="관심"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7-4.35-9.33-8.2C.36 8.96 2.4 4.5 6.7 4.5c2.1 0 3.47 1.02 4.3 2.07.83-1.05 2.2-2.07 4.3-2.07 4.3 0 6.34 4.46 4.03 8.3C19 16.65 12 21 12 21Z"/></svg>
          <span>관심</span>
        </button>
        <button
          type="button"
          class="rail-btn"
          class:active={workspace.dockOpen && workspace.dockTab === "fundamentals"}
          onclick={() => toggleDockTab("fundamentals")}
          title="최근 본"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-2.34-5.66L15 9h7V2l-2.92 2.92A9.97 9.97 0 0 0 12 2Zm1 5h-2v6l5 3 1-1.73-4-2.27Z"/></svg>
          <span>최근 본</span>
        </button>
        <span class="rail-sep"></span>
        <button
          type="button"
          class="rail-btn"
          class:active={workspace.dockOpen && workspace.dockTab === "strategy"}
          onclick={() => toggleDockTab("strategy")}
          title="실시간"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z"/></svg>
          <span>실시간</span>
        </button>
      </aside>
    {/if}
  </div>
</main>

<CommandPalette bind:open={paletteOpen} {commands} />
<ShortcutsModal bind:open={shortcutsOpen} />
<SettingsPanel
  bind:open={settingsOpen}
  initialTab={settingsInitialTab}
  onParamsChange={updateParams}
  onApplySnapshot={applySnapshot}
/>
<IndicatorDialog
  bind:open={indicatorOpen}
  params={workspace.params}
  onParamsChange={updateParams}
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
    max-height: 34%;
    overflow: auto;
    padding: 0;
    border: 0;
    background: transparent;
    pointer-events: auto;
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
    .dock-resizer,
    .quick-rail { display: none; }
    .app { padding: 0; }
    .body { padding: 0 8px 8px; }
  }
</style>
