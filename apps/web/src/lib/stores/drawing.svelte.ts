import { browser } from "$app/environment";
import type { DrawingItem, DrawingTool } from "$lib/chart/drawing/types";

const MAX_UNDO = 20;
const STORAGE_PREFIX = "fastquant-drawings-v1";

function storageKey(symbol: string, interval: string): string {
  return `${STORAGE_PREFIX}-${symbol.toUpperCase()}-${interval}`;
}

function load(symbol: string, interval: string): DrawingItem[] {
  if (!browser) return [];
  try {
    const raw = localStorage.getItem(storageKey(symbol, interval));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DrawingItem[]) : [];
  } catch { return []; }
}

function save(symbol: string, interval: string, items: DrawingItem[]) {
  if (!browser) return;
  try { localStorage.setItem(storageKey(symbol, interval), JSON.stringify(items)); } catch {}
}

function createDrawingStore() {
  let activeTool = $state<DrawingTool>("none");
  let drawings = $state<DrawingItem[]>([]);
  let selectedId = $state<string | null>(null);
  let undoStack = $state<DrawingItem[][]>([]);
  let redoStack = $state<DrawingItem[][]>([]);
  let _symbol = "";
  let _interval = "";

  function pushUndo(prev: DrawingItem[]) {
    undoStack = [...undoStack.slice(-(MAX_UNDO - 1)), prev];
    redoStack = [];
  }

  function persist(next: DrawingItem[]) {
    drawings = next;
    save(_symbol, _interval, next);
  }

  return {
    get activeTool() { return activeTool; },
    get drawings() { return drawings; },
    get selectedId() { return selectedId; },
    get canUndo() { return undoStack.length > 0; },
    get canRedo() { return redoStack.length > 0; },

    setContext(symbol: string, interval: string) {
      _symbol = symbol;
      _interval = interval;
      drawings = load(symbol, interval);
      selectedId = null;
      undoStack = [];
      redoStack = [];
    },

    setTool(tool: DrawingTool) {
      activeTool = tool;
    },

    add(item: DrawingItem) {
      pushUndo([...drawings]);
      persist([...drawings, item]);
      selectedId = item.id;
    },

    remove(id: string) {
      pushUndo([...drawings]);
      persist(drawings.filter((d) => d.id !== id));
      if (selectedId === id) selectedId = null;
    },

    select(id: string | null) {
      selectedId = id;
    },

    clear() {
      pushUndo([...drawings]);
      persist([]);
      selectedId = null;
    },

    undo() {
      if (undoStack.length === 0) return;
      const prev = undoStack[undoStack.length - 1];
      redoStack = [...redoStack, [...drawings]];
      undoStack = undoStack.slice(0, -1);
      persist(prev);
      selectedId = null;
    },

    redo() {
      if (redoStack.length === 0) return;
      const next = redoStack[redoStack.length - 1];
      pushUndo([...drawings]);
      redoStack = redoStack.slice(0, -1);
      persist(next);
    },
  };
}

export const drawing = createDrawingStore();
