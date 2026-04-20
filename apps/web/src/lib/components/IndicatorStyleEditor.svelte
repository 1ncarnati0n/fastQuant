<script lang="ts">
  import type { AnalysisParams } from "$lib/api/types";
  import type { IndicatorSpec } from "$lib/chart/indicatorSpecs";
  import {
    COLOR_PALETTE,
    LINE_STYLE_OPTIONS,
    LINE_WIDTH_OPTIONS,
    STYLE_TEMPLATES,
    indicatorStyles,
    toColor,
    type SlotDefinition,
    type SlotStyle,
  } from "$lib/stores/indicatorStyles.svelte";
  import type { LineStyle, LineWidth } from "lightweight-charts";

  let {
    spec,
    params,
  }: {
    spec: IndicatorSpec;
    params: AnalysisParams;
  } = $props();

  const template = $derived(STYLE_TEMPLATES[spec.key] ?? null);

  const dynamicPeriods = $derived.by(() => {
    if (!template?.isDynamic) return [];
    const path = spec.fields[0]?.path;
    if (!path) return [];
    const value = (params as unknown as Record<string, unknown>)[path];
    return Array.isArray(value) ? (value as number[]) : [];
  });

  const slots = $derived.by<Array<{ id: string; label: string; defaults: SlotStyle; kind?: SlotDefinition["kind"] }>>(() => {
    if (!template) return [];
    if (template.isDynamic && template.dynamic) {
      return dynamicPeriods.map((period, idx) => template.dynamic!(idx, { period }));
    }
    return template.slots;
  });

  // Tracks whichever slot the swatch grid is currently editing, if any.
  let openSwatchFor = $state<string | null>(null);
  let hexInput = $state<Record<string, string>>({});

  function resolve(slotId: string): SlotStyle {
    const slot = slots.find((s) => s.id === slotId);
    const fallback = slot?.defaults ?? { color: "#64748b", width: 1 as LineWidth, style: 0 as LineStyle, opacity: 1 };
    const override = indicatorStyles.getOverride(spec.key, slotId);
    return {
      color:   override.color   ?? fallback.color,
      width:   (override.width   ?? fallback.width) as LineWidth,
      style:   (override.style   ?? fallback.style) as LineStyle,
      opacity: override.opacity ?? fallback.opacity,
    };
  }

  function setColor(slotId: string, color: string) {
    indicatorStyles.update(spec.key, slotId, { color });
    hexInput[slotId] = color;
  }

  function setWidth(slotId: string, width: LineWidth) {
    indicatorStyles.update(spec.key, slotId, { width });
  }

  function setStyle(slotId: string, style: LineStyle) {
    indicatorStyles.update(spec.key, slotId, { style });
  }

  function setOpacity(slotId: string, opacity: number) {
    indicatorStyles.update(spec.key, slotId, { opacity });
  }

  function normalizeHex(raw: string): string | null {
    const v = raw.trim();
    if (!v) return null;
    const withHash = v.startsWith("#") ? v : `#${v}`;
    if (!/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(withHash)) return null;
    return withHash.toLowerCase();
  }

  function commitHex(slotId: string) {
    const raw = hexInput[slotId];
    if (raw === undefined) return;
    const normalized = normalizeHex(raw);
    if (normalized) setColor(slotId, normalized);
    else hexInput[slotId] = resolve(slotId).color;
  }

  function resetAll() {
    indicatorStyles.resetIndicator(spec.key);
  }

  function resetSlot(slotId: string) {
    indicatorStyles.resetSlot(spec.key, slotId);
  }

  function lineStylePreview(style: LineStyle): string {
    switch (style) {
      case 1: return "1 2";
      case 2: return "6 3";
      case 3: return "8 3 1 3";
      case 4: return "1 6";
      default: return "";
    }
  }
</script>

<div class="style-editor">
  {#if slots.length === 0}
    <p class="style-empty">이 지표는 스타일 커스터마이즈가 아직 지원되지 않습니다.</p>
  {:else}
    <div class="style-editor-head">
      <span class="style-editor-hint">슬롯별 색상·선 두께·선 스타일·불투명도를 실시간으로 조정합니다.</span>
      {#if indicatorStyles.hasOverride(spec.key)}
        <button type="button" class="style-reset-all" onclick={resetAll}>모두 기본값</button>
      {/if}
    </div>

    <div class="slot-list">
      {#each slots as slot (slot.id)}
        {@const style = resolve(slot.id)}
        {@const isSwatchOpen = openSwatchFor === slot.id}
        <div class="slot-card" class:kind-marker={slot.kind === "marker"} class:kind-histogram={slot.kind === "histogram"}>
          <!-- Row 1: slot title + preview -->
          <div class="slot-head">
            <span class="slot-label">{slot.label}</span>
            <span class="slot-preview" aria-hidden="true">
              {#if slot.kind === "histogram"}
                <span class="preview-bar" style:background={toColor(style)} style:opacity={style.opacity}></span>
              {:else if slot.kind === "marker"}
                <span class="preview-dot" style:background={toColor(style)}></span>
              {:else}
                <svg width="80" height="16" viewBox="0 0 80 16">
                  <line x1="2" y1="8" x2="78" y2="8"
                        stroke={toColor(style)}
                        stroke-width={style.width}
                        stroke-dasharray={lineStylePreview(style.style)}
                        stroke-linecap="round"
                  />
                </svg>
              {/if}
            </span>
          </div>

          <!-- Row 2: color + width + style -->
          <div class="slot-controls">
            <!-- Color -->
            <div class="ctrl ctrl-color">
              <span class="ctrl-label">색상</span>
              <button
                type="button"
                class="color-chip"
                aria-expanded={isSwatchOpen}
                aria-label="색상 선택"
                onclick={() => {
                  openSwatchFor = isSwatchOpen ? null : slot.id;
                  hexInput[slot.id] = style.color;
                }}
              >
                <span class="chip-dot" style:background={style.color}></span>
                <span class="chip-hex">{style.color.toUpperCase()}</span>
              </button>
              {#if isSwatchOpen}
                <div class="swatch-popover" role="dialog" aria-label="색상 팔레트">
                  <div class="swatch-grid">
                    {#each COLOR_PALETTE as color}
                      <button
                        type="button"
                        class="swatch"
                        class:is-active={color.toLowerCase() === style.color.toLowerCase()}
                        style:background={color}
                        aria-label="색상 {color}"
                        onclick={() => { setColor(slot.id, color); openSwatchFor = null; }}
                      ></button>
                    {/each}
                  </div>
                  <div class="hex-row">
                    <label class="hex-label" for="hex-{spec.key}-{slot.id}">HEX</label>
                    <input
                      id="hex-{spec.key}-{slot.id}"
                      class="hex-input"
                      type="text"
                      maxlength="7"
                      placeholder="#RRGGBB"
                      value={hexInput[slot.id] ?? style.color}
                      oninput={(e) => { hexInput[slot.id] = (e.target as HTMLInputElement).value; }}
                      onblur={() => commitHex(slot.id)}
                      onkeydown={(e) => { if (e.key === "Enter") commitHex(slot.id); }}
                    />
                    <input
                      class="native-color"
                      type="color"
                      value={style.color}
                      oninput={(e) => setColor(slot.id, (e.target as HTMLInputElement).value)}
                      aria-label="세밀한 색상 선택"
                    />
                  </div>
                </div>
              {/if}
            </div>

            <!-- Width -->
            <div class="ctrl">
              <span class="ctrl-label">선 두께</span>
              <div class="width-group" role="radiogroup" aria-label="선 두께">
                {#each LINE_WIDTH_OPTIONS as w}
                  <button
                    type="button"
                    class="width-btn"
                    class:is-active={style.width === w}
                    role="radio"
                    aria-checked={style.width === w}
                    onclick={() => setWidth(slot.id, w)}
                    title="{w}px"
                  >
                    <span class="width-bar" style:height="{w}px" style:background={toColor(style)}></span>
                    <span class="width-num">{w}</span>
                  </button>
                {/each}
              </div>
            </div>

            <!-- Line style -->
            {#if slot.kind !== "histogram" && slot.kind !== "marker"}
              <div class="ctrl">
                <span class="ctrl-label">선 스타일</span>
                <div class="style-group" role="radiogroup" aria-label="선 스타일">
                  {#each LINE_STYLE_OPTIONS as opt}
                    <button
                      type="button"
                      class="style-btn"
                      class:is-active={style.style === opt.value}
                      role="radio"
                      aria-checked={style.style === opt.value}
                      onclick={() => setStyle(slot.id, opt.value)}
                      title={opt.label}
                    >
                      <svg width="30" height="10" viewBox="0 0 30 10" aria-hidden="true">
                        <line x1="2" y1="5" x2="28" y2="5"
                              stroke="currentColor"
                              stroke-width="2"
                              stroke-dasharray={lineStylePreview(opt.value)}
                              stroke-linecap="round"/>
                      </svg>
                    </button>
                  {/each}
                </div>
              </div>
            {/if}

            <!-- Opacity -->
            <div class="ctrl ctrl-opacity">
              <span class="ctrl-label">불투명도 <em>{Math.round(style.opacity * 100)}%</em></span>
              <input
                class="opacity-range"
                type="range"
                min="0.15"
                max="1"
                step="0.05"
                value={style.opacity}
                oninput={(e) => setOpacity(slot.id, Number((e.target as HTMLInputElement).value))}
                style:--thumb={toColor(style)}
              />
            </div>

            <button
              type="button"
              class="slot-reset"
              onclick={() => resetSlot(slot.id)}
              title="이 슬롯만 기본값"
              aria-label="이 슬롯만 기본값"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
                <path d="M3 3v5h5"/>
              </svg>
            </button>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .style-editor {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .style-editor-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 0 4px 2px;
  }

  .style-editor-hint {
    font-size: var(--fs-xs);
    color: var(--muted-fore);
  }

  .style-reset-all {
    padding: 5px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--card);
    color: var(--muted-fore);
    font-size: var(--fs-xs);
    font-weight: 700;
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }

  .style-reset-all:hover {
    color: var(--foreground);
    border-color: var(--primary);
  }

  .style-empty {
    margin: 0;
    padding: 12px 14px;
    border: 1px dashed var(--border);
    border-radius: var(--radius-md);
    color: var(--muted-fore);
    font-size: var(--fs-sm);
    background: var(--muted-bg);
  }

  .slot-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .slot-card {
    display: grid;
    gap: 10px;
    padding: 12px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: color-mix(in srgb, var(--card) 70%, var(--muted-bg));
  }

  .slot-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .slot-label {
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--foreground);
  }

  .slot-preview {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 80px;
    height: 16px;
  }

  .preview-bar {
    display: block;
    width: 40px;
    height: 14px;
    border-radius: 2px;
  }

  .preview-dot {
    display: block;
    width: 12px;
    height: 12px;
    border-radius: 999px;
    box-shadow: 0 0 0 3px color-mix(in srgb, currentColor 8%, transparent);
  }

  .slot-controls {
    display: grid;
    grid-template-columns: auto auto 1fr auto auto;
    gap: 12px;
    align-items: center;
  }

  @media (max-width: 880px) {
    .slot-controls {
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }
    .slot-controls .ctrl-opacity { grid-column: 1 / -1; }
    .slot-controls .slot-reset   { grid-column: 2 / 3; justify-self: end; }
  }

  .ctrl {
    display: flex;
    flex-direction: column;
    gap: 5px;
    position: relative;
  }

  .ctrl-label {
    font-size: var(--fs-2xs);
    font-weight: 700;
    color: var(--muted-fore);
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .ctrl-label em {
    font-style: normal;
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
    text-transform: none;
    letter-spacing: 0;
    margin-left: 4px;
  }

  /* ── Color ─── */
  .color-chip {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 10px 5px 6px;
    border: 1px solid var(--border);
    border-radius: 999px;
    background: var(--card);
    color: var(--foreground);
    font-size: var(--fs-xs);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    transition: border-color var(--dur-fast) var(--ease);
  }

  .color-chip:hover { border-color: var(--primary); }

  .chip-dot {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    border: 1px solid color-mix(in srgb, #000 20%, transparent);
  }

  .swatch-popover {
    position: absolute;
    top: calc(100% + 6px);
    left: 0;
    z-index: 10;
    display: grid;
    gap: 8px;
    padding: 10px;
    border: 1px solid var(--border);
    border-radius: 12px;
    background: var(--card);
    box-shadow: var(--shadow-elevated);
  }

  .swatch-grid {
    display: grid;
    grid-template-columns: repeat(10, 22px);
    gap: 6px;
  }

  .swatch {
    width: 22px;
    height: 22px;
    border-radius: 6px;
    border: 1px solid color-mix(in srgb, #000 20%, transparent);
    cursor: pointer;
    transition: transform var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
  }

  .swatch:hover { transform: scale(1.1); }

  .swatch.is-active {
    box-shadow: 0 0 0 2px var(--card), 0 0 0 4px var(--primary);
  }

  .hex-row {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .hex-label {
    font-size: var(--fs-2xs);
    color: var(--muted-fore);
    font-weight: 700;
  }

  .hex-input {
    width: 96px;
    padding: 5px 8px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: var(--input);
    color: var(--foreground);
    font-size: var(--fs-xs);
    font-family: inherit;
    font-variant-numeric: tabular-nums;
    outline: none;
  }

  .hex-input:focus { border-color: var(--primary); }

  .native-color {
    width: 28px;
    height: 28px;
    padding: 0;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: transparent;
    cursor: pointer;
  }

  .native-color::-webkit-color-swatch-wrapper { padding: 0; border-radius: 4px; }
  .native-color::-webkit-color-swatch          { border: 0; border-radius: 4px; }

  /* ── Width ─── */
  .width-group {
    display: inline-flex;
    gap: 4px;
    padding: 3px;
    border-radius: 8px;
    background: var(--muted-bg);
  }

  .width-btn {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 3px;
    width: 32px;
    height: 32px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--muted-fore);
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
  }

  .width-btn:hover { color: var(--foreground); }

  .width-btn.is-active {
    background: var(--card);
    color: var(--foreground);
    box-shadow: var(--shadow-sm);
  }

  .width-bar {
    display: block;
    width: 20px;
    border-radius: 1px;
  }

  .width-num {
    font-size: var(--fs-2xs);
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }

  /* ── Line style ─── */
  .style-group {
    display: inline-flex;
    gap: 2px;
    padding: 3px;
    border-radius: 8px;
    background: var(--muted-bg);
  }

  .style-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 38px;
    height: 28px;
    border: 0;
    border-radius: 6px;
    background: transparent;
    color: var(--muted-fore);
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
  }

  .style-btn:hover { color: var(--foreground); }

  .style-btn.is-active {
    background: var(--card);
    color: var(--foreground);
    box-shadow: var(--shadow-sm);
  }

  /* ── Opacity ─── */
  .opacity-range {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 18px;
    background: transparent;
    cursor: pointer;
  }

  .opacity-range::-webkit-slider-runnable-track {
    height: 4px;
    background: linear-gradient(90deg, transparent, var(--thumb, var(--primary)));
    border-radius: 2px;
  }

  .opacity-range::-moz-range-track {
    height: 4px;
    background: linear-gradient(90deg, transparent, var(--thumb, var(--primary)));
    border-radius: 2px;
  }

  .opacity-range::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 14px;
    height: 14px;
    margin-top: -5px;
    border-radius: 999px;
    background: var(--thumb, var(--primary));
    border: 2px solid var(--card);
    box-shadow: 0 0 0 1px var(--border);
    cursor: grab;
  }

  .opacity-range::-moz-range-thumb {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: var(--thumb, var(--primary));
    border: 2px solid var(--card);
    box-shadow: 0 0 0 1px var(--border);
    cursor: grab;
  }

  /* ── Slot reset ─── */
  .slot-reset {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--muted-fore);
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }

  .slot-reset:hover {
    color: var(--foreground);
    border-color: var(--border);
  }
</style>
