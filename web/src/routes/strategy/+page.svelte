<script lang="ts">
  import TopBar from "$lib/components/dashboard/TopBar.svelte";
  import EquityCurveChart from "$lib/components/EquityCurveChart.svelte";
  import { createStrategyLabPageController } from "$lib/features/strategy/useStrategyLabPage.svelte";

  const strategy = createStrategyLabPageController();
</script>

<div class="layout">
  <TopBar hideDockButtons={true} />

  <main class="content">
    <!-- Hero -->
    <section class="hero">
      <div class="hero__left">
        <span class="hero__eye">QUANT RESEARCH</span>
        <h1 class="hero__title">Strategy Lab</h1>
        <p class="hero__sub">Backend-owned backtesting & signal scanning workflows</p>
      </div>
      <div class="hero__status" class:running={strategy.loading}>
        <span class="status-label">{strategy.loading ? "running" : "idle"}</span>
        <span class="status-tab">{strategy.activeTab}</span>
        {#if strategy.loading}
          <span class="status-spinner"></span>
        {/if}
      </div>
    </section>

    {#if strategy.error}
      <div class="error-banner" role="alert">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" />
        </svg>
        {strategy.error}
      </div>
    {/if}

    <!-- Tab bar -->
    <div class="tab-bar" role="tablist" aria-label="전략 탭">
      {#each strategy.tabs as tab}
        <button
          type="button"
          role="tab"
          class="tab-item"
          class:active={strategy.activeTab === tab.id}
          aria-selected={strategy.activeTab === tab.id}
          onclick={() => (strategy.activeTab = tab.id)}
        >
          <span class="tab-label">{tab.label}</span>
          <span class="tab-sub">{tab.sub}</span>
        </button>
      {/each}
    </div>

    <!-- Panel -->
    <div class="panel" role="tabpanel">

      <!-- ── Strategy A ─────────────────────────── -->
      {#if strategy.activeTab === "A"}
        <div class="panel-head">
          <div>
            <span class="panel-eye">GEM · TAA · SECTOR TIMING</span>
            <h2>월봉 자산배분 Backtest</h2>
          </div>
          <button type="button" class="run-btn" onclick={() => void strategy.runA()} disabled={strategy.loading}>
            {#if strategy.loading}
              <span class="btn-spinner"></span>실행 중
            {:else}
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>
              실행
            {/if}
          </button>
        </div>

        {#if strategy.resultA}
          <div class="metrics-grid">
            <div class="metric">
              <span class="metric__key">Total Return</span>
              <strong class="metric__val" class:val-pos={(strategy.resultA.totalReturn) >= 0} class:val-neg={(strategy.resultA.totalReturn) < 0}>
                {(strategy.resultA.totalReturn * 100).toFixed(2)}%
              </strong>
            </div>
            <div class="metric">
              <span class="metric__key">CAGR</span>
              <strong class="metric__val" class:val-pos={strategy.resultA.cagr >= 0}>
                {(strategy.resultA.cagr * 100).toFixed(2)}%
              </strong>
            </div>
            <div class="metric">
              <span class="metric__key">Sharpe</span>
              <strong class="metric__val" class:val-pos={strategy.resultA.sharpe >= 1}>
                {strategy.resultA.sharpe.toFixed(2)}
              </strong>
            </div>
            <div class="metric">
              <span class="metric__key">Max Drawdown</span>
              <strong class="metric__val val-neg">
                {(strategy.resultA.maxDrawdown * 100).toFixed(2)}%
              </strong>
            </div>
          </div>

          <div class="chart-card">
            <EquityCurveChart data={strategy.resultA.equityCurve} />
          </div>

          <div class="alloc-card">
            <div class="alloc-row">
              <span class="alloc-key">GEM 현재</span>
              <strong class="alloc-val">{strategy.resultA.currentAllocation?.gem.asset ?? "—"}</strong>
            </div>
            <div class="alloc-row">
              <span class="alloc-key">TAA</span>
              <span class="alloc-val">
                {strategy.resultA.currentAllocation?.taa.filter((i) => i.invested).map((i) => i.asset).join(", ") || "—"}
              </span>
            </div>
            <div class="alloc-row">
              <span class="alloc-key">Sectors</span>
              <span class="alloc-val">
                {strategy.resultA.currentAllocation?.sectors.map((i) => i.asset).join(", ") || "—"}
              </span>
            </div>
          </div>
        {:else}
          <p class="empty-hint">FastAPI가 ETF 월봉을 가져와 backtest metrics를 계산합니다.</p>
        {/if}

      <!-- ── Strategy B ─────────────────────────── -->
      {:else if strategy.activeTab === "B"}
        <div class="panel-head">
          <div>
            <span class="panel-eye">MACD/BB · PAIR TRADING</span>
            <h2>Momentum & Cointegration</h2>
          </div>
          <div class="btn-group">
            <button type="button" class="run-btn" onclick={() => void strategy.runMacdBb()} disabled={strategy.loading}>MACD/BB</button>
            <button type="button" class="run-btn" onclick={() => void strategy.runPair()} disabled={strategy.loading}>Pair</button>
          </div>
        </div>

        <div class="input-row">
          <label class="field">
            <span>Pair A</span>
            <input bind:value={strategy.pairA} class="text-input" />
          </label>
          <label class="field">
            <span>Pair B</span>
            <input bind:value={strategy.pairB} class="text-input" />
          </label>
        </div>

        <div class="split-grid">
          <div class="sub-panel">
            <h3 class="sub-title">MACD/BB Signals</h3>
            {#if strategy.macdSignals.length === 0}
              <p class="empty-hint">아직 scan 결과가 없습니다.</p>
            {:else}
              <ul class="data-list">
                {#each strategy.macdSignals.slice(0, 8) as sig}
                  <li class="data-row">
                    <span class="tag" class:tag-buy={sig.direction === "buy"} class:tag-sell={sig.direction === "sell"}>
                      {sig.direction}
                    </span>
                    <span class="data-price">{sig.price.toLocaleString()}</span>
                  </li>
                {/each}
              </ul>
            {/if}
          </div>

          <div class="sub-panel">
            <h3 class="sub-title">Pair Analysis</h3>
            {#if strategy.pairResult}
              <div class="pair-stat">
                <div class="data-row">
                  <span class="data-key">Z-score</span>
                  <strong class="data-val" class:val-pos={strategy.pairResult.currentZScore < -1.5} class:val-neg={strategy.pairResult.currentZScore > 1.5}>
                    {strategy.pairResult.currentZScore.toFixed(3)}
                  </strong>
                </div>
                <div class="data-row">
                  <span class="data-key">Signal</span>
                  <span class="tag" class:tag-buy={strategy.pairSignalColor === "buy"} class:tag-sell={strategy.pairSignalColor === "sell"}>
                    {strategy.pairResult.signal}
                  </span>
                </div>
                <div class="data-row">
                  <span class="data-key">Cointegrated</span>
                  <span class:val-pos={strategy.pairResult.isCointegrated}>{strategy.pairResult.isCointegrated ? "Yes ✓" : "No"}</span>
                </div>
              </div>
            {:else}
              <p class="empty-hint">Pair 버튼으로 z-score를 계산합니다.</p>
            {/if}
          </div>
        </div>

      <!-- ── ORB ────────────────────────────────── -->
      {:else}
        <div class="panel-head">
          <div>
            <span class="panel-eye">OPENING RANGE BREAKOUT</span>
            <h2>Premarket Candidates</h2>
          </div>
          <button type="button" class="run-btn" onclick={() => void strategy.runOrb()} disabled={strategy.loading}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
            </svg>
            스캔
          </button>
        </div>

        <label class="field field--wide">
          <span>Symbols (콤마 구분)</span>
          <input bind:value={strategy.orbSymbols} class="text-input" />
        </label>

        {#if strategy.orbResult}
          <div class="split-grid">
            <div class="sub-panel">
              <h3 class="sub-title">Stocks in Play</h3>
              {#if strategy.orbResult.stocksInPlay.length === 0}
                <p class="empty-hint">조건을 통과한 종목이 없습니다.</p>
              {:else}
                <ul class="data-list">
                  {#each strategy.orbResult.stocksInPlay as stock}
                    <li class="data-row">
                      <span class="sym-name">{stock.symbol}</span>
                      <span class="rvol-badge">{stock.rVol.toFixed(2)}x RVOL</span>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>

            <div class="sub-panel">
              <h3 class="sub-title">ORB Signals</h3>
              {#if strategy.orbResult.signals.length === 0}
                <p class="empty-hint">돌파 signal이 없습니다.</p>
              {:else}
                <ul class="data-list">
                  {#each strategy.orbResult.signals as sig}
                    <li class="data-row">
                      <span>
                        <span class="sym-name">{sig.symbol}</span>
                        <span class="tag" class:tag-buy={sig.direction === "long"} class:tag-sell={sig.direction === "short"}>
                          {sig.direction}
                        </span>
                      </span>
                      <span class="data-price">{sig.entry.toFixed(2)}</span>
                    </li>
                  {/each}
                </ul>
              {/if}
            </div>
          </div>
        {:else}
          <p class="empty-hint">ORB scan은 premarket snapshot과 1분봉 opening range를 backend에서 처리합니다.</p>
        {/if}
      {/if}
    </div>
  </main>
</div>

<style>
  .layout {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 8px;
  }

  .content {
    max-width: 1200px;
    width: 100%;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  }

  /* ── Hero ──────────────────────────────────── */
  .hero {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 20px;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 22px 24px;
    background: var(--surface);
    box-shadow: var(--shadow);
    overflow: hidden;
  }

  .hero__eye {
    font-size: var(--fs-2xs);
    font-weight: 800;
    letter-spacing: 0.12em;
    color: var(--accent);
    text-transform: uppercase;
  }

  .hero__title {
    margin: 6px 0 0;
    font-size: var(--fs-3xl);
    font-weight: 900;
    letter-spacing: -0.04em;
    line-height: 0.9;
  }

  .hero__sub {
    margin: 8px 0 0;
    font-size: var(--fs-sm);
    color: var(--muted);
  }

  .hero__status {
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 4px;
    min-width: 90px;
    padding: 12px 14px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--input);
    transition: border-color var(--dur-fast) var(--ease);
  }

  .hero__status.running {
    border-color: color-mix(in srgb, var(--warning) 60%, var(--line));
  }

  .status-label {
    font-size: var(--fs-2xs);
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .hero__status.running .status-label {
    color: var(--warning);
  }

  .status-tab {
    font-size: var(--fs-2xl);
    font-weight: 800;
    letter-spacing: -0.02em;
    color: var(--text);
    line-height: 1;
  }

  .status-spinner {
    width: 14px;
    height: 14px;
    border: 2px solid color-mix(in srgb, var(--warning) 30%, transparent);
    border-top-color: var(--warning);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Error banner ──────────────────────────── */
  .error-banner {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border: 1px solid var(--danger);
    border-radius: 8px;
    background: var(--danger-soft);
    color: var(--danger);
    font-size: var(--fs-sm);
  }

  /* ── Tab bar ───────────────────────────────── */
  .tab-bar {
    display: flex;
    gap: 6px;
  }

  .tab-item {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 10px 16px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    color: var(--text);
    cursor: pointer;
    text-align: left;
    transition: border-color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
    box-shadow: var(--shadow);
  }

  .tab-item:hover {
    border-color: color-mix(in srgb, var(--accent) 50%, var(--line));
  }

  .tab-item.active {
    border-color: var(--accent);
    background: var(--accent-soft);
  }

  .tab-label {
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--text);
  }

  .tab-item.active .tab-label { color: var(--accent); }

  .tab-sub {
    font-size: var(--fs-xs);
    color: var(--muted);
    white-space: nowrap;
  }

  /* ── Panel ─────────────────────────────────── */
  .panel {
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 20px;
    background: var(--surface);
    box-shadow: var(--shadow);
    flex: 1;
  }

  .panel-head {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    gap: 12px;
    flex-wrap: wrap;
    margin-bottom: 18px;
  }

  .panel-eye {
    font-size: var(--fs-2xs);
    font-weight: 800;
    letter-spacing: 0.1em;
    color: var(--muted);
    text-transform: uppercase;
  }

  .panel-head h2 {
    margin: 4px 0 0;
    font-size: var(--fs-2xl);
    font-weight: 800;
    letter-spacing: -0.03em;
  }

  /* ── Buttons ───────────────────────────────── */
  .run-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 9px 16px;
    border: 1px solid var(--accent);
    border-radius: 8px;
    background: var(--accent-soft);
    color: var(--accent);
    font: inherit;
    font-size: var(--fs-sm);
    font-weight: 600;
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease), opacity var(--dur-fast);
  }

  .run-btn:hover:not(:disabled) {
    background: color-mix(in srgb, var(--accent) 20%, transparent);
  }

  .run-btn:disabled {
    opacity: 0.55;
    cursor: wait;
  }

  .btn-group {
    display: flex;
    gap: 8px;
  }

  .btn-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid color-mix(in srgb, var(--accent) 30%, transparent);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  /* ── Metrics grid ──────────────────────────── */
  .metrics-grid {
    display: grid;
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 16px;
  }

  .metric {
    padding: 14px 16px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--muted-bg);
  }

  .metric__key {
    font-size: var(--fs-xs);
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted);
    display: block;
  }

  .metric__val {
    display: block;
    margin-top: 6px;
    font-size: var(--fs-2xl);
    font-weight: 800;
    letter-spacing: -0.02em;
    font-variant-numeric: tabular-nums;
  }

  .val-pos { color: var(--success); }
  .val-neg { color: var(--danger); }

  /* ── Chart / alloc card ────────────────────── */
  .chart-card {
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
    margin-bottom: 12px;
    background: var(--muted-bg);
  }

  .alloc-card {
    display: flex;
    flex-direction: column;
    gap: 0;
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
    background: var(--muted-bg);
  }

  .alloc-row {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    align-items: center;
    padding: 10px 14px;
    border-bottom: 1px solid var(--line-soft);
    font-size: var(--fs-sm);
  }

  .alloc-row:last-child { border-bottom: none; }

  .alloc-key {
    font-weight: 600;
    color: var(--muted);
    font-size: var(--fs-xs);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    flex-shrink: 0;
  }

  .alloc-val {
    font-size: var(--fs-sm);
    color: var(--text);
    text-align: right;
  }

  /* ── Input fields ──────────────────────────── */
  .input-row {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
    flex-wrap: wrap;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 5px;
    color: var(--muted);
    font-size: var(--fs-xs);
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .field--wide { flex: 1; }
  .field--wide .text-input { width: 100%; }

  .text-input {
    padding: 9px 12px;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: var(--input);
    color: var(--text);
    font: inherit;
    font-size: var(--fs-base);
    min-width: 120px;
    outline: none;
    transition: border-color var(--dur-fast) var(--ease);
  }

  .text-input:focus { border-color: var(--accent); }

  /* ── Split grid ────────────────────────────── */
  .split-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .sub-panel {
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 14px 16px;
    background: var(--muted-bg);
  }

  .sub-title {
    margin: 0 0 10px;
    font-size: var(--fs-sm);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--muted);
  }

  /* ── Data lists ────────────────────────────── */
  .data-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0;
  }

  .data-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 7px 0;
    border-bottom: 1px solid var(--line-soft);
    font-size: var(--fs-sm);
  }

  .data-row:last-child { border-bottom: none; }

  .data-key {
    font-size: var(--fs-xs);
    color: var(--muted);
    font-weight: 600;
  }

  .data-val {
    font-variant-numeric: tabular-nums;
    font-weight: 700;
  }

  .data-price {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--text);
  }

  .sym-name {
    font-weight: 700;
    color: var(--text);
  }

  .pair-stat {
    display: flex;
    flex-direction: column;
  }

  /* ── Tags / badges ─────────────────────────── */
  .tag {
    display: inline-flex;
    align-items: center;
    height: 18px;
    padding: 0 7px;
    border-radius: 3px;
    font-size: var(--fs-2xs);
    font-weight: 800;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    background: color-mix(in srgb, var(--muted) 15%, transparent);
    color: var(--muted);
  }

  .tag-buy  { background: rgba(11, 218, 94, 0.15);  color: var(--success); }
  .tag-sell { background: rgba(250, 98, 56, 0.15);  color: var(--danger); }

  .rvol-badge {
    font-size: var(--fs-xs);
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    background: var(--accent-soft);
    color: var(--accent);
  }

  .empty-hint {
    padding: 20px 0 4px;
    font-size: var(--fs-sm);
    color: var(--muted);
    margin: 0;
  }

  /* ── Responsive ────────────────────────────── */
  @media (max-width: 780px) {
    .hero { flex-wrap: wrap; }
    .hero__title { font-size: var(--fs-2xl); }
    .metrics-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .split-grid { grid-template-columns: 1fr; }
    .tab-bar { flex-wrap: wrap; }
  }
</style>
