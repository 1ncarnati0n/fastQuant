export type ActivationSpec =
  | { kind: "always" }
  | { kind: "boolean"; path: string }
  | { kind: "nullable"; path: string; defaultValue: () => Record<string, unknown> }
  | { kind: "arrayLength"; path: string; defaultItems: number[] };

export type FieldSpec =
  | { kind: "number"; path: string; label: string; min?: number; max?: number; step?: number }
  | { kind: "nestedNumber"; path: string; label: string; min?: number; max?: number; step?: number }
  | { kind: "numberArray"; path: string; label: string; min?: number; max?: number; colors?: readonly string[] };

export interface IndicatorSpec {
  key: string;
  group: "overlay" | "pane";
  label: string;
  description: string;
  activation: ActivationSpec;
  fields: FieldSpec[];
}

export const INDICATOR_SPECS: IndicatorSpec[] = [
  // ── 상단 지표 (오버레이) ────────────────────────────────
  {
    key: "bb",
    group: "overlay",
    label: "볼린저 밴드",
    description: "이동평균 ± N×표준편차의 밴드 채널",
    activation: { kind: "boolean", path: "showBollingerBands" },
    fields: [
      { kind: "number", path: "bbPeriod",     label: "기간",    min: 5,   max: 200, step: 1   },
      { kind: "number", path: "bbMultiplier", label: "배수(σ)", min: 0.5, max: 4,   step: 0.5 },
    ],
  },
  {
    key: "sma",
    group: "overlay",
    label: "단순이동평균",
    description: "산술 평균 이동평균선 (복수 기간 지원)",
    activation: { kind: "arrayLength", path: "smaPeriods", defaultItems: [20, 50] },
    fields: [
      {
        kind: "numberArray",
        path: "smaPeriods",
        label: "기간 목록",
        min: 2, max: 500,
        colors: ["#f59e0b", "#ec4899", "#22c55e", "#a78bfa"],
      },
    ],
  },
  {
    key: "ema",
    group: "overlay",
    label: "지수이동평균",
    description: "최근 값에 더 큰 가중치를 주는 이동평균",
    activation: { kind: "arrayLength", path: "emaPeriods", defaultItems: [12, 26] },
    fields: [
      {
        kind: "numberArray",
        path: "emaPeriods",
        label: "기간 목록",
        min: 2, max: 500,
        colors: ["#3b82f6", "#ef4444", "#10b981", "#f97316"],
      },
    ],
  },
  {
    key: "hma",
    group: "overlay",
    label: "헐 이동평균",
    description: "빠르고 부드러운 Hull Moving Average",
    activation: { kind: "arrayLength", path: "hmaPeriods", defaultItems: [20] },
    fields: [
      {
        kind: "numberArray",
        path: "hmaPeriods",
        label: "기간 목록",
        min: 2, max: 500,
        colors: ["#8b5cf6", "#6366f1"],
      },
    ],
  },
  {
    key: "donchian",
    group: "overlay",
    label: "돈치안 채널",
    description: "N기간 최고가 / 최저가 채널",
    activation: { kind: "nullable", path: "donchian", defaultValue: () => ({ period: 20 }) },
    fields: [
      { kind: "nestedNumber", path: "donchian.period", label: "기간", min: 5, max: 200, step: 1 },
    ],
  },
  {
    key: "keltner",
    group: "overlay",
    label: "켈트너 채널",
    description: "EMA ± 배수×ATR 채널",
    activation: {
      kind: "nullable",
      path: "keltner",
      defaultValue: () => ({ emaPeriod: 20, atrPeriod: 10, atrMultiplier: 2 }),
    },
    fields: [
      { kind: "nestedNumber", path: "keltner.emaPeriod",     label: "EMA 기간",  min: 5,   max: 200, step: 1   },
      { kind: "nestedNumber", path: "keltner.atrPeriod",     label: "ATR 기간",  min: 2,   max: 50,  step: 1   },
      { kind: "nestedNumber", path: "keltner.atrMultiplier", label: "ATR 배수",  min: 0.5, max: 4,   step: 0.5 },
    ],
  },
  {
    key: "vwap",
    group: "overlay",
    label: "VWAP",
    description: "거래량 가중 평균 가격선",
    activation: { kind: "boolean", path: "showVwap" },
    fields: [],
  },
  {
    key: "volumeProfile",
    group: "overlay",
    label: "거래량 프로파일",
    description: "가격대별 거래량 분포",
    activation: { kind: "boolean", path: "showVolumeProfile" },
    fields: [],
  },
  {
    key: "ichimoku",
    group: "overlay",
    label: "일목균형표",
    description: "전환선, 기준선, 구름대 기반 추세 지표",
    activation: { kind: "boolean", path: "showIchimoku" },
    fields: [],
  },
  {
    key: "supertrend",
    group: "overlay",
    label: "슈퍼트렌드",
    description: "ATR 기반 추세 전환선",
    activation: { kind: "boolean", path: "showSupertrend" },
    fields: [],
  },
  {
    key: "parabolicSar",
    group: "overlay",
    label: "Parabolic SAR",
    description: "추세 전환 가능 지점을 점으로 표시",
    activation: { kind: "boolean", path: "showParabolicSar" },
    fields: [],
  },
  {
    key: "autoFib",
    group: "overlay",
    label: "Auto Fibonacci",
    description: "스윙 고/저점 기반 자동 피보나치 레벨",
    activation: {
      kind: "nullable",
      path: "autoFib",
      defaultValue: () => ({ lookback: 120, swingLength: 5 }),
    },
    fields: [
      { kind: "nestedNumber", path: "autoFib.lookback",    label: "탐색 범위", min: 20, max: 500, step: 5 },
      { kind: "nestedNumber", path: "autoFib.swingLength", label: "스윙 길이", min: 2,  max: 20,  step: 1 },
    ],
  },
  {
    key: "smc",
    group: "overlay",
    label: "SMC",
    description: "BOS / CHoCH 이벤트 표시 (스마트머니 컨셉)",
    activation: { kind: "nullable", path: "smc", defaultValue: () => ({ swingLength: 5 }) },
    fields: [
      { kind: "nestedNumber", path: "smc.swingLength", label: "스윙 길이", min: 2, max: 20, step: 1 },
    ],
  },

  // ── 하단 지표 (Pane) ────────────────────────────────────
  {
    key: "volume",
    group: "pane",
    label: "거래량",
    description: "거래량 막대 패널",
    activation: { kind: "boolean", path: "showVolume" },
    fields: [],
  },
  {
    key: "rsi",
    group: "pane",
    label: "RSI",
    description: "상대강도지수 (과매수 70 / 과매도 30)",
    activation: { kind: "boolean", path: "showRsi" },
    fields: [
      { kind: "number", path: "rsiPeriod", label: "기간", min: 2, max: 100, step: 1 },
    ],
  },
  {
    key: "macd",
    group: "pane",
    label: "MACD",
    description: "이동평균 수렴·발산 + 시그널 + 히스토그램",
    activation: {
      kind: "nullable",
      path: "macd",
      defaultValue: () => ({ fastPeriod: 12, slowPeriod: 26, signalPeriod: 9 }),
    },
    fields: [
      { kind: "nestedNumber", path: "macd.fastPeriod",   label: "빠른 기간",   min: 2,  max: 50,  step: 1 },
      { kind: "nestedNumber", path: "macd.slowPeriod",   label: "느린 기간",   min: 5,  max: 100, step: 1 },
      { kind: "nestedNumber", path: "macd.signalPeriod", label: "시그널 기간", min: 2,  max: 50,  step: 1 },
    ],
  },
  {
    key: "stochastic",
    group: "pane",
    label: "Stochastic",
    description: "%K / %D 모멘텀 오실레이터",
    activation: {
      kind: "nullable",
      path: "stochastic",
      defaultValue: () => ({ kPeriod: 14, dPeriod: 3, smooth: 3 }),
    },
    fields: [
      { kind: "nestedNumber", path: "stochastic.kPeriod", label: "%K 기간", min: 2, max: 50, step: 1 },
      { kind: "nestedNumber", path: "stochastic.dPeriod", label: "%D 기간", min: 1, max: 20, step: 1 },
      { kind: "nestedNumber", path: "stochastic.smooth",  label: "스무딩",  min: 1, max: 10, step: 1 },
    ],
  },
  {
    key: "showObv",
    group: "pane",
    label: "OBV",
    description: "On-Balance Volume — 누적 거래량 흐름",
    activation: { kind: "boolean", path: "showObv" },
    fields: [],
  },
  {
    key: "showCvd",
    group: "pane",
    label: "CVD",
    description: "Cumulative Volume Delta — 캔들 방향 거래량",
    activation: { kind: "boolean", path: "showCvd" },
    fields: [],
  },
  {
    key: "mfi",
    group: "pane",
    label: "MFI",
    description: "Money Flow Index — Volume-weighted RSI",
    activation: { kind: "nullable", path: "mfi", defaultValue: () => ({ period: 14 }) },
    fields: [
      { kind: "nestedNumber", path: "mfi.period", label: "기간", min: 2, max: 100, step: 1 },
    ],
  },
  {
    key: "cmf",
    group: "pane",
    label: "CMF",
    description: "Chaikin Money Flow — 자금 흐름 오실레이터",
    activation: { kind: "nullable", path: "cmf", defaultValue: () => ({ period: 20 }) },
    fields: [
      { kind: "nestedNumber", path: "cmf.period", label: "기간", min: 2, max: 100, step: 1 },
    ],
  },
  {
    key: "adx",
    group: "pane",
    label: "ADX",
    description: "Average Directional Index — 추세 강도 측정",
    activation: { kind: "nullable", path: "adx", defaultValue: () => ({ period: 14 }) },
    fields: [
      { kind: "nestedNumber", path: "adx.period", label: "기간", min: 2, max: 100, step: 1 },
    ],
  },
  {
    key: "stc",
    group: "pane",
    label: "STC",
    description: "Schaff Trend Cycle — 사이클 기반 추세 지표",
    activation: {
      kind: "nullable",
      path: "stc",
      defaultValue: () => ({ tcLen: 10, fastMa: 23, slowMa: 50 }),
    },
    fields: [
      { kind: "nestedNumber", path: "stc.tcLen",  label: "TC 길이",  min: 2, max: 50,  step: 1 },
      { kind: "nestedNumber", path: "stc.fastMa", label: "빠른 MA",  min: 2, max: 50,  step: 1 },
      { kind: "nestedNumber", path: "stc.slowMa", label: "느린 MA",  min: 5, max: 200, step: 1 },
    ],
  },
  {
    key: "atr",
    group: "pane",
    label: "ATR",
    description: "Average True Range — 변동성 측정",
    activation: { kind: "boolean", path: "showAtr" },
    fields: [],
  },
];

// ── 경로 헬퍼 ──────────────────────────────────────────────

export function getByPath(obj: Record<string, unknown>, path: string): unknown {
  const [head, ...rest] = path.split(".");
  if (rest.length === 0) return obj[head];
  const next = obj[head];
  if (!next || typeof next !== "object") return undefined;
  return getByPath(next as Record<string, unknown>, rest.join("."));
}

export function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const [head, ...rest] = path.split(".");
  if (rest.length === 0) return { ...obj, [head]: value };
  const sub = (obj[head] ?? {}) as Record<string, unknown>;
  return { ...obj, [head]: setByPath(sub, rest.join("."), value) };
}

// 활성 지표 count (indicatorCount badge 용)
export function countActiveIndicators(params: Record<string, unknown>): number {
  let n = 0;
  for (const spec of INDICATOR_SPECS) {
    if (spec.activation.kind === "always") continue;
    switch (spec.activation.kind) {
      case "boolean":
        if (params[spec.activation.path]) n++;
        break;
      case "nullable":
        if (params[spec.activation.path]) n++;
        break;
      case "arrayLength": {
        const arr = params[spec.activation.path];
        if (Array.isArray(arr) && arr.length > 0) n++;
        break;
      }
    }
  }
  const sigs = (params["signalStrategies"] ?? {}) as Record<string, unknown>;
  for (const v of Object.values(sigs)) if (v) n++;
  return n;
}
