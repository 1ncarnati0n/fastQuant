export const SPEED_PRESETS = [0.5, 1, 2, 5] as const;

export type ReplaySpeed = (typeof SPEED_PRESETS)[number];
