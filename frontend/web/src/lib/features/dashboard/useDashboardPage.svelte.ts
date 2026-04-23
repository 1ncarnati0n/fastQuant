import { browser } from "$app/environment";
import type { AnalysisParams, AnalysisResponse, Candle, FundamentalsResponse, MarketType } from "$lib/api/types";
import { fetchAnalysis, fetchFundamentals } from "$lib/api/client";
import type { DrawingTool } from "$lib/chart/drawing/types";
import { countActiveIndicators } from "$lib/chart/indicatorSpecs";
import { createCompareRequestKey, haveSameCompareSymbols, pruneCompareData } from "$lib/features/dashboard/compareData";
import { buildDashboardCommands } from "$lib/features/dashboard/commands";
import { calculateDockWidth } from "$lib/features/dashboard/dockResize";
import type { ReplaySpeed } from "$lib/features/replay/controlConfig";
import { installShortcuts } from "$lib/features/dashboard/useShortcuts.svelte";
import type { CommandEntry } from "$lib/components/command/CommandPalette.svelte";
import { chart, CHART_TYPE_LABELS, COMPARE_COLORS, type ChartType, type PriceScaleMode } from "$lib/stores/chart.svelte";
import { drawing } from "$lib/stores/drawing.svelte";
import { replay } from "$lib/stores/replay.svelte";
import { snapshots, type WorkspaceSnapshot } from "$lib/stores/snapshots.svelte";
import { workspace, type DockTab, type Theme } from "$lib/stores/workspace.svelte";
import { sliceAnalysisAt } from "$lib/utils/replaySlice";

export interface DashboardSettingsState {
  theme: Theme;
  chartType: ChartType;
  chartTypeLabels: Readonly<Record<ChartType, string>>;
  priceScaleMode: PriceScaleMode;
  timeAxisVisible: boolean;
  compareSymbols: string[];
  compareColors: readonly string[];
  maxCompare: number;
  drawingActiveTool: DrawingTool;
  drawingCount: number;
  drawingCanUndo: boolean;
  drawingCanRedo: boolean;
  replaySpeed: ReplaySpeed;
  replayLookback: number;
  replayEnabled: boolean;
  replayCurrentIndex: number;
  snapshots: WorkspaceSnapshot[];
}

export interface DashboardReplayState {
  enabled: boolean;
  playing: boolean;
  speed: ReplaySpeed;
  currentIndex: number;
}

export interface DashboardSettingsActions {
  toggleTheme: () => void;
  resetDockWidth: () => void;
  setChartType: (next: ChartType) => void;
  setPriceScaleMode: (next: PriceScaleMode) => void;
  toggleTimeAxis: () => void;
  addCompareSymbol: (symbol: string) => boolean;
  removeCompareSymbol: (symbol: string) => void;
  toggleFullscreen: () => void;
  setDrawingTool: (tool: DrawingTool) => void;
  undoDrawing: () => void;
  redoDrawing: () => void;
  clearDrawings: () => void;
  setReplaySpeed: (next: ReplaySpeed) => void;
  setReplayLookback: (next: number) => void;
  takeSnapshot: (name?: string) => WorkspaceSnapshot;
  removeSnapshot: (id: string) => void;
  applySnapshot: (snap: WorkspaceSnapshot) => void;
}

export interface DashboardReplayActions {
  togglePlaying: () => void;
  step: (delta: number, totalBars: number) => void;
  setSpeed: (next: ReplaySpeed) => void;
  setIndex: (index: number, totalBars: number) => void;
  exit: () => void;
  tick: (totalBars: number) => void;
}

export function createDashboardPageController() {
  let analysis = $state<AnalysisResponse | null>(null);
  let fundamentals = $state<FundamentalsResponse | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);
  let fundamentalsLoading = $state(false);
  let fundamentalsError = $state<string | null>(null);
  let compareData = $state<Record<string, Candle[]>>({});
  let paletteOpen = $state(false);
  let shortcutsOpen = $state(false);
  let settingsOpen = $state(false);
  let indicatorOpen = $state(false);
  let settingsInitialTab = $state("indicators");
  let dockResizing = $state(false);
  let mainTab = $state<"chart" | "fundamentals">("chart");
  let analysisRequestId = 0;
  let fundamentalsRequestId = 0;
  const compareInFlight = new Set<string>();

  const effectiveAnalysis = $derived(
    analysis && replay.enabled ? sliceAnalysisAt(analysis, replay.currentIndex) : analysis,
  );

  const indicatorCount = $derived(
    countActiveIndicators(workspace.params as unknown as Record<string, unknown>),
  );

  async function fetchCompareCandles(symbol: string, market: MarketType, interval: string) {
    const key = createCompareRequestKey(symbol, market, interval);
    if (compareInFlight.has(key)) return;
    compareInFlight.add(key);
    try {
      const response = await fetchAnalysis({
        ...workspace.params,
        symbol,
        market,
        interval,
      });
      compareData = { ...compareData, [symbol]: response.candles };
    } catch {
      // Ignore compare overlay failures and keep previous lines intact.
    } finally {
      compareInFlight.delete(key);
    }
  }

  $effect(() => {
    const symbols = chart.compareSymbols;
    const market = workspace.params.market;
    const interval = workspace.params.interval;

    for (const symbol of symbols) {
      if (!compareData[symbol]) void fetchCompareCandles(symbol, market, interval);
    }

    const next = pruneCompareData(compareData, symbols);
    if (!haveSameCompareSymbols(compareData, next)) compareData = next;
  });

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
      fundamentalsError = null;
      fundamentalsLoading = false;
      return;
    }
    void loadFundamentals(symbol, market);
  });

  function openSettings(tabKey = "indicators") {
    settingsInitialTab = tabKey;
    settingsOpen = true;
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

  function applySnapshot(snap: WorkspaceSnapshot) {
    if (workspace.theme !== snap.theme) workspace.toggleTheme();
    chart.setChartType(snap.chartType);
    workspace.setDockTab(snap.dockTab);
    workspace.setParams(snap.params);
    void loadAnalysis(snap.params);
  }

  const commands = $derived.by<CommandEntry[]>(() =>
    buildDashboardCommands({
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
      openShortcuts: () => {
        shortcutsOpen = true;
      },
      loadAnalysis: () => {
        void loadAnalysis();
      },
      toggleReplay: () => {
        if (!analysis) return;
        replay.toggleEnabled(analysis.candles.length);
      },
      captureSnapshot: () => captureSnapshot(),
      applySnapshot,
    }),
  );

  const settingsActions: DashboardSettingsActions = {
    toggleTheme: () => workspace.toggleTheme(),
    resetDockWidth: () => workspace.resetDockWidth(),
    setChartType: (next) => chart.setChartType(next),
    setPriceScaleMode: (next) => chart.setPriceScaleMode(next),
    toggleTimeAxis: () => chart.toggleTimeAxis(),
    addCompareSymbol: (symbol) => chart.addCompareSymbol(symbol),
    removeCompareSymbol: (symbol) => chart.removeCompareSymbol(symbol),
    toggleFullscreen: () => chart.toggleFullscreen(),
    setDrawingTool: (tool) => drawing.setTool(tool),
    undoDrawing: () => drawing.undo(),
    redoDrawing: () => drawing.redo(),
    clearDrawings: () => drawing.clear(),
    setReplaySpeed: (next) => replay.setSpeed(next),
    setReplayLookback: (next) => replay.setLookback(next),
    takeSnapshot: (name) => captureSnapshot(name),
    removeSnapshot: (id) => snapshots.remove(id),
    applySnapshot,
  };

  const replayActions: DashboardReplayActions = {
    togglePlaying: () => replay.togglePlaying(),
    step: (delta, totalBars) => replay.step(delta, totalBars),
    setSpeed: (next) => replay.setSpeed(next),
    setIndex: (index, totalBars) => replay.setIndex(index, totalBars),
    exit: () => replay.exit(),
    tick: (totalBars) => replay.tick(totalBars),
  };

  function initialize() {
    void loadAnalysis();
    return installShortcuts({
      onCommandPalette: () => {
        paletteOpen = true;
      },
      onShortcutsHelp: () => {
        shortcutsOpen = true;
      },
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
  }

  async function loadAnalysis(target: AnalysisParams = workspace.params) {
    const requestId = ++analysisRequestId;
    loading = true;
    error = null;
    try {
      const response = await fetchAnalysis(target);
      if (requestId !== analysisRequestId) return;
      analysis = response;
    } catch (caught) {
      if (requestId !== analysisRequestId) return;
      error = caught instanceof Error ? caught.message : "분석 데이터를 불러오지 못했습니다";
    } finally {
      if (requestId === analysisRequestId) loading = false;
    }
  }

  async function loadFundamentals(symbol: string, market: MarketType) {
    const requestId = ++fundamentalsRequestId;
    fundamentalsLoading = true;
    fundamentalsError = null;
    try {
      const response = await fetchFundamentals({ symbol, market });
      if (requestId !== fundamentalsRequestId) return;
      fundamentals = response;
    } catch (caught) {
      if (requestId !== fundamentalsRequestId) return;
      fundamentals = null;
      fundamentalsError = caught instanceof Error ? caught.message : "펀더멘털 데이터를 불러오지 못했습니다";
    } finally {
      if (requestId === fundamentalsRequestId) fundamentalsLoading = false;
    }
  }

  function selectSymbol(symbol: string, market: MarketType, label?: string) {
    const next = { ...workspace.params, symbol, market };
    workspace.selectSymbol(symbol, market, label);
    void loadAnalysis(next);
  }

  function setInterval(interval: string) {
    const next = { ...workspace.params, interval };
    workspace.patchParams({ interval });
    void loadAnalysis(next);
  }

  function updateParams(next: AnalysisParams) {
    workspace.setParams(next);
    void loadAnalysis(next);
  }

  function openDockTab(tab: DockTab) {
    workspace.setDockTab(tab);
  }

  function toggleDockTab(tab: DockTab) {
    if (workspace.dockOpen && workspace.dockTab === tab) {
      workspace.setDockOpen(false);
      return;
    }
    workspace.setDockTab(tab);
  }

  function startDockResize(event: MouseEvent, shellWidth: number) {
    if (!browser) return;
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = workspace.dockWidth;
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

  function deleteOrUndoDrawing() {
    if (drawing.selectedId) {
      drawing.remove(drawing.selectedId);
      return;
    }
    if (drawing.drawings.length > 0) drawing.undo();
  }

  return {
    get analysis() {
      return analysis;
    },
    get effectiveAnalysis() {
      return effectiveAnalysis;
    },
    get fundamentals() {
      return fundamentals;
    },
    get fundamentalsLoading() {
      return fundamentalsLoading;
    },
    get fundamentalsError() {
      return fundamentalsError;
    },
    get loading() {
      return loading;
    },
    get error() {
      return error;
    },
    get compareData() {
      return compareData;
    },
    get indicatorCount() {
      return indicatorCount;
    },
    get commands() {
      return commands;
    },
    get params() {
      return workspace.params;
    },
    get theme() {
      return workspace.theme;
    },
    get dockTab() {
      return workspace.dockTab;
    },
    get dockOpen() {
      return workspace.dockOpen;
    },
    get dockWidth() {
      return workspace.dockWidth;
    },
    get watchlist() {
      return workspace.watchlist;
    },
    get isFullscreen() {
      return chart.isFullscreen;
    },
    get mainTab() {
      return mainTab;
    },
    set mainTab(next: "chart" | "fundamentals") {
      mainTab = next;
    },
    get paletteOpen() {
      return paletteOpen;
    },
    set paletteOpen(next: boolean) {
      paletteOpen = next;
    },
    get shortcutsOpen() {
      return shortcutsOpen;
    },
    set shortcutsOpen(next: boolean) {
      shortcutsOpen = next;
    },
    get settingsOpen() {
      return settingsOpen;
    },
    set settingsOpen(next: boolean) {
      settingsOpen = next;
    },
    get indicatorOpen() {
      return indicatorOpen;
    },
    set indicatorOpen(next: boolean) {
      indicatorOpen = next;
    },
    get settingsInitialTab() {
      return settingsInitialTab;
    },
    get dockResizing() {
      return dockResizing;
    },
    get chartTypeLabels() {
      return CHART_TYPE_LABELS;
    },
    get settingsState(): DashboardSettingsState {
      return {
        theme: workspace.theme,
        chartType: chart.chartType,
        chartTypeLabels: CHART_TYPE_LABELS,
        priceScaleMode: chart.priceScaleMode,
        timeAxisVisible: chart.timeAxisVisible,
        compareSymbols: chart.compareSymbols,
        compareColors: COMPARE_COLORS,
        maxCompare: chart.maxCompare,
        drawingActiveTool: drawing.activeTool,
        drawingCount: drawing.drawings.length,
        drawingCanUndo: drawing.canUndo,
        drawingCanRedo: drawing.canRedo,
        replaySpeed: replay.speed,
        replayLookback: replay.lookback,
        replayEnabled: replay.enabled,
        replayCurrentIndex: replay.currentIndex,
        snapshots: snapshots.items,
      };
    },
    get settingsActions() {
      return settingsActions;
    },
    get replayState(): DashboardReplayState {
      return {
        enabled: replay.enabled,
        playing: replay.playing,
        speed: replay.speed,
        currentIndex: replay.currentIndex,
      };
    },
    get replayActions() {
      return replayActions;
    },
    initialize,
    openSettings,
    loadAnalysis,
    selectSymbol,
    setInterval,
    updateParams,
    openDockTab,
    toggleDockTab,
    startDockResize,
    deleteOrUndoDrawing,
  };
}
