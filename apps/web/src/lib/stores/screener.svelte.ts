import { browser } from "$app/environment";
import type { WatchlistSnapshot } from "$lib/api/types";

export type ScreenerField = "changePct" | "absChangePct" | "lastPrice" | "volumeProxy";
export type ScreenerOp = "gt" | "lt" | "gte" | "lte";
export type ScreenerMode = "all" | "any";

export interface ScreenerRule {
  id: string;
  field: ScreenerField;
  op: ScreenerOp;
  value: number;
}

export interface ScreenerPreset {
  id: string;
  name: string;
  mode: ScreenerMode;
  rules: Omit<ScreenerRule, "id">[];
}

export const FIELD_LABELS: Record<ScreenerField, string> = {
  changePct:    "변동률 (%)",
  absChangePct: "절대 변동률 (%)",
  lastPrice:    "현재가",
  volumeProxy:  "활동성 (|변동률|×가격)",
};

export const OP_LABELS: Record<ScreenerOp, string> = {
  gt:  ">",
  lt:  "<",
  gte: "≥",
  lte: "≤",
};

export const BUILTIN_PRESETS: ScreenerPreset[] = [
  {
    id: "bullish-3pct",
    name: "강세 (+3% 이상)",
    mode: "all",
    rules: [{ field: "changePct", op: "gte", value: 3 }],
  },
  {
    id: "bearish-3pct",
    name: "약세 (-3% 이하)",
    mode: "all",
    rules: [{ field: "changePct", op: "lte", value: -3 }],
  },
  {
    id: "volatile",
    name: "고변동 (|변동률|≥5%)",
    mode: "all",
    rules: [{ field: "absChangePct", op: "gte", value: 5 }],
  },
  {
    id: "lowprice-bullish",
    name: "저가 강세 (가격<50 & +1%↑)",
    mode: "all",
    rules: [
      { field: "lastPrice", op: "lt", value: 50 },
      { field: "changePct", op: "gt", value: 1 },
    ],
  },
];

function valueOf(snap: WatchlistSnapshot, field: ScreenerField): number {
  switch (field) {
    case "changePct":    return snap.changePct;
    case "absChangePct": return Math.abs(snap.changePct);
    case "lastPrice":    return snap.lastPrice;
    case "volumeProxy":  return Math.abs(snap.changePct) * snap.lastPrice;
  }
}

function test(snap: WatchlistSnapshot, rule: ScreenerRule): boolean {
  const v = valueOf(snap, rule.field);
  if (!Number.isFinite(v)) return false;
  switch (rule.op) {
    case "gt":  return v > rule.value;
    case "lt":  return v < rule.value;
    case "gte": return v >= rule.value;
    case "lte": return v <= rule.value;
  }
}

export function matchesScreener(
  snap: WatchlistSnapshot,
  rules: ScreenerRule[],
  mode: ScreenerMode,
): boolean {
  if (rules.length === 0) return true;
  if (mode === "all") return rules.every((r) => test(snap, r));
  return rules.some((r) => test(snap, r));
}

const STORAGE_KEY = "fastquant-screener-v1";
const MAX_PRESETS = 8;

interface Saved {
  enabled: boolean;
  mode: ScreenerMode;
  rules: ScreenerRule[];
  userPresets: ScreenerPreset[];
}

function load(): Saved {
  const fallback: Saved = { enabled: false, mode: "all", rules: [], userPresets: [] };
  if (!browser) return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const p = JSON.parse(raw) as Partial<Saved>;
    return {
      enabled: p.enabled === true,
      mode: p.mode === "any" ? "any" : "all",
      rules: Array.isArray(p.rules) ? (p.rules as ScreenerRule[]) : [],
      userPresets: Array.isArray(p.userPresets) ? (p.userPresets as ScreenerPreset[]).slice(0, MAX_PRESETS) : [],
    };
  } catch {
    return fallback;
  }
}

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function createScreener() {
  const saved = load();
  let enabled = $state(saved.enabled);
  let mode = $state<ScreenerMode>(saved.mode);
  let rules = $state<ScreenerRule[]>(saved.rules);
  let userPresets = $state<ScreenerPreset[]>(saved.userPresets);

  $effect.root(() => {
    $effect(() => {
      if (!browser) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ enabled, mode, rules, userPresets }));
    });
  });

  return {
    get enabled() { return enabled; },
    get mode() { return mode; },
    get rules() { return rules; },
    get userPresets() { return userPresets; },

    setEnabled(v: boolean) { enabled = v; },
    toggleEnabled() { enabled = !enabled; },
    setMode(m: ScreenerMode) { mode = m; },

    addRule(rule: Omit<ScreenerRule, "id">) {
      rules = [...rules, { ...rule, id: newId("rule") }];
      enabled = true;
    },
    removeRule(id: string) {
      rules = rules.filter((r) => r.id !== id);
    },
    updateRule(id: string, patch: Partial<Omit<ScreenerRule, "id">>) {
      rules = rules.map((r) => (r.id === id ? { ...r, ...patch } : r));
    },
    clearRules() {
      rules = [];
    },

    applyPreset(preset: ScreenerPreset) {
      mode = preset.mode;
      rules = preset.rules.map((r) => ({ ...r, id: newId("rule") }));
      enabled = true;
    },
    saveAsPreset(name: string) {
      const trimmed = name.trim();
      if (!trimmed || rules.length === 0) return;
      const entry: ScreenerPreset = {
        id: newId("uspres"),
        name: trimmed,
        mode,
        rules: rules.map(({ id: _id, ...rest }) => rest),
      };
      userPresets = [entry, ...userPresets].slice(0, MAX_PRESETS);
    },
    removePreset(id: string) {
      userPresets = userPresets.filter((p) => p.id !== id);
    },
  };
}

export const screener = createScreener();
