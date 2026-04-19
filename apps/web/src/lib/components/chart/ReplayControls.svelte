<script lang="ts">
  import { onDestroy } from "svelte";
  import { replay, SPEED_PRESETS, type ReplaySpeed } from "$lib/stores/replay.svelte";

  let { totalBars }: { totalBars: number } = $props();

  // Tick loop using setInterval whose period follows speed
  let timerId: ReturnType<typeof setInterval> | null = null;

  function startTimer() {
    stopTimer();
    const period = Math.max(60, Math.round(600 / replay.speed)); // 1x = 600ms / bar
    timerId = setInterval(() => replay.tick(totalBars), period);
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  $effect(() => {
    if (replay.playing && replay.enabled) {
      // Re-start on speed changes
      void replay.speed;
      startTimer();
    } else {
      stopTimer();
    }
  });

  onDestroy(stopTimer);

  function fmt(n: number | undefined): string {
    if (!n) return "–";
    const ts = n > 1_000_000_000_000 ? n : n * 1000;
    try {
      return new Date(ts).toLocaleString(undefined, {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "–";
    }
  }
</script>

<div class="replay" role="region" aria-label="바 리플레이 제어">
  <div class="replay__left">
    <button
      type="button"
      class="ctrl"
      onclick={() => replay.step(-1, totalBars)}
      aria-label="한 봉 뒤로"
      title="이전 봉 (←)"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <polyline points="15 18 9 12 15 6" />
      </svg>
    </button>

    <button
      type="button"
      class="ctrl ctrl--play"
      class:is-playing={replay.playing}
      onclick={() => replay.togglePlaying()}
      aria-label={replay.playing ? "일시정지" : "재생"}
      title={replay.playing ? "일시정지 (Space)" : "재생 (Space)"}
    >
      {#if replay.playing}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      {:else}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <polygon points="7 4 20 12 7 20 7 4" />
        </svg>
      {/if}
    </button>

    <button
      type="button"
      class="ctrl"
      onclick={() => replay.step(1, totalBars)}
      aria-label="한 봉 앞으로"
      title="다음 봉 (→)"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <polyline points="9 6 15 12 9 18" />
      </svg>
    </button>

    <div class="speeds" role="group" aria-label="속도">
      {#each SPEED_PRESETS as sp}
        <button
          type="button"
          class="speed-btn"
          class:is-active={replay.speed === sp}
          onclick={() => replay.setSpeed(sp as ReplaySpeed)}
        >
          {sp}x
        </button>
      {/each}
    </div>
  </div>

  <div class="replay__middle">
    <input
      type="range"
      min="0"
      max={Math.max(0, totalBars - 1)}
      value={replay.currentIndex}
      oninput={(e) => replay.setIndex(Number((e.target as HTMLInputElement).value), totalBars)}
      class="progress"
      aria-label="리플레이 위치"
    />
  </div>

  <div class="replay__right">
    <span class="counter">{replay.currentIndex + 1} / {totalBars}</span>
    <button type="button" class="ctrl-text" onclick={() => replay.exit()} aria-label="리플레이 종료" title="종료 (R)">
      종료
    </button>
  </div>
</div>

<style>
  .replay {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 6px 10px;
    border-top: 1px solid var(--line-soft);
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    flex-shrink: 0;
  }

  .replay__left {
    display: flex;
    align-items: center;
    gap: 4px;
    flex-shrink: 0;
  }

  .replay__middle {
    flex: 1;
    min-width: 0;
    display: flex;
    align-items: center;
    padding: 0 6px;
  }

  .replay__right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .ctrl {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--input);
    color: var(--muted);
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }

  .ctrl:hover { color: var(--text); background: color-mix(in srgb, var(--text) 8%, transparent); }

  .ctrl--play {
    color: var(--accent);
    border-color: color-mix(in srgb, var(--accent) 35%, var(--line));
  }

  .ctrl--play.is-playing {
    background: var(--accent-soft);
  }

  .speeds {
    display: inline-flex;
    gap: 1px;
    margin-left: 4px;
    padding: 2px;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: var(--input);
  }

  .speed-btn {
    padding: 2px 8px;
    border: 1px solid transparent;
    border-radius: 5px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: var(--fs-xs);
    cursor: pointer;
    font-variant-numeric: tabular-nums;
  }

  .speed-btn:hover { color: var(--text); }

  .speed-btn.is-active {
    border-color: color-mix(in srgb, var(--accent) 45%, transparent);
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 700;
  }

  .progress {
    width: 100%;
    appearance: none;
    height: 3px;
    background: color-mix(in srgb, var(--muted) 25%, transparent);
    border-radius: 999px;
    cursor: pointer;
  }

  .progress::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid var(--surface);
  }

  .progress::-moz-range-thumb {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: var(--accent);
    border: 2px solid var(--surface);
  }

  .counter {
    font-size: var(--fs-xs);
    font-variant-numeric: tabular-nums;
    color: var(--muted);
  }

  .ctrl-text {
    padding: 4px 10px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: var(--fs-sm);
    cursor: pointer;
  }

  .ctrl-text:hover {
    color: var(--danger);
    border-color: color-mix(in srgb, var(--danger) 45%, var(--line));
  }
</style>
