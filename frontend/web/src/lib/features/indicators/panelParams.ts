import { defaultAnalysisParams } from "$lib/api/defaults";
import type { AnalysisParams } from "$lib/api/types";
import {
  getByPath,
  setByPath,
  type FieldSpec,
  type IndicatorSpec,
} from "$lib/chart/indicatorSpecs";

type ParamsRecord = Record<string, unknown>;

function asRecord(params: AnalysisParams): ParamsRecord {
  return params as unknown as ParamsRecord;
}

function cloneParams(params: AnalysisParams): ParamsRecord {
  return { ...asRecord(params) };
}

function arraysEqual(a: unknown, b: unknown): boolean {
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  return a.every((item, index) => item === b[index]);
}

function defaultFieldValue(spec: IndicatorSpec, field: FieldSpec): unknown {
  const defaultParams = defaultAnalysisParams as unknown as ParamsRecord;
  const directDefault = getByPath(defaultParams, field.path);
  if (directDefault !== undefined) return directDefault;

  if (spec.activation.kind !== "nullable" || !field.path.startsWith(`${spec.activation.path}.`)) {
    return undefined;
  }

  const nestedPath = field.path.slice(spec.activation.path.length + 1);
  return getByPath(spec.activation.defaultValue(), nestedPath);
}

export function isIndicatorActive(params: AnalysisParams, spec: IndicatorSpec): boolean {
  const values = asRecord(params);
  const activation = spec.activation;

  switch (activation.kind) {
    case "always":
      return true;
    case "boolean":
      return Boolean(values[activation.path]);
    case "nullable":
      return Boolean(values[activation.path]);
    case "arrayLength": {
      const arr = values[activation.path];
      return Array.isArray(arr) && arr.length > 0;
    }
  }
}

export function getIndicatorFieldValue(params: AnalysisParams, field: FieldSpec): unknown {
  const values = asRecord(params);

  if (field.kind === "numberArray") {
    return getByPath(values, field.path) ?? [];
  }

  return getByPath(values, field.path) ?? "";
}

export function isIndicatorCustomized(params: AnalysisParams, spec: IndicatorSpec): boolean {
  if (!isIndicatorActive(params, spec)) return false;

  for (const field of spec.fields) {
    const currentValue = getIndicatorFieldValue(params, field);
    const defaultValue = defaultFieldValue(spec, field);

    if (field.kind === "numberArray") {
      if (!arraysEqual(currentValue, defaultValue)) return true;
      continue;
    }

    if (currentValue !== defaultValue) return true;
  }

  return false;
}

export function matchesIndicatorQuery(spec: IndicatorSpec, normalizedQuery: string): boolean {
  if (!normalizedQuery) return true;

  return (
    spec.label.toLowerCase().includes(normalizedQuery) ||
    spec.description.toLowerCase().includes(normalizedQuery) ||
    spec.key.toLowerCase().includes(normalizedQuery)
  );
}

export function toggleIndicatorActivation(params: AnalysisParams, spec: IndicatorSpec): AnalysisParams {
  if (spec.activation.kind === "always") return params;

  const next = cloneParams(params);
  const active = isIndicatorActive(params, spec);
  const activation = spec.activation;

  switch (activation.kind) {
    case "boolean":
      next[activation.path] = !active;
      break;
    case "nullable":
      next[activation.path] = active ? null : activation.defaultValue();
      break;
    case "arrayLength":
      next[activation.path] = active ? [] : [...activation.defaultItems];
      break;
  }

  return next as unknown as AnalysisParams;
}

export function disableActiveIndicators(
  params: AnalysisParams,
  specs: IndicatorSpec[],
): AnalysisParams {
  const next = cloneParams(params);

  for (const spec of specs) {
    const activation = spec.activation;
    if (activation.kind === "always") continue;
    if (!isIndicatorActive(next as unknown as AnalysisParams, spec)) continue;

    switch (activation.kind) {
      case "boolean":
        next[activation.path] = false;
        break;
      case "nullable":
        next[activation.path] = null;
        break;
      case "arrayLength":
        next[activation.path] = [];
        break;
    }
  }

  return next as unknown as AnalysisParams;
}

export function updateIndicatorField(
  params: AnalysisParams,
  path: string,
  value: unknown,
): AnalysisParams {
  return setByPath(cloneParams(params), path, value) as unknown as AnalysisParams;
}

export function removeNumberArrayItem(
  params: AnalysisParams,
  path: string,
  index: number,
): AnalysisParams {
  const current = getByPath(asRecord(params), path);
  const nextArray = Array.isArray(current) ? [...current] : [];
  nextArray.splice(index, 1);
  return updateIndicatorField(params, path, nextArray);
}

export function addNumberArrayItem(
  params: AnalysisParams,
  path: string,
  rawValue: string,
): { params: AnalysisParams; added: boolean } {
  const parsed = Number.parseInt(rawValue, 10);
  if (!parsed || parsed <= 0) return { params, added: false };

  const current = getByPath(asRecord(params), path);
  const nextArray = Array.isArray(current) ? [...current] : [];
  if (nextArray.includes(parsed)) return { params, added: false };

  nextArray.push(parsed);
  nextArray.sort((a, b) => Number(a) - Number(b));

  return {
    params: updateIndicatorField(params, path, nextArray),
    added: true,
  };
}

export function resetIndicatorSpec(params: AnalysisParams, spec: IndicatorSpec): AnalysisParams {
  const activation = spec.activation;

  switch (activation.kind) {
    case "nullable":
      return updateIndicatorField(params, activation.path, activation.defaultValue());
    case "arrayLength":
      return updateIndicatorField(params, activation.path, [...activation.defaultItems]);
    default:
      return params;
  }
}

export function captureIndicatorValues(
  params: AnalysisParams,
  spec: IndicatorSpec,
): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  for (const field of spec.fields) {
    const value = getIndicatorFieldValue(params, field);
    values[field.path] = Array.isArray(value) ? [...value] : value;
  }

  return values;
}

export function groupIconPath(group: "overlay" | "pane"): string {
  return group === "overlay"
    ? "M3 18h4l3-8 4 12 3-10 4 6h0"
    : "M4 20V10m5 10V6m5 14v-8m5 8V14";
}
