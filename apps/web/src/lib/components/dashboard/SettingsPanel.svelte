<script lang="ts">
  import Dialog from "$lib/ui/Dialog.svelte";
  import Tabs from "$lib/ui/Tabs.svelte";
  import IndicatorPanel from "$lib/components/IndicatorPanel.svelte";
  import { workspace } from "$lib/stores/workspace.svelte";
  import { chart, CHART_TYPE_LABELS, COMPARE_COLORS } from "$lib/stores/chart.svelte";
  import { drawing } from "$lib/stores/drawing.svelte";
  import { replay, SPEED_PRESETS, type ReplaySpeed } from "$lib/stores/replay.svelte";
  import { SHORTCUT_HELP_GROUPS } from "$lib/utils/shortcuts";
  import { snapshots, type WorkspaceSnapshot } from "$lib/stores/snapshots.svelte";
  import type { AnalysisParams } from "$lib/api/types";
  import { SETTINGS_TAB_ITEMS, formatSnapshotDate } from "$lib/features/settings/panelConfig";
  import { CHART_TYPE_ORDER, PRICE_SCALE_MODES } from "$lib/features/chart/controlConfig";

  let {
    open = $bindable(false),
    initialTab = "indicators",
    onParamsChange,
    onApplySnapshot,
  }: {
    open?: boolean;
    initialTab?: string;
    onParamsChange: (next: AnalysisParams) => void;
    onApplySnapshot: (snap: WorkspaceSnapshot) => void;
  } = $props();

  let tab = $state("indicators");

  $effect(() => {
    if (open) tab = initialTab;
  });

  // Snapshot form
  let snapshotName = $state("");

  // Compare symbol input
  let compareInput = $state("");
  function addCompareFromInput() {
    const s = compareInput.trim();
    if (!s) return;
    if (chart.addCompareSymbol(s)) {
      compareInput = "";
    }
  }
  function takeSnapshot() {
    snapshots.save({
      name: snapshotName,
      params: workspace.params,
      theme: workspace.theme,
      chartType: chart.chartType,
      dockTab: workspace.dockTab,
      watchlist: workspace.watchlist,
    });
    snapshotName = "";
  }

  function fmtDate(ts: number): string {
    return formatSnapshotDate(ts);
  }

  function applyAndClose(snap: WorkspaceSnapshot) {
    onApplySnapshot(snap);
    open = false;
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
            <div class="panel__body panel__body--indicators">
              <IndicatorPanel params={workspace.params} onParamsChange={onParamsChange} />
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
                    onclick={() => localStorage.removeItem("fastquant-dashboard-dock-width")}
                  >
                    기본값(360px)으로 리셋
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
              <p class="panel__desc">테마와 차트 타입.</p>
            </div>
            <div class="panel__body panel__body--padded">
              <section class="row">
                <div class="row__label">
                  <strong>테마</strong>
                  <span class="row__hint">현재: {workspace.theme === "dark" ? "다크" : "라이트"}</span>
                </div>
                <div class="row__control">
                  <button type="button" class="btn" onclick={() => workspace.toggleTheme()}>
                    {workspace.theme === "dark" ? "라이트 모드로 전환" : "다크 모드로 전환"}
                  </button>
                </div>
              </section>

              <section class="row">
                <div class="row__label">
                  <strong>차트 타입</strong>
                  <span class="row__hint">현재: {CHART_TYPE_LABELS[chart.chartType]}</span>
                </div>
                <div class="row__control">
                  <div class="segmented">
                    {#each CHART_TYPE_ORDER as key}
                      <button
                        type="button"
                        class="seg-btn"
                        class:is-active={chart.chartType === key}
                        onclick={() => chart.setChartType(key)}
                      >
                        {CHART_TYPE_LABELS[key]}
                      </button>
                    {/each}
                  </div>
                </div>
              </section>

              <section class="row">
                <div class="row__label">
                  <strong>가격 스케일</strong>
                  <span class="row__hint">현재: {chart.priceScaleMode === "log" ? "로그" : "기본"}</span>
                </div>
                <div class="row__control">
                  <div class="segmented">
                    {#each PRICE_SCALE_MODES as mode}
                      <button
                        type="button"
                        class="seg-btn"
                        class:is-active={chart.priceScaleMode === mode.key}
                        onclick={() => chart.setPriceScaleMode(mode.key)}
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
                  <button type="button" class="btn" onclick={() => chart.toggleTimeAxis()}>
                    {chart.timeAxisVisible ? "숨기기" : "표시"}
                  </button>
                </div>
              </section>

              <section class="row compare-row">
                <div class="row__label">
                  <strong>비교 심볼</strong>
                  <span class="row__hint">
                    최대 {chart.maxCompare}개 · 동일 인터벌/마켓으로 정규화된 라인이 차트에 오버레이
                  </span>
                </div>
                <div class="row__control compare-controls">
                  <div class="compare-chips">
                    {#each chart.compareSymbols as sym, i (sym)}
                      <span
                        class="compare-chip"
                        style:border-color="color-mix(in srgb, {COMPARE_COLORS[i] ?? '#9ca3af'} 55%, var(--line))"
                        style:color={COMPARE_COLORS[i] ?? "var(--text)"}
                      >
                        <span class="compare-chip__dot" style:background={COMPARE_COLORS[i] ?? "#9ca3af"}></span>
                        {sym}
                        <button
                          type="button"
                          class="compare-chip__x"
                          onclick={() => chart.removeCompareSymbol(sym)}
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
                      disabled={chart.compareSymbols.length >= chart.maxCompare}
                    />
                    <button
                      type="submit"
                      class="btn"
                      disabled={chart.compareSymbols.length >= chart.maxCompare || compareInput.trim().length === 0}
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
                  <button type="button" class="btn" onclick={() => chart.toggleFullscreen()}>
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
                  <span class="row__hint">현재: {drawing.activeTool === "none" ? "선택" : drawing.activeTool}</span>
                </div>
                <div class="row__control">
                  <button type="button" class="btn" onclick={() => drawing.setTool("none")}>
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
                    disabled={!drawing.canUndo}
                    onclick={() => drawing.undo()}
                  >
                    Undo
                  </button>
                  <button
                    type="button"
                    class="btn"
                    disabled={!drawing.canRedo}
                    onclick={() => drawing.redo()}
                  >
                    Redo
                  </button>
                </div>
              </section>

              <section class="row">
                <div class="row__label">
                  <strong>도형 수</strong>
                  <span class="row__hint">{drawing.drawings.length}개 저장됨</span>
                </div>
                <div class="row__control">
                  <button
                    type="button"
                    class="btn"
                    disabled={drawing.drawings.length === 0}
                    onclick={() => drawing.clear()}
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
                        class:is-active={replay.speed === sp}
                        onclick={() => replay.setSpeed(sp as ReplaySpeed)}
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
                    value={replay.lookback}
                    oninput={(e) => replay.setLookback(Number((e.target as HTMLInputElement).value))}
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
                  <span class="row__hint">{replay.enabled ? "리플레이 중" : "비활성"} · 인덱스 {replay.currentIndex}</span>
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

          {:else if active === "backtest"}
            <div class="panel__head">
              <h3 class="panel__title">백테스트</h3>
              <p class="panel__desc">전략 A / B / ORB는 Strategy Lab에서 실행합니다.</p>
            </div>
            <div class="panel__body panel__body--padded">
              <a class="strategy-link" href="/strategy">
                <div>
                  <strong>Strategy Lab 열기</strong>
                  <span class="row__hint">세 전략의 end-to-end UI</span>
                </div>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M5 12h14" />
                  <path d="m13 6 6 6-6 6" />
                </svg>
              </a>
            </div>
          {/if}

          <!-- Workspace snapshots (shared across tabs, shown at bottom) -->
          {#if active !== "backtest"}
            <div class="snapshots">
              <div class="snapshots__head">
                <h4 class="snapshots__title">워크스페이스 스냅샷</h4>
                <span class="snapshots__hint">최대 8개 보관 · 최신이 위에</span>
              </div>

              <form class="snapshots__form" onsubmit={(e) => { e.preventDefault(); takeSnapshot(); }}>
                <input
                  bind:value={snapshotName}
                  type="text"
                  class="snapshots__input"
                  placeholder="스냅샷 이름 (빈 값이면 자동 번호)"
                  maxlength="40"
                />
                <button type="submit" class="btn btn--primary">현재 상태 저장</button>
              </form>

              {#if snapshots.items.length === 0}
                <div class="snapshots__empty">저장된 스냅샷이 없습니다.</div>
              {:else}
                <ul class="snapshots__list" role="list">
                  {#each snapshots.items as snap (snap.id)}
                    <li class="snapshots__row">
                      <div class="snapshots__row-main">
                        <strong>{snap.name}</strong>
                        <span class="row__hint">
                          {snap.params.symbol} · {snap.params.interval} · {fmtDate(snap.createdAt)}
                        </span>
                      </div>
                      <div class="snapshots__row-actions">
                        <button type="button" class="btn btn--ghost" onclick={() => applyAndClose(snap)}>
                          불러오기
                        </button>
                        <button type="button" class="btn btn--ghost" onclick={() => snapshots.remove(snap.id)} aria-label="삭제" title="삭제">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 6 6 18M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </li>
                  {/each}
                </ul>
              {/if}
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
    height: min(calc(100vh - 4rem), 700px);
  }

  .panel {
    display: flex;
    flex-direction: column;
    min-height: 0;
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
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--input);
    max-height: 340px;
    overflow-y: auto;
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

  .btn--primary {
    background: var(--accent);
    color: var(--primary-fore);
    border-color: var(--accent);
  }

  .btn--primary:hover {
    background: color-mix(in srgb, var(--accent) 82%, black);
    color: var(--primary-fore);
  }

  .btn--ghost {
    padding: 5px 8px;
    background: transparent;
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

  .strategy-link {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: 10px;
    background: var(--input);
    color: var(--text);
    text-decoration: none;
    transition: border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }

  .strategy-link:hover {
    border-color: color-mix(in srgb, var(--accent) 45%, var(--line));
    background: var(--accent-soft);
    color: var(--accent);
  }

  /* ── Snapshots section ─────────────────────── */
  .snapshots {
    margin-top: 12px;
    padding: 12px;
    border: 1px solid var(--line-soft);
    border-radius: 10px;
    background: color-mix(in srgb, var(--input) 75%, transparent);
  }

  .snapshots__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }

  .snapshots__title {
    margin: 0;
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--text);
  }

  .snapshots__hint {
    font-size: var(--fs-xs);
    color: var(--muted);
  }

  .snapshots__form {
    display: flex;
    gap: 6px;
    margin-bottom: 8px;
  }

  .snapshots__input {
    flex: 1;
    padding: 7px 10px;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: var(--surface);
    color: var(--text);
    font: inherit;
    font-size: var(--fs-sm);
    outline: none;
  }

  .snapshots__input:focus {
    border-color: color-mix(in srgb, var(--accent) 50%, var(--line));
  }

  .snapshots__empty {
    padding: 14px;
    text-align: center;
    color: var(--muted);
    font-size: var(--fs-sm);
  }

  .snapshots__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .snapshots__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 10px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
  }

  .snapshots__row-main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .snapshots__row-main strong {
    font-size: var(--fs-base);
    font-weight: 600;
    color: var(--text);
  }

  .snapshots__row-actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
  }
</style>
