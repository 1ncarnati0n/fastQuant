import { browser } from "$app/environment";
import type { AnalysisParams } from "$lib/api/types";
import type { DockTab, Theme, WatchlistItem } from "$lib/stores/workspace.svelte";
import type { ChartType } from "$lib/stores/chart.svelte";

const STORAGE_KEY = "fastquant-snapshots-v1";
const MAX_SNAPSHOTS = 8;

export interface WorkspaceSnapshot {
  id: string;
  name: string;
  createdAt: number;
  params: AnalysisParams;
  theme: Theme;
  chartType: ChartType;
  dockTab: DockTab;
  watchlist: WatchlistItem[];
}

function load(): WorkspaceSnapshot[] {
  if (!browser) return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as WorkspaceSnapshot[]) : [];
  } catch {
    return [];
  }
}

function persist(items: WorkspaceSnapshot[]) {
  if (!browser) return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {}
}

function newId(): string {
  return `ws-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function createSnapshotsStore() {
  let items = $state<WorkspaceSnapshot[]>(load());

  return {
    get items() {
      return items;
    },

    save(snap: Omit<WorkspaceSnapshot, "id" | "createdAt" | "name"> & { name?: string }) {
      const name = (snap.name ?? "").trim() || `스냅샷 ${items.length + 1}`;
      const entry: WorkspaceSnapshot = {
        id: newId(),
        name,
        createdAt: Date.now(),
        params: snap.params,
        theme: snap.theme,
        chartType: snap.chartType,
        dockTab: snap.dockTab,
        watchlist: snap.watchlist,
      };
      items = [entry, ...items].slice(0, MAX_SNAPSHOTS);
      persist(items);
      return entry;
    },

    rename(id: string, name: string) {
      items = items.map((s) => (s.id === id ? { ...s, name: name.trim() || s.name } : s));
      persist(items);
    },

    remove(id: string) {
      items = items.filter((s) => s.id !== id);
      persist(items);
    },

    clear() {
      items = [];
      persist(items);
    },
  };
}

export const snapshots = createSnapshotsStore();
