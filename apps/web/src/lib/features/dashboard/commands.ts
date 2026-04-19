import type { AnalysisResponse, MarketType } from "$lib/api/types";
import type { CommandEntry } from "$lib/components/command/CommandPalette.svelte";
import type { WorkspaceSnapshot } from "$lib/stores/snapshots.svelte";
import type { DockTab, RecentSymbol, Theme, WatchlistItem } from "$lib/stores/workspace.svelte";

const MARKET_HINT: Record<MarketType, string> = {
  crypto: "코인",
  usStock: "미장",
  krStock: "국장",
  forex: "FX",
};

const PALETTE_INTERVALS = [
  "1m",
  "3m",
  "5m",
  "10m",
  "15m",
  "30m",
  "60m",
  "120m",
  "240m",
  "1d",
  "1w",
  "1M",
  "1Y",
];

export interface BuildDashboardCommandsArgs {
  analysis: AnalysisResponse | null;
  replayEnabled: boolean;
  theme: Theme;
  watchlist: WatchlistItem[];
  recentSymbols: RecentSymbol[];
  snapshots: WorkspaceSnapshot[];
  openDockTab: (tab: DockTab) => void;
  openSettings: (tabKey?: string) => void;
  selectSymbol: (symbol: string, market: MarketType, label?: string) => void;
  setInterval: (interval: string) => void;
  toggleTheme: () => void;
  toggleFullscreen: () => void;
  openShortcuts: () => void;
  loadAnalysis: () => void;
  toggleReplay: () => void;
  captureSnapshot: () => void;
  applySnapshot: (snapshot: WorkspaceSnapshot) => void;
}

export function buildDashboardCommands({
  analysis,
  replayEnabled,
  theme,
  watchlist,
  recentSymbols,
  snapshots,
  openDockTab,
  openSettings,
  selectSymbol,
  setInterval,
  toggleTheme,
  toggleFullscreen,
  openShortcuts,
  loadAnalysis,
  toggleReplay,
  captureSnapshot,
  applySnapshot,
}: BuildDashboardCommandsArgs): CommandEntry[] {
  const list: CommandEntry[] = [];

  list.push(
    {
      id: "panel-watchlist",
      title: "관심종목 열기",
      group: "패널",
      shortcut: ["⌘", "B"],
      run: () => openDockTab("watchlist"),
    },
    {
      id: "panel-indicators",
      title: "지표 패널 열기",
      group: "패널",
      run: () => openDockTab("indicators"),
    },
    {
      id: "panel-strategy",
      title: "전략 패널 열기",
      group: "패널",
      run: () => openDockTab("strategy"),
    },
    {
      id: "panel-fundamentals",
      title: "펀더멘털 패널 열기",
      group: "패널",
      run: () => openDockTab("fundamentals"),
    },
    {
      id: "panel-settings",
      title: "설정 패널 열기",
      group: "패널",
      run: () => openDockTab("settings"),
    },
  );

  for (const interval of PALETTE_INTERVALS) {
    list.push({
      id: `iv-${interval}`,
      title: `인터벌: ${interval}`,
      group: "인터벌",
      keywords: "interval timeframe",
      run: () => setInterval(interval),
    });
  }

  for (const item of watchlist) {
    list.push({
      id: `sym-${item.market}-${item.symbol}`,
      title: item.symbol,
      hint: item.label ?? MARKET_HINT[item.market],
      group: "심볼",
      keywords: `${item.label ?? ""} ${item.market}`,
      run: () => selectSymbol(item.symbol, item.market, item.label),
    });
  }

  for (const item of recentSymbols) {
    const inWatchlist = watchlist.some(
      (watchItem) => watchItem.symbol === item.symbol && watchItem.market === item.market,
    );
    if (inWatchlist) continue;

    list.push({
      id: `recent-${item.market}-${item.symbol}`,
      title: item.symbol,
      hint: item.label ?? `최근 · ${MARKET_HINT[item.market]}`,
      group: "최근",
      keywords: `${item.label ?? ""} ${item.market}`,
      run: () => selectSymbol(item.symbol, item.market, item.label),
    });
  }

  list.push(
    {
      id: "view-theme",
      title: theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환",
      group: "화면",
      run: toggleTheme,
    },
    {
      id: "view-fullscreen",
      title: "전체화면 전환",
      group: "화면",
      shortcut: ["F"],
      run: toggleFullscreen,
    },
    {
      id: "view-shortcuts",
      title: "단축키 도움말",
      group: "화면",
      shortcut: ["?"],
      run: openShortcuts,
    },
    {
      id: "view-refresh",
      title: "데이터 새로고침",
      group: "화면",
      run: loadAnalysis,
    },
    {
      id: "replay-toggle",
      title: replayEnabled ? "바 리플레이 종료" : "바 리플레이 시작",
      group: "화면",
      shortcut: ["R"],
      run: () => {
        if (!analysis) return;
        toggleReplay();
      },
    },
  );

  list.push(
    {
      id: "settings-open",
      title: "설정 열기",
      group: "설정",
      shortcut: ["⌘", ","],
      run: () => openSettings("indicators"),
    },
    {
      id: "settings-appearance",
      title: "설정 · 화면 탭",
      group: "설정",
      run: () => openSettings("appearance"),
    },
    {
      id: "settings-layout",
      title: "설정 · 레이아웃 탭",
      group: "설정",
      run: () => openSettings("layout"),
    },
  );

  list.push({
    id: "snapshot-save",
    title: "현재 상태를 스냅샷으로 저장",
    hint: "자동 이름",
    group: "스냅샷",
    keywords: "workspace save",
    run: captureSnapshot,
  });

  for (const snapshot of snapshots) {
    list.push({
      id: `snapshot-load-${snapshot.id}`,
      title: `불러오기 · ${snapshot.name}`,
      hint: `${snapshot.params.symbol} · ${snapshot.params.interval}`,
      group: "스냅샷",
      keywords: "workspace load",
      run: () => applySnapshot(snapshot),
    });
  }

  return list;
}
