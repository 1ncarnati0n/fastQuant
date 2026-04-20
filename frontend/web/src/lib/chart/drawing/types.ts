export type DrawingTool =
  | "none" | "horizontal" | "trend" | "fib"
  | "measure" | "rectangle" | "text"
  | "channel" | "pitchfork" | "gann" | "elliott" | "harmonic";

export interface DrawingPoint {
  time: number;
  price: number;
}

export interface HorizontalDrawing { id: string; type: "horizontal"; price: number; color: string }
export interface TrendDrawing { id: string; type: "trend"; start: DrawingPoint; end: DrawingPoint; color: string }
export interface FibDrawing { id: string; type: "fib"; start: DrawingPoint; end: DrawingPoint; color: string }
export interface MeasureDrawing { id: string; type: "measure"; start: DrawingPoint; end: DrawingPoint; color: string }
export interface RectangleDrawing { id: string; type: "rectangle"; start: DrawingPoint; end: DrawingPoint; color: string; fillColor: string }
export interface TextDrawing { id: string; type: "text"; point: DrawingPoint; text: string; color: string }
export interface ChannelDrawing { id: string; type: "channel"; start: DrawingPoint; end: DrawingPoint; offset: DrawingPoint; color: string; fillColor: string }
export interface PitchforkDrawing { id: string; type: "pitchfork"; a: DrawingPoint; b: DrawingPoint; c: DrawingPoint; color: string; fillColor: string }
export interface GannDrawing { id: string; type: "gann"; start: DrawingPoint; end: DrawingPoint; color: string }
export interface ElliottDrawing { id: string; type: "elliott"; points: [DrawingPoint, DrawingPoint, DrawingPoint, DrawingPoint, DrawingPoint]; color: string }
export interface HarmonicDrawing { id: string; type: "harmonic"; x: DrawingPoint; a: DrawingPoint; b: DrawingPoint; c: DrawingPoint; d: DrawingPoint; color: string; fillColor: string }

export type DrawingItem =
  | HorizontalDrawing | TrendDrawing | FibDrawing | MeasureDrawing
  | RectangleDrawing | TextDrawing | ChannelDrawing | PitchforkDrawing
  | GannDrawing | ElliottDrawing | HarmonicDrawing;

export function uid(): string {
  return `draw-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function isTwoPointTool(tool: DrawingTool): boolean {
  return tool === "trend" || tool === "fib" || tool === "measure" || tool === "rectangle" || tool === "gann";
}

export const TOOL_GUIDE: Partial<Record<DrawingTool, string>> = {
  horizontal: "클릭: 수평선 추가",
  text: "클릭: 텍스트 주석",
  trend: "시작점 → 끝점 클릭",
  fib: "시작점 → 끝점 클릭",
  measure: "시작점 → 끝점 클릭",
  rectangle: "첫 모서리 → 반대 모서리 클릭",
  gann: "기준점 → 방향점 클릭",
  channel: "기준선 시작 → 끝 → 채널 폭 클릭 (3점)",
  pitchfork: "A → B → C 클릭 (3점)",
  elliott: "파동점 5번 클릭",
  harmonic: "X → A → B → C → D 클릭 (5점)",
};
