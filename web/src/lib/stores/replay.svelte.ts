import { browser } from "$app/environment";
import { SPEED_PRESETS, type ReplaySpeed } from "$lib/features/replay/controlConfig";

const STORAGE_KEY = "fastquant-replay-v1";

const DEFAULT_LOOKBACK = 120;

interface Saved {
  speed: ReplaySpeed;
  lookback: number;
}

function loadSaved(): Saved {
  const fallback: Saved = { speed: 1, lookback: DEFAULT_LOOKBACK };
  if (!browser) return fallback;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Saved>;
    const sp = (SPEED_PRESETS as readonly number[]).includes(parsed.speed as number)
      ? (parsed.speed as ReplaySpeed)
      : 1;
    const lb = typeof parsed.lookback === "number" && parsed.lookback > 10 ? parsed.lookback : DEFAULT_LOOKBACK;
    return { speed: sp, lookback: lb };
  } catch {
    return fallback;
  }
}

function clampIndex(index: number, totalBars: number): number {
  if (totalBars <= 0) return 0;
  return Math.min(totalBars - 1, Math.max(0, Math.floor(index)));
}

function createReplayStore() {
  const saved = loadSaved();
  let enabled = $state(false);
  let playing = $state(false);
  let speed = $state<ReplaySpeed>(saved.speed);
  let currentIndex = $state(0);
  let lookback = $state(saved.lookback);

  $effect.root(() => {
    $effect(() => {
      if (!browser) return;
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ speed, lookback }));
    });
  });

  return {
    get enabled() {
      return enabled;
    },
    get playing() {
      return playing;
    },
    get speed() {
      return speed;
    },
    get currentIndex() {
      return currentIndex;
    },
    get lookback() {
      return lookback;
    },

    enter(totalBars: number) {
      const total = Math.max(1, totalBars);
      enabled = true;
      playing = false;
      currentIndex = clampIndex(total - lookback, total);
    },

    exit() {
      enabled = false;
      playing = false;
      currentIndex = 0;
    },

    toggleEnabled(totalBars: number) {
      if (enabled) this.exit();
      else this.enter(totalBars);
    },

    togglePlaying() {
      if (!enabled) return;
      playing = !playing;
    },

    setSpeed(next: ReplaySpeed) {
      speed = next;
    },

    setLookback(next: number) {
      if (!Number.isFinite(next)) return;
      lookback = Math.max(20, Math.min(2000, Math.floor(next)));
    },

    setIndex(index: number, totalBars: number) {
      currentIndex = clampIndex(index, totalBars);
    },

    step(delta: number, totalBars: number) {
      if (!enabled) return;
      currentIndex = clampIndex(currentIndex + delta, totalBars);
    },

    tick(totalBars: number) {
      if (!enabled || !playing) return;
      const maxIdx = clampIndex(totalBars - 1, totalBars);
      if (currentIndex >= maxIdx) {
        playing = false;
        return;
      }
      currentIndex = currentIndex + 1;
    },
  };
}

export const replay = createReplayStore();
