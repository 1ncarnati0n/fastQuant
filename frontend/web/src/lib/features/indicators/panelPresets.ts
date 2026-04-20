import type { AnalysisParams } from "$lib/api/types";
import { setByPath, type IndicatorSpec } from "$lib/chart/indicatorSpecs";

export interface IndicatorPreset {
  id: string;
  name: string;
  indicatorKey: string;
  values: Record<string, unknown>;
}

export const INDICATOR_PRESET_STORAGE_KEY = "fastquant.indicator.presets.v1";

export function loadIndicatorPresets(): IndicatorPreset[] {
  if (typeof localStorage === "undefined") return [];

  try {
    const raw = localStorage.getItem(INDICATOR_PRESET_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as IndicatorPreset[]) : [];
  } catch {
    return [];
  }
}

export function persistIndicatorPresets(presets: IndicatorPreset[]): void {
  if (typeof localStorage === "undefined") return;

  try {
    localStorage.setItem(INDICATOR_PRESET_STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // Storage can fail in private browsing or quota-limited contexts.
  }
}

export function createIndicatorPreset(
  indicatorKey: string,
  name: string,
  values: Record<string, unknown>,
): IndicatorPreset {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    indicatorKey,
    values,
  };
}

export function applyIndicatorPresetToParams(
  params: AnalysisParams,
  spec: IndicatorSpec,
  preset: IndicatorPreset,
  isActive: boolean,
): AnalysisParams {
  let next = { ...(params as unknown as Record<string, unknown>) };

  for (const field of spec.fields) {
    if (!(field.path in preset.values)) continue;
    next = setByPath(next, field.path, preset.values[field.path]);
  }

  if (!isActive && spec.activation.kind !== "always") {
    switch (spec.activation.kind) {
      case "boolean":
        next[spec.activation.path] = true;
        break;
      case "nullable":
        next[spec.activation.path] = next[spec.activation.path] ?? spec.activation.defaultValue();
        break;
      case "arrayLength":
        if (
          !Array.isArray(next[spec.activation.path]) ||
          (next[spec.activation.path] as unknown[]).length === 0
        ) {
          next[spec.activation.path] = [...spec.activation.defaultItems];
        }
        break;
    }
  }

  return next as unknown as AnalysisParams;
}
