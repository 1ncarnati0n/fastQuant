<script lang="ts">
  import type { AnalysisParams } from "$lib/api/types";
  import { INDICATOR_SPECS, type FieldSpec, type IndicatorSpec } from "$lib/chart/indicatorSpecs";
  import Toggle from "$lib/components/ui/Toggle.svelte";
  import IndicatorStyleEditor from "$lib/components/IndicatorStyleEditor.svelte";
  import { INDICATOR_GUIDES } from "$lib/features/indicators/panelGuides";
  import {
    addNumberArrayItem,
    captureIndicatorValues,
    disableActiveIndicators,
    getIndicatorFieldValue,
    groupIconPath,
    isIndicatorActive,
    isIndicatorCustomized,
    matchesIndicatorQuery,
    removeNumberArrayItem,
    resetIndicatorSpec,
    toggleIndicatorActivation,
    updateIndicatorField,
  } from "$lib/features/indicators/panelParams";
  import {
    applyIndicatorPresetToParams,
    createIndicatorPreset,
    loadIndicatorPresets,
    persistIndicatorPresets,
    type IndicatorPreset,
  } from "$lib/features/indicators/panelPresets";
  import { indicatorVisibility } from "$lib/stores/indicatorVisibility.svelte";

  let {
    params,
    onParamsChange,
  }: {
    params: AnalysisParams;
    onParamsChange: (next: AnalysisParams) => void;
  } = $props();

  // ── 상태 ─────────────────────────────────────────────────
  let selectedKey = $state<string | null>(INDICATOR_SPECS[0]?.key ?? null);
  let query       = $state("");
  let filter      = $state<"all" | "active">("all");
  let searchEl    = $state<HTMLInputElement | null>(null);
  let presetName  = $state("");
  let presetsLoaded = false;

  let indicatorPresets = $state<IndicatorPreset[]>([]);

  const selectedSpec = $derived(
    selectedKey ? (INDICATOR_SPECS.find((s) => s.key === selectedKey) ?? null) : null,
  );
  const selectedGuide = $derived(selectedSpec ? (INDICATOR_GUIDES[selectedSpec.key] ?? null) : null);
  const selectedPresets = $derived(
    selectedSpec ? indicatorPresets.filter((p) => p.indicatorKey === selectedSpec.key) : [],
  );

  // ── 활성화 상태 ──────────────────────────────────────────
  function isActive(spec: IndicatorSpec): boolean {
    return isIndicatorActive(params, spec);
  }

  function isCustomized(spec: IndicatorSpec): boolean {
    return isIndicatorCustomized(params, spec);
  }

  // ── 필터링된 리스트 ──────────────────────────────────────
  const normalizedQuery = $derived(query.trim().toLowerCase());

  function matchesQuery(spec: IndicatorSpec): boolean {
    return matchesIndicatorQuery(spec, normalizedQuery);
  }

  const filteredSpecs = $derived(
    INDICATOR_SPECS.filter((s) => {
      if (!matchesQuery(s)) return false;
      if (filter === "active" && !isActive(s)) return false;
      return true;
    }),
  );

  const overlaySpecs = $derived(filteredSpecs.filter((s) => s.group === "overlay"));
  const paneSpecs    = $derived(filteredSpecs.filter((s) => s.group === "pane"));

  // ── 카운트 ────────────────────────────────────────────────
  const activeCount    = $derived(INDICATOR_SPECS.filter((s) => isActive(s) && s.activation.kind !== "always").length);
  const totalToggleable = INDICATOR_SPECS.filter((s) => s.activation.kind !== "always").length;
  const customizedCount = $derived(INDICATOR_SPECS.filter((s) => isCustomized(s)).length);
  const upperActiveCount = $derived(INDICATOR_SPECS.filter((s) => s.group === "overlay" && isActive(s)).length);
  const lowerActiveCount = $derived(INDICATOR_SPECS.filter((s) => s.group === "pane" && isActive(s)).length);

  // ── 활성화 토글 ─────────────────────────────────────────
  function toggleActivation(spec: IndicatorSpec) {
    const wasActive = isActive(spec);
    onParamsChange(toggleIndicatorActivation($state.snapshot(params) as AnalysisParams, spec));
    if (!wasActive) indicatorVisibility.show(spec.key);
  }

  function disableAll() {
    onParamsChange(disableActiveIndicators($state.snapshot(params) as AnalysisParams, INDICATOR_SPECS));
  }

  // ── 필드 업데이트 ────────────────────────────────────────
  function updateField(path: string, value: unknown) {
    onParamsChange(updateIndicatorField($state.snapshot(params) as AnalysisParams, path, value));
  }

  function stepField(field: FieldSpec, delta: number) {
    if (field.kind !== "number" && field.kind !== "nestedNumber") return;
    const cur = Number(fieldValue(field)) || 0;
    const step = field.step ?? 1;
    let next = +(cur + delta * step).toFixed(4);
    if (field.min !== undefined) next = Math.max(field.min, next);
    if (field.max !== undefined) next = Math.min(field.max, next);
    updateField(field.path, next);
  }

  // numberArray 필드 관련
  let newPeriodInput = $state<Record<string, string>>({});

  function removePeriod(path: string, idx: number) {
    onParamsChange(removeNumberArrayItem($state.snapshot(params) as AnalysisParams, path, idx));
  }

  function addPeriod(path: string, raw: string) {
    const result = addNumberArrayItem($state.snapshot(params) as AnalysisParams, path, raw);
    if (!result.added) return;
    onParamsChange(result.params);
    newPeriodInput = { ...newPeriodInput, [path]: "" };
  }

  // ── 초기화 ──────────────────────────────────────────────
  function resetSpec(spec: IndicatorSpec) {
    onParamsChange(resetIndicatorSpec($state.snapshot(params) as AnalysisParams, spec));
  }

  function captureSpecValues(spec: IndicatorSpec) {
    return captureIndicatorValues(params, spec);
  }

  function persistPresets(next: IndicatorPreset[]) {
    indicatorPresets = next;
    persistIndicatorPresets(next);
  }

  function savePreset(spec: IndicatorSpec) {
    const name = presetName.trim();
    if (!name) return;
    const next = createIndicatorPreset(spec.key, name, captureSpecValues(spec));
    persistPresets([next, ...indicatorPresets]);
    presetName = "";
  }

  function applyPreset(spec: IndicatorSpec, preset: IndicatorPreset) {
    onParamsChange(
      applyIndicatorPresetToParams($state.snapshot(params) as AnalysisParams, spec, preset, isActive(spec)),
    );
  }

  function deletePreset(id: string) {
    persistPresets(indicatorPresets.filter((p) => p.id !== id));
  }

  // ── 헬퍼 ─────────────────────────────────────────────────
  function fieldValue(f: FieldSpec): unknown {
    return getIndicatorFieldValue(params, f);
  }

  function selectIndicator(spec: IndicatorSpec) {
    selectedKey = selectedKey === spec.key ? null : spec.key;
  }

  function handleIndicatorRowKeydown(event: KeyboardEvent, spec: IndicatorSpec) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      selectIndicator(spec);
    }
  }

  // ── 키보드 단축키 ────────────────────────────────────────
  function onGlobalKey(e: KeyboardEvent) {
    const tag = (e.target as HTMLElement | null)?.tagName;
    const editing = tag === "INPUT" || tag === "TEXTAREA";
    if (e.key === "/" && !editing) {
      e.preventDefault();
      searchEl?.focus();
    } else if (e.key === "Escape" && editing && (e.target as HTMLElement) === searchEl) {
      query = "";
      searchEl?.blur();
    }
  }

  function groupIcon(group: "overlay" | "pane"): string {
    return groupIconPath(group);
  }

  $effect(() => {
    if (presetsLoaded) return;
    presetsLoaded = true;
    indicatorPresets = loadIndicatorPresets();
  });
</script>

<svelte:window on:keydown={onGlobalKey} />

<div class="indicator-shell">
  <!-- ── 좌측 리스트 뷰 ─────────────────────────────────── -->
  <div class="list-view">
    <div class="summary-chips">
      <span class="summary-chip">상단 {upperActiveCount}</span>
      <span class="summary-chip">하단 {lowerActiveCount}</span>
      <span class="summary-chip">커스텀 {customizedCount}</span>
    </div>

    <!-- 상단 툴바 -->
    <div class="toolbar">
      <div class="search">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7"/>
          <path d="m20 20-3-3"/>
        </svg>
        <input
          bind:this={searchEl}
          bind:value={query}
          class="search-input"
          type="search"
          placeholder="예: RSI, 볼린저, 거래량"
          aria-label="지표 검색"
        />
        {#if query}
          <button
            type="button"
            class="search-clear"
            onclick={() => { query = ""; searchEl?.focus(); }}
            aria-label="검색어 지우기"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        {:else}
          <kbd class="search-kbd" title="검색 포커스">/</kbd>
        {/if}
      </div>

      <div class="filter-tabs" role="tablist" aria-label="표시 필터">
        <button
          type="button"
          class="filter-tab"
          class:active={filter === "all"}
          role="tab"
          aria-selected={filter === "all"}
          onclick={() => (filter = "all")}
        >전체 <span class="tab-count">{INDICATOR_SPECS.length}</span></button>
        <button
          type="button"
          class="filter-tab"
          class:active={filter === "active"}
          role="tab"
          aria-selected={filter === "active"}
          onclick={() => (filter = "active")}
        >활성 <span class="tab-count tab-count--on">{activeCount}</span></button>
      </div>
    </div>

    <!-- 섹션 리스트 -->
    <div class="list-scroll">
      {#each [
        { label: "상단 지표", group: "overlay" as const, items: overlaySpecs },
        { label: "하단 지표", group: "pane"    as const, items: paneSpecs    },
      ] as section}
        {#if section.items.length > 0}
          {@const activeInSection = section.items.filter((s) => isActive(s)).length}
          <div class="section">
            <div class="section-head">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d={groupIcon(section.group)}/>
              </svg>
              <span class="section-label">{section.label}</span>
              <span class="section-count">{activeInSection}/{section.items.length}</span>
            </div>
            {#each section.items as spec (spec.key)}
              {@const active = isActive(spec)}
              {@const always = spec.activation.kind === "always"}
              <div
                class="ind-row"
                class:selected={selectedKey === spec.key}
                class:active
                role="button"
                aria-pressed={selectedKey === spec.key}
                tabindex="0"
                onclick={() => selectIndicator(spec)}
                onkeydown={(e) => handleIndicatorRowKeydown(e, spec)}
              >
                <span class="ind-dot" class:dot-on={active} aria-hidden="true"></span>
                <span class="ind-copy">
                  <span class="ind-name">{spec.label}</span>
                  <span class="ind-desc">
                    {active ? (indicatorVisibility.hidden.has(spec.key) ? "활성 · 숨김" : "차트 표시 중") : "비활성"}
                    {isCustomized(spec) ? " · 커스텀" : ""}
                  </span>
                </span>
                <span
                  class="activation-toggle"
                  title={always ? "항상 활성화됨" : active ? "비활성화" : "활성화"}
                >
                  <Toggle
                    checked={active}
                    disabled={always}
                    size="sm"
                    onclick={(e) => e.stopPropagation()}
                    onchange={() => toggleActivation(spec)}
                  />
                </span>
              </div>
            {/each}
          </div>
        {/if}
      {/each}

      {#if filteredSpecs.length === 0}
        <div class="empty-filter">
          <div class="empty-filter-icon" aria-hidden="true">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7"/>
              <path d="m20 20-3-3"/>
            </svg>
          </div>
          <strong>결과가 없습니다</strong>
          <span>
            {#if query}
              '{query}'에 해당하는 지표를 찾지 못했어요.
            {:else}
              활성화된 지표가 없습니다.
            {/if}
          </span>
          {#if query || filter !== "all"}
            <button
              type="button"
              class="empty-reset"
              onclick={() => { query = ""; filter = "all"; }}
            >필터 초기화</button>
          {/if}
        </div>
      {/if}
    </div>

    <!-- 하단 액션바 -->
    <div class="list-footer">
      <span class="footer-status">{activeCount}/{totalToggleable} 활성</span>
      <button
        type="button"
        class="footer-btn"
        disabled={activeCount === 0}
        onclick={disableAll}
        title="활성 지표를 모두 비활성화"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14"/>
        </svg>
        모두 끄기
      </button>
    </div>
  </div>

  <!-- ── 우측 디테일 뷰 ─────────────────────────────────── -->
  {#if selectedSpec === null}
    <div class="detail-view detail-view--empty">
      <div class="empty-card">
        <div class="empty-icon" aria-hidden="true">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 18h4l3-8 4 12 3-10 4 6"/>
          </svg>
        </div>
        <strong>보조지표 선택</strong>
        <span>왼쪽 목록에서 지표를 선택하면 설명과 파라미터를 바로 조정할 수 있습니다.</span>
        <div class="empty-hints">
          <div class="hint-row">
            <kbd>/</kbd>
            <span>검색 시작</span>
          </div>
          <div class="hint-row">
            <kbd>Enter</kbd>
            <span>선택 항목 열기</span>
          </div>
        </div>
      </div>
    </div>
  {:else}
  <div class="detail-view">
    <div class="detail-header">
      <span class="detail-swatch" aria-hidden="true"></span>
      <div class="title-block">
        <span class="detail-title">{selectedSpec.label}</span>
        <span class="detail-group">{selectedSpec.description}</span>
      </div>
      <Toggle
        checked={isActive(selectedSpec)}
        disabled={selectedSpec.activation.kind === "always"}
        size="sm"
        onchange={() => toggleActivation(selectedSpec)}
      />
    </div>

    {#if selectedGuide}
      <div class="guide-card">
        <div class="guide-row">
          <span class="guide-label">요약</span>
          <p class="guide-text">{selectedGuide.summary}</p>
        </div>
        <div class="guide-row">
          <span class="guide-label">활용 팁</span>
          <p class="guide-text">{selectedGuide.tip}</p>
        </div>
      </div>
    {/if}

    <div class="detail-note">
      {#if isCustomized(selectedSpec)}
        현재 선택한 지표는 일부 값이 기본값에서 변경되었습니다.
      {:else}
        현재 선택한 지표는 기본값을 그대로 사용 중입니다.
      {/if}
    </div>

    {#if selectedSpec.fields.length > 0}
      <div class="fields section-block">
        <div class="fields-label">파라미터</div>
        {#each selectedSpec.fields as field}
          <div class="field-row">
            <label class="field-label" for="field-{field.path}">{field.label}</label>

            {#if field.kind === "number" || field.kind === "nestedNumber"}
              <div class="number-field">
                <button
                  type="button"
                  class="step-btn"
                  aria-label="{field.label} 감소"
                  onclick={() => stepField(field, -1)}
                >−</button>
                <input
                  id="field-{field.path}"
                  type="number"
                  class="field-input field-input--num"
                  value={fieldValue(field)}
                  min={field.min}
                  max={field.max}
                  step={field.step ?? 1}
                  onchange={(e) => updateField(field.path, Number((e.target as HTMLInputElement).value))}
                />
                <button
                  type="button"
                  class="step-btn"
                  aria-label="{field.label} 증가"
                  onclick={() => stepField(field, 1)}
                >+</button>
                {#if field.min !== undefined || field.max !== undefined}
                  <span class="field-meta">
                    {field.min ?? "–"}–{field.max ?? "–"}
                  </span>
                {/if}
              </div>

            {:else if field.kind === "numberArray"}
              {@const arr = (fieldValue(field) as number[])}
              <div class="array-field" id="field-{field.path}">
                <div class="pills">
                  {#if arr.length === 0}
                    <span class="pills-empty">기간을 추가하세요</span>
                  {:else}
                    {#each arr as period, idx}
                      {@const color = field.colors?.[idx % (field.colors?.length ?? 1)] ?? "var(--muted-fore)"}
                      <span class="pill">
                        <span class="pill-dot" style:background={color}></span>
                        {period}
                        <button
                          type="button"
                          class="pill-remove"
                          onclick={() => removePeriod(field.path, idx)}
                          aria-label="{period} 제거"
                        >×</button>
                      </span>
                    {/each}
                  {/if}
                </div>
                <div class="array-add">
                  <input
                    type="number"
                    class="field-input field-input--sm"
                    placeholder="기간"
                    min={field.min}
                    max={field.max}
                    bind:value={newPeriodInput[field.path]}
                    onkeydown={(e) => {
                      if (e.key === "Enter") addPeriod(field.path, newPeriodInput[field.path] ?? "");
                    }}
                  />
                  <button
                    type="button"
                    class="add-btn"
                    onclick={() => addPeriod(field.path, newPeriodInput[field.path] ?? "")}
                    aria-label="기간 추가"
                  >+ 추가</button>
                </div>
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {:else}
      <div class="no-fields">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10"/>
          <path d="M12 16v-4M12 8h.01"/>
        </svg>
        <span>이 지표는 조정 가능한 파라미터가 없습니다.</span>
      </div>
    {/if}

    <div class="section-block section-block--style">
      <div class="fields-label">스타일</div>
      <div class="style-editor-wrap">
        <IndicatorStyleEditor spec={selectedSpec} {params} />
      </div>
    </div>

    <div class="section-block">
      <div class="fields-label">스타일 프리셋</div>
      <div class="preset-save-row">
        <input
          class="field-input"
          type="text"
          placeholder="프리셋 이름"
          bind:value={presetName}
          onkeydown={(e) => {
            if (e.key === "Enter" && selectedSpec) savePreset(selectedSpec);
          }}
        />
        <button type="button" class="add-btn" onclick={() => savePreset(selectedSpec)}>스타일 저장</button>
      </div>
      {#if selectedPresets.length > 0}
        <div class="preset-list">
          {#each selectedPresets as preset (preset.id)}
            <div class="preset-item">
              <span class="preset-name">{preset.name}</span>
              <button type="button" class="preset-action" onclick={() => applyPreset(selectedSpec, preset)}>적용</button>
              <button type="button" class="preset-delete" onclick={() => deletePreset(preset.id)} aria-label="프리셋 삭제">×</button>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="detail-footer">
      <button
        type="button"
        class="reset-btn"
        onclick={() => resetSpec(selectedSpec)}
        disabled={selectedSpec.fields.length === 0}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 12a9 9 0 1 0 3-6.7L3 8"/>
          <path d="M3 3v5h5"/>
        </svg>
        기본값으로 초기화
      </button>
    </div>
  </div>
  {/if}
</div>

<style>
  .indicator-shell {
    display: grid;
    grid-template-columns: minmax(280px, 360px) minmax(0, 1fr);
    grid-template-rows: minmax(0, 1fr);
    min-height: 0;
    height: 100%;
    background: var(--card);
    color: var(--foreground);
  }

  /* ── 좌측 목록 뷰 ─── */
  .list-view {
    display: flex;
    flex-direction: column;
    min-height: 0;
    border-right: 1px solid var(--border);
    background: var(--card);
  }

  .summary-chips {
    display: flex;
    gap: 6px;
    padding: 10px 14px 0;
    flex-wrap: wrap;
  }

  .summary-chip {
    display: inline-flex;
    align-items: center;
    height: 28px;
    padding: 0 10px;
    border-radius: 999px;
    background: var(--muted-bg);
    border: 1px solid var(--border);
    color: var(--muted-fore);
    font-size: var(--fs-xs);
    font-weight: 700;
  }

  /* 툴바 */
  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 14px 10px;
    border-bottom: 1px solid var(--border);
    background: var(--card);
    position: sticky;
    top: 0;
    z-index: 2;
  }

  .search {
    position: relative;
    display: flex;
    align-items: center;
  }

  .search > svg {
    position: absolute;
    left: 10px;
    color: var(--muted-fore);
    pointer-events: none;
  }

  .search-input {
    width: 100%;
    padding: 8px 32px 8px 30px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--input);
    color: var(--foreground);
    font-size: var(--fs-base);
    outline: none;
    transition: border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }

  .search-input::-webkit-search-cancel-button { display: none; }

  .search-input:focus {
    border-color: var(--primary);
    background: var(--card);
  }

  .search-clear {
    position: absolute;
    right: 6px;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--muted-fore);
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }

  .search-clear:hover {
    color: var(--foreground);
    background: var(--muted-bg);
  }

  .search-kbd {
    position: absolute;
    right: 8px;
    padding: 1px 6px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--card);
    color: var(--muted-fore);
    font-size: var(--fs-2xs);
    font-family: inherit;
    pointer-events: none;
  }

  .filter-tabs {
    display: inline-flex;
    gap: 2px;
    padding: 3px;
    border-radius: var(--radius-md);
    background: var(--muted-bg);
    align-self: flex-start;
  }

  .filter-tab {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 11px;
    border: 0;
    border-radius: var(--radius-sm);
    background: transparent;
    color: var(--muted-fore);
    font-size: var(--fs-xs);
    font-weight: 700;
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
  }

  .filter-tab:hover { color: var(--foreground); }

  .filter-tab.active {
    background: var(--card);
    color: var(--foreground);
    box-shadow: var(--shadow-sm);
  }

  .tab-count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    padding: 0 5px;
    height: 16px;
    border-radius: 999px;
    background: var(--border);
    color: var(--muted-fore);
    font-size: var(--fs-2xs);
    font-weight: 800;
  }

  .filter-tab.active .tab-count {
    background: var(--muted-bg);
  }

  .tab-count--on {
    background: var(--primary-soft);
    color: var(--primary);
  }

  /* 리스트 스크롤 영역 */
  .list-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    padding: 10px 10px 6px;
  }

  .section { padding: 4px 0 8px; }

  .section-head {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 8px 8px;
    font-size: var(--fs-2xs);
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted-fore);
  }

  .section-head > svg {
    color: var(--muted-fore);
    opacity: 0.8;
  }

  .section-label { flex: 1; }

  .section-count {
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--muted-bg);
    color: var(--muted-fore);
    font-size: var(--fs-2xs);
    font-weight: 800;
    letter-spacing: 0;
    text-transform: none;
  }

  .ind-row {
    display: flex;
    align-items: center;
    padding: 10px 12px;
    gap: 10px;
    cursor: pointer;
    border-radius: var(--radius-md);
    margin: 0 0 2px;
    border: 1px solid transparent;
    transition:
      background var(--dur-fast) var(--ease),
      border-color var(--dur-fast) var(--ease);
    user-select: none;
    position: relative;
  }

  .ind-row:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--primary) 55%, var(--line));
    outline-offset: 1px;
  }

  .ind-row:hover { background: var(--muted-bg); }

  .ind-row.selected {
    background: var(--primary-soft);
    border-color: color-mix(in srgb, var(--primary) 18%, transparent);
  }

  .ind-row.selected .ind-name { color: var(--foreground); }

  .ind-dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    background: var(--border);
    flex-shrink: 0;
    transition: background var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease);
  }

  .ind-dot.dot-on {
    background: var(--primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--primary) 18%, transparent);
  }

  .ind-copy {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    flex: 1;
  }

  .ind-name {
    font-size: var(--fs-base);
    font-weight: 700;
    color: var(--foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .ind-desc {
    font-size: var(--fs-xs);
    color: var(--muted-fore);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .activation-toggle {
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  /* 빈 상태 (검색 결과 없음) */
  .empty-filter {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    padding: 40px 16px;
    text-align: center;
    color: var(--muted-fore);
  }

  .empty-filter-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: var(--radius-full);
    background: var(--muted-bg);
    color: var(--muted-fore);
    margin-bottom: 4px;
  }

  .empty-filter strong {
    color: var(--foreground);
    font-size: var(--fs-md);
    font-weight: 800;
  }

  .empty-filter span {
    font-size: var(--fs-sm);
    line-height: 1.5;
  }

  .empty-reset {
    margin-top: 8px;
    padding: 6px 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--card);
    color: var(--foreground);
    font-size: var(--fs-xs);
    font-weight: 700;
    cursor: pointer;
    transition: border-color var(--dur-fast) var(--ease);
  }

  .empty-reset:hover { border-color: var(--primary); }

  /* 하단 액션바 */
  .list-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 10px 14px;
    border-top: 1px solid var(--border);
    background: var(--card);
  }

  .footer-status {
    font-size: var(--fs-xs);
    color: var(--muted-fore);
    font-weight: 700;
  }

  .footer-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    background: var(--card);
    color: var(--foreground);
    font-size: var(--fs-xs);
    font-weight: 700;
    cursor: pointer;
    transition: border-color var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }

  .footer-btn:hover:not(:disabled) {
    border-color: var(--destructive);
    color: var(--destructive);
  }

  .footer-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  /* ── 우측 디테일 뷰 ─── */
  .detail-view {
    display: flex;
    flex-direction: column;
    padding: 0;
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    background: var(--card);
  }

  .detail-view--empty {
    justify-content: center;
    align-items: center;
    padding: 28px;
  }

  .empty-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
    max-width: 440px;
    padding: 40px 32px;
    border: 1px dashed var(--border);
    border-radius: var(--radius-lg);
    background: var(--muted-bg);
    color: var(--muted-fore);
    text-align: center;
  }

  .empty-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 56px;
    height: 56px;
    border-radius: var(--radius-full);
    background: var(--card);
    color: var(--primary);
    margin-bottom: 4px;
    box-shadow: var(--shadow-sm);
  }

  .empty-card strong {
    color: var(--foreground);
    font-size: var(--fs-xl);
    font-weight: 800;
  }

  .empty-card span {
    line-height: 1.55;
    font-size: var(--fs-base);
    max-width: 360px;
  }

  .empty-hints {
    display: flex;
    flex-direction: column;
    gap: 6px;
    margin-top: 14px;
    padding-top: 14px;
    border-top: 1px solid var(--border);
    width: 100%;
  }

  .hint-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    font-size: var(--fs-xs);
    color: var(--muted-fore);
  }

  kbd {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 22px;
    padding: 2px 6px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--card);
    color: var(--foreground);
    font-size: var(--fs-2xs);
    font-weight: 700;
    font-family: inherit;
  }

  .detail-header {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 16px 20px 14px;
    border-bottom: 1px solid var(--border);
    position: sticky;
    top: 0;
    background: var(--card);
    z-index: 1;
  }

  .detail-swatch {
    width: 12px;
    height: 12px;
    border-radius: 999px;
    background: #f59e0b;
    flex-shrink: 0;
  }

  .title-block {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-width: 0;
    gap: 2px;
  }

  .detail-title {
    font-size: var(--fs-xl);
    font-weight: 800;
    color: var(--foreground);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .detail-group {
    font-size: var(--fs-sm);
    font-weight: 500;
    color: var(--muted-fore);
    line-height: 1.4;
  }

  .guide-card {
    margin: 14px 20px 10px;
    border: 1px solid color-mix(in srgb, var(--primary) 35%, var(--border));
    border-radius: 14px;
    background: color-mix(in srgb, var(--primary-soft) 35%, var(--card));
    padding: 14px;
    display: grid;
    gap: 10px;
  }

  .guide-row {
    display: grid;
    gap: 4px;
  }

  .guide-label {
    font-size: var(--fs-xs);
    color: var(--muted-fore);
    font-weight: 700;
  }

  .guide-text {
    margin: 0;
    color: var(--foreground);
    font-size: var(--fs-sm);
    line-height: 1.5;
  }

  .detail-note {
    margin: 0 20px 10px;
    border: 1px solid var(--border);
    border-radius: 12px;
    padding: 12px;
    background: color-mix(in srgb, var(--muted-bg) 60%, var(--card));
    font-size: var(--fs-sm);
    color: var(--muted-fore);
  }

  .no-fields {
    display: flex;
    align-items: center;
    gap: 8px;
    margin: 14px 24px;
    padding: 14px 16px;
    border: 1px dashed var(--border);
    border-radius: var(--radius-md);
    font-size: var(--fs-sm);
    color: var(--muted-fore);
    background: var(--muted-bg);
  }

  /* ── 필드 ─── */
  .fields {
    display: flex;
    flex-direction: column;
    padding: 8px 0 4px;
  }

  .section-block {
    margin: 0 20px 12px;
    border: 1px solid var(--border);
    border-radius: 14px;
    background: var(--card);
    overflow: hidden;
  }

  .section-block--style {
    padding-bottom: 12px;
  }

  .fields-label {
    padding: 10px 14px 6px;
    font-size: var(--fs-2xs);
    font-weight: 800;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted-fore);
  }

  .field-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 14px;
    min-height: 44px;
  }

  .field-label {
    font-size: var(--fs-base);
    color: var(--foreground);
    flex: 1;
    min-width: 0;
  }

  .field-input {
    padding: 7px 10px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--card);
    color: var(--foreground);
    font-size: var(--fs-base);
    text-align: left;
    outline: none;
    transition: border-color var(--dur-fast) var(--ease);
  }

  .field-input:focus { border-color: var(--primary); }

  .field-input--num {
    width: 72px;
    text-align: center;
    font-variant-numeric: tabular-nums;
  }

  .field-input--sm { width: 88px; }

  /* number 필드 (step 버튼 포함) */
  .number-field {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    flex-shrink: 0;
  }

  .step-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    background: var(--card);
    color: var(--foreground);
    font-size: var(--fs-md);
    font-weight: 700;
    cursor: pointer;
    transition: border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
    user-select: none;
  }

  .step-btn:hover {
    border-color: var(--primary);
    background: var(--primary-soft);
    color: var(--primary);
  }

  .field-meta {
    font-size: var(--fs-2xs);
    color: var(--muted-fore);
    font-variant-numeric: tabular-nums;
    font-weight: 600;
  }

  /* ── numberArray 필드 ─── */
  .array-field {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 6px;
    flex-shrink: 0;
    max-width: 62%;
  }

  .pills {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    justify-content: flex-end;
    min-height: 24px;
    align-items: center;
  }

  .pills-empty {
    font-size: var(--fs-xs);
    color: var(--muted-fore);
    font-style: italic;
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    background: var(--input);
    border: 1px solid var(--border);
    border-radius: var(--radius-sm);
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
  }

  .pill-dot {
    width: 8px;
    height: 8px;
    border-radius: var(--radius-full);
    flex-shrink: 0;
    box-shadow: 0 0 0 2px color-mix(in srgb, currentColor 8%, transparent);
  }

  .pill-remove {
    background: none;
    border: none;
    color: var(--muted-fore);
    cursor: pointer;
    font-size: var(--fs-md);
    padding: 0;
    line-height: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    border-radius: 3px;
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }

  .pill-remove:hover {
    color: var(--destructive);
    background: var(--destructive-soft);
  }

  .array-add {
    display: flex;
    gap: 4px;
  }

  .add-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 6px 10px;
    border: 1px solid var(--border);
    background: var(--card);
    color: var(--foreground);
    border-radius: var(--radius-sm);
    font-size: var(--fs-xs);
    font-weight: 700;
    cursor: pointer;
    flex-shrink: 0;
    transition: border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
  }

  .add-btn:hover {
    border-color: var(--primary);
    background: var(--primary-soft);
    color: var(--primary);
  }

  /* 디테일 푸터 */
  .detail-footer {
    display: flex;
    justify-content: flex-end;
    padding: 18px 20px 24px;
    margin-top: auto;
    border-top: 1px solid var(--border);
  }

  .style-editor-wrap {
    padding: 0 14px 12px;
  }

  .preset-save-row {
    display: flex;
    gap: 8px;
    padding: 0 14px 10px;
  }

  .preset-list {
    border-top: 1px solid var(--border);
    padding: 10px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    max-height: 220px;
    overflow-y: auto;
  }

  .preset-item {
    display: flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 8px 10px;
    background: var(--muted-bg);
  }

  .preset-name {
    flex: 1;
    min-width: 0;
    font-size: var(--fs-sm);
    color: var(--foreground);
    font-weight: 600;
  }

  .preset-action,
  .preset-delete {
    border: 1px solid var(--border);
    background: var(--card);
    border-radius: 8px;
    height: 28px;
    padding: 0 10px;
    font-size: var(--fs-xs);
    color: var(--foreground);
    cursor: pointer;
  }

  .preset-delete {
    width: 28px;
    padding: 0;
  }

  .reset-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 8px 14px;
    background: var(--muted-bg);
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--muted-fore);
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }

  .reset-btn:hover:not(:disabled) {
    color: var(--foreground);
    border-color: var(--primary);
  }

  .reset-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  @media (max-width: 760px) {
    .indicator-shell {
      grid-template-columns: 1fr;
    }
    .list-view {
      max-height: 46vh;
      border-right: 0;
      border-bottom: 1px solid var(--border);
    }
    .array-field {
      max-width: 100%;
    }
  }
</style>
