<script lang="ts">
  import Dialog from "$lib/ui/Dialog.svelte";
  import Tabs from "$lib/ui/Tabs.svelte";
  import IndicatorPanel from "$lib/components/IndicatorPanel.svelte";
  import { SPEED_PRESETS, type ReplaySpeed } from "$lib/features/replay/controlConfig";
  import { SHORTCUT_HELP_GROUPS } from "$lib/utils/shortcuts";
  import type { AnalysisParams } from "$lib/api/types";
  import { SETTINGS_TAB_ITEMS } from "$lib/features/settings/panelConfig";
  import { CHART_TYPE_ORDER, PRICE_SCALE_MODES } from "$lib/features/chart/controlConfig";
  import type {
    DashboardSettingsActions,
    DashboardSettingsState,
  } from "$lib/features/dashboard/useDashboardPage.svelte";

  let {
    open = $bindable(false),
    initialTab = "indicators",
    params,
    settingsState,
    settingsActions,
    onParamsChange,
  }: {
    open?: boolean;
    initialTab?: string;
    params: AnalysisParams;
    settingsState: DashboardSettingsState;
    settingsActions: DashboardSettingsActions;
    onParamsChange: (next: AnalysisParams) => void;
  } = $props();

  let tab = $state("indicators");
  let indicatorPanelHeight = $state(440);
  let resizingIndicators = $state(false);

  $effect(() => {
    if (open) tab = initialTab;
  });

  // Compare symbol input
  let compareInput = $state("");
  function addCompareFromInput() {
    const s = compareInput.trim();
    if (!s) return;
    if (settingsActions.addCompareSymbol(s)) {
      compareInput = "";
    }
  }

  function maxIndicatorPanelHeight(): number {
    if (typeof window === "undefined") return 760;
    return Math.max(340, Math.min(860, window.innerHeight - 260));
  }

  function clampIndicatorPanelHeight(value: number): number {
    return Math.max(280, Math.min(maxIndicatorPanelHeight(), Math.round(value)));
  }

  function adjustIndicatorPanelHeight(delta: number) {
    indicatorPanelHeight = clampIndicatorPanelHeight(indicatorPanelHeight + delta);
  }

  function startIndicatorResize(event: PointerEvent) {
    if (event.button !== 0) return;
    event.preventDefault();

    const startY = event.clientY;
    const startHeight = indicatorPanelHeight;
    resizingIndicators = true;

    const onMove = (moveEvent: PointerEvent) => {
      indicatorPanelHeight = clampIndicatorPanelHeight(startHeight + moveEvent.clientY - startY);
    };
    const endResize = () => {
      resizingIndicators = false;
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", endResize, true);
      document.removeEventListener("pointercancel", endResize, true);
      window.removeEventListener("blur", endResize);
    };

    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", endResize, true);
    document.addEventListener("pointercancel", endResize, true);
    window.addEventListener("blur", endResize);
  }

  function onIndicatorResizeKeydown(event: KeyboardEvent) {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      adjustIndicatorPanelHeight(-32);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      adjustIndicatorPanelHeight(32);
    } else if (event.key === "Home") {
      event.preventDefault();
      indicatorPanelHeight = 280;
    } else if (event.key === "End") {
      event.preventDefault();
      indicatorPanelHeight = clampIndicatorPanelHeight(maxIndicatorPanelHeight());
    }
  }
</script>

<Dialog bind:open title="설정" size="xl" padding="none">
  <div class="settings">
    <Tabs items={SETTINGS_TAB_ITEMS} bind:value={tab}>
      {#snippet panel({ active })}
        <div class="panel">
          {#if active === "indicators"}
            <div class="panel__head">
              <h3 class="panel__title">분석 오버레이 / 시그널</h3>
              <p class="panel__desc">오른쪽 도크와 동일한 토글 세트입니다.</p>
            </div>
            <div
              class="indicator-frame"
              class:is-resizing={resizingIndicators}
              style:--indicator-panel-height={`${indicatorPanelHeight}px`}
            >
              <div class="panel__body panel__body--indicators">
                <IndicatorPanel {params} onParamsChange={onParamsChange} />
              </div>
              <button
                type="button"
                class="indicator-resize-handle"
                aria-label="지표 패널 높이 조절"
                onpointerdown={startIndicatorResize}
                onkeydown={onIndicatorResizeKeydown}
              >
                <span aria-hidden="true"></span>
              </button>
            </div>

          {:else if active === "layout"}
            <div class="panel__head">
              <h3 class="panel__title">레이아웃</h3>
              <p class="panel__desc">차트 · 서브 페인 · 도크의 기본 배치.</p>
            </div>
            <div class="panel__body panel__body--padded">
              <section class="row">
                <div class="row__label">
                  <strong>우측 도크 너비</strong>
                  <span class="row__hint">드래그로 조절하거나 기본값으로 리셋</span>
                </div>
                <div class="row__control">
                  <button
                    type="button"
                    class="btn"
                    onclick={settingsActions.resetDockWidth}
                  >
                    기본값으로 리셋
                  </button>
                </div>
              </section>
              <section class="row">
                <div class="row__label">
                  <strong>서브 차트 패널</strong>
                  <span class="row__hint">분석 결과에 따라 자동으로 노출되며, 개별 패널의 × 버튼으로 숨길 수 있습니다.</span>
                </div>
              </section>
              <section class="row muted">
                <div class="row__label">
                  <strong>멀티 차트 그리드</strong>
                  <span class="row__hint">Phase 6 이후 제공 예정</span>
                </div>
              </section>
            </div>

          {:else if active === "appearance"}
            <div class="panel__head">
              <h3 class="panel__title">화면</h3>
              <p class="panel__desc">차트 타입과 축 표시.</p>
            </div>
            <div class="panel__body panel__body--padded">
              <section class="row">
                <div class="row__label">
                  <strong>차트 타입</strong>
                  <span class="row__hint">현재: {settingsState.chartTypeLabels[settingsState.chartType]}</span>
                </div>
                <div class="row__control">
                  <div class="segmented">
                    {#each CHART_TYPE_ORDER as key}
                      <button
                        type="button"
                        class="seg-btn"
                        class:is-active={settingsState.chartType === key}
                        onclick={() => settingsActions.setChartType(key)}
                      >
                        {settingsState.chartTypeLabels[key]}
                      </button>
                    {/each}
                  </div>
                </div>
              </section>

              <section class="row">
                <div class="row__label">
                  <strong>가격 스케일</strong>
                  <span class="row__hint">현재: {settingsState.priceScaleMode === "log" ? "로그" : "기본"}</span>
                </div>
                <div class="row__control">
                  <div class="segmented">
                    {#each PRICE_SCALE_MODES as mode}
                      <button
                        type="button"
                        class="seg-btn"
                        class:is-active={settingsState.priceScaleMode === mode.key}
                        onclick={() => settingsActions.setPriceScaleMode(mode.key)}
                      >
                        {mode.label}
                      </button>
                    {/each}
                  </div>
                </div>
              </section>

              <section class="row">
                <div class="row__label">
                  <strong>시계축 표시</strong>
                  <span class="row__hint">차트 하단의 날짜/시간 눈금</span>
                </div>
                <div class="row__control">
                  <button type="button" class="btn" onclick={settingsActions.toggleTimeAxis}>
                    {settingsState.timeAxisVisible ? "숨기기" : "표시"}
                  </button>
                </div>
              </section>

              <section class="row compare-row">
                <div class="row__label">
                  <strong>비교 심볼</strong>
                  <span class="row__hint">
                    최대 {settingsState.maxCompare}개 · 동일 인터벌/마켓으로 정규화된 라인이 차트에 오버레이
                  </span>
                </div>
                <div class="row__control compare-controls">
                  <div class="compare-chips">
                    {#each settingsState.compareSymbols as sym, i (sym)}
                      <span
                        class="compare-chip"
                        style:border-color="color-mix(in srgb, {settingsState.compareColors[i] ?? '#9ca3af'} 55%, var(--line))"
                        style:color={settingsState.compareColors[i] ?? "var(--text)"}
                      >
                        <span class="compare-chip__dot" style:background={settingsState.compareColors[i] ?? "#9ca3af"}></span>
                        {sym}
                        <button
                          type="button"
                          class="compare-chip__x"
                          onclick={() => settingsActions.removeCompareSymbol(sym)}
                          aria-label="{sym} 제거"
                          title="제거"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </span>
                    {/each}
                  </div>
                  <form
                    class="compare-form"
                    onsubmit={(e) => { e.preventDefault(); addCompareFromInput(); }}
                  >
                    <input
                      bind:value={compareInput}
                      type="text"
                      class="compare-input"
                      placeholder="심볼 추가 (예: SPY)"
                      maxlength="24"
                      disabled={settingsState.compareSymbols.length >= settingsState.maxCompare}
                    />
                    <button
                      type="submit"
                      class="btn"
                      disabled={settingsState.compareSymbols.length >= settingsState.maxCompare || compareInput.trim().length === 0}
                    >
                      추가
                    </button>
                  </form>
                </div>
              </section>

              <section class="row">
                <div class="row__label">
                  <strong>전체화면</strong>
                  <span class="row__hint">F 키로도 전환</span>
                </div>
                <div class="row__control">
                  <button type="button" class="btn" onclick={settingsActions.toggleFullscreen}>
                    전체화면 전환
                  </button>
                </div>
              </section>
            </div>

          {:else if active === "drawing"}
            <div class="panel__head">
              <h3 class="panel__title">드로잉</h3>
              <p class="panel__desc">도구 상태와 스택 관리.</p>
            </div>
            <div class="panel__body panel__body--padded">
              <section class="row">
                <div class="row__label">
                  <strong>활성 도구</strong>
                  <span class="row__hint">현재: {settingsState.drawingActiveTool === "none" ? "선택" : settingsState.drawingActiveTool}</span>
                </div>
                <div class="row__control">
                  <button type="button" class="btn" onclick={() => settingsActions.setDrawingTool("none")}>
                    도구 해제
                  </button>
                </div>
              </section>

              <section class="row">
                <div class="row__label">
                  <strong>Undo / Redo</strong>
                  <span class="row__hint">최대 20단계 · 현재 심볼/인터벌에만 적용</span>
                </div>
                <div class="row__control" style="display:flex; gap:6px;">
                  <button
                    type="button"
                    class="btn"
                    disabled={!settingsState.drawingCanUndo}
                    onclick={settingsActions.undoDrawing}
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    class="btn"
                    disabled={!settingsState.drawingCanRedo}
                    onclick={settingsActions.redoDrawing}
                  >
                    Redo
                  </button>
                </div>
              </section>

              <section class="row">
                <div class="row__label">
                  <strong>도형 수</strong>
                  <span class="row__hint">{settingsState.drawingCount}개 저장됨</span>
                </div>
                <div class="row__control">
                  <button
                    type="button"
                    class="btn"
                    disabled={settingsState.drawingCount === 0}
                    onclick={settingsActions.clearDrawings}
                  >
                    모두 삭제
                  </button>
                </div>
              </section>

              <section class="row muted">
                <div class="row__label">
                  <strong>기본 색상</strong>
                  <span class="row__hint">도구별 기본 색상 커스터마이즈는 Phase 5 마무리 시 제공</span>
                </div>
              </section>
            </div>

          {:else if active === "replay"}
            <div class="panel__head">
              <h3 class="panel__title">리플레이</h3>
              <p class="panel__desc">바 리플레이의 기본 속도와 시작 위치.</p>
            </div>
            <div class="panel__body panel__body--padded">
              <section class="row">
                <div class="row__label">
                  <strong>기본 속도</strong>
                  <span class="row__hint">새로 시작하는 리플레이에 적용</span>
                </div>
                <div class="row__control">
                  <div class="segmented">
                    {#each SPEED_PRESETS as sp}
                      <button
                        type="button"
                        class="seg-btn"
                        class:is-active={settingsState.replaySpeed === sp}
                        onclick={() => settingsActions.setReplaySpeed(sp as ReplaySpeed)}
                      >
                        {sp}x
                      </button>
                    {/each}
                  </div>
                </div>
              </section>

              <section class="row">
                <div class="row__label">
                  <strong>Lookback</strong>
                  <span class="row__hint">리플레이 시작 위치 (최신 봉으로부터 N봉 전)</span>
                </div>
                <div class="row__control">
                  <input
                    type="number"
                    min="20"
                    max="2000"
                    step="10"
                    value={settingsState.replayLookback}
                    oninput={(e) => settingsActions.setReplayLookback(Number((e.target as HTMLInputElement).value))}
                    class="num"
                  />
                </div>
              </section>

              <section class="row">
                <div class="row__label">
                  <strong>단축키</strong>
                  <span class="row__hint"><kbd>R</kbd> 시작/종료 · <kbd>Space</kbd> 재생/정지 · <kbd>←</kbd>/<kbd>→</kbd> 이전/다음 봉</span>
                </div>
              </section>

              <section class="row">
                <div class="row__label">
                  <strong>현재 상태</strong>
                  <span class="row__hint">{settingsState.replayEnabled ? "리플레이 중" : "비활성"} · 인덱스 {settingsState.replayCurrentIndex}</span>
                </div>
              </section>
            </div>

          {:else if active === "shortcuts"}
            <div class="panel__head">
              <h3 class="panel__title">단축키</h3>
              <p class="panel__desc">언제든 <kbd class="inline-kbd">?</kbd>로 이 가이드를 모달로 열 수 있습니다.</p>
            </div>
            <div class="panel__body panel__body--padded shortcuts">
              {#each SHORTCUT_HELP_GROUPS as group (group.title)}
                <section class="shortcut-group">
                  <h4 class="shortcut-group__title">{group.title}</h4>
                  <ul class="shortcut-rows" role="list">
                    {#each group.items as item (item.id)}
                      <li class="shortcut-row">
                        <span class="shortcut-desc">{item.desc}</span>
                        <span class="shortcut-keys">
                          {#each item.keys as k, ki}
                            {#if ki > 0}<span class="plus">+</span>{/if}
                            <kbd class="kbd">{k}</kbd>
                          {/each}
                        </span>
                      </li>
                    {/each}
                  </ul>
                </section>
              {/each}
            </div>

          {/if}

        </div>
      {/snippet}
    </Tabs>
  </div>
</Dialog>

<style>
  .settings {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
  }

  .panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    gap: 14px;
    padding: 14px 18px 18px;
  }

  .panel__head {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .panel__title {
    margin: 0;
    font-size: var(--fs-md);
    font-weight: 700;
    color: var(--text);
  }

  .panel__desc {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--muted);
  }

  .panel__body {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }

  .panel__body--indicators {
    min-height: 0;
    height: var(--indicator-panel-height);
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--input);
    overflow: hidden;
  }

  .indicator-frame {
    flex: 0 0 auto;
    min-height: 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
  }

  .indicator-resize-handle {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 16px;
    margin: 4px 12px 0;
    padding: 0;
    border: 0;
    border-radius: 999px;
    background: transparent;
    cursor: ns-resize;
    touch-action: none;
    outline: none;
    color: var(--muted);
  }

  .indicator-resize-handle span {
    width: 76px;
    height: 4px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--muted) 32%, transparent);
    transition: background var(--dur-fast) var(--ease), width var(--dur-fast) var(--ease);
  }

  .indicator-resize-handle:hover span,
  .indicator-resize-handle:focus-visible span,
  .indicator-frame.is-resizing .indicator-resize-handle span {
    width: 112px;
    background: color-mix(in srgb, var(--accent) 58%, transparent);
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 10px 0;
    border-bottom: 1px solid var(--line-soft);
  }

  .row:last-of-type { border-bottom: none; }

  .row.muted { opacity: 0.65; }

  .row__label {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .row__label strong {
    font-size: var(--fs-base);
    font-weight: 600;
    color: var(--text);
  }

  .row__hint {
    font-size: var(--fs-xs);
    color: var(--muted);
  }

  .row__control { flex-shrink: 0; }

  .btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: var(--input);
    color: var(--text);
    font: inherit;
    font-size: var(--fs-sm);
    font-weight: 500;
    cursor: pointer;
    transition: border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
  }

  .btn:hover {
    border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
    background: var(--accent-soft);
    color: var(--accent);
  }

  .segmented {
    display: inline-flex;
    gap: 1px;
    padding: 3px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--input);
  }

  .seg-btn {
    padding: 5px 10px;
    border: 1px solid transparent;
    border-radius: 5px;
    background: transparent;
    color: var(--muted);
    font: inherit;
    font-size: var(--fs-sm);
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }

  .seg-btn:hover { color: var(--text); }

  .seg-btn.is-active {
    border-color: color-mix(in srgb, var(--accent) 45%, transparent);
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }

  /* ── Compare symbols ────────────────────── */
  .compare-row { align-items: flex-start; }

  .compare-controls {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: flex-end;
  }

  .compare-chips {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: flex-end;
  }

  .compare-chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 4px 3px 8px;
    border: 1px solid var(--line);
    border-radius: 999px;
    background: var(--input);
    font-size: var(--fs-sm);
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }

  .compare-chip__dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
  }

  .compare-chip__x {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: inherit;
    cursor: pointer;
    opacity: 0.7;
  }

  .compare-chip__x:hover { opacity: 1; }

  .compare-form {
    display: flex;
    gap: 4px;
  }

  .compare-input {
    width: 160px;
    padding: 6px 9px;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: var(--fs-sm);
    text-transform: uppercase;
    outline: none;
  }

  .compare-input:focus {
    border-color: color-mix(in srgb, var(--accent) 50%, var(--line));
  }

  .compare-input:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .num {
    width: 92px;
    padding: 6px 9px;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: var(--fs-sm);
    font-variant-numeric: tabular-nums;
    outline: none;
    text-align: right;
  }

  .num:focus { border-color: color-mix(in srgb, var(--accent) 50%, var(--line)); }

  .row__hint kbd,
  .inline-kbd {
    display: inline-flex;
    align-items: center;
    padding: 0 5px;
    height: 16px;
    margin: 0 2px;
    border: 1px solid var(--line);
    border-radius: 3px;
    background: var(--input);
    font-family: ui-monospace, monospace;
    font-size: var(--fs-2xs);
    color: var(--text);
  }

  /* ── Shortcuts tab ────────────────────────── */
  .shortcuts {
    gap: 18px;
  }

  .shortcut-group + .shortcut-group { margin-top: 6px; }

  .shortcut-group__title {
    margin: 0 0 6px;
    font-size: var(--fs-2xs);
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .shortcut-rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .shortcut-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 5px 0;
    border-bottom: 1px solid var(--line-soft);
  }

  .shortcut-row:last-child { border-bottom: none; }

  .shortcut-desc {
    font-size: var(--fs-sm);
    color: var(--text);
  }

  .shortcut-keys {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .kbd {
    display: inline-flex;
    align-items: center;
    min-width: 22px;
    height: 20px;
    padding: 0 6px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: var(--input);
    color: var(--text);
    font-family: ui-monospace, "SF Mono", monospace;
    font-size: var(--fs-xs);
    line-height: 1;
  }

  .plus { color: var(--muted); font-size: var(--fs-xs); }

</style>
