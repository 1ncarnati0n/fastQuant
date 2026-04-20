const MIN_DOCK_WIDTH = 340;
const MAX_DOCK_WIDTH = 620;
const RAIL_WIDTH = 64;
const RESIZER_WIDTH = 14;
const MIN_CHART_WIDTH = 720;

export interface DockResizeParams {
  startWidth: number;
  deltaX: number;
  shellWidth: number;
}

export function calculateDockWidth({
  startWidth,
  deltaX,
  shellWidth,
}: DockResizeParams): number {
  const maxWidth = Math.max(
    MIN_DOCK_WIDTH,
    Math.min(MAX_DOCK_WIDTH, shellWidth - MIN_CHART_WIDTH - RAIL_WIDTH - RESIZER_WIDTH),
  );

  return Math.min(maxWidth, Math.max(MIN_DOCK_WIDTH, startWidth - deltaX));
}
