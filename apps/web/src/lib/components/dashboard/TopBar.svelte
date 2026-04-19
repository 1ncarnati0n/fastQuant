<script lang="ts">
  import ApiStatus from "$lib/components/ApiStatus.svelte";
  import type { DockTab } from "$lib/stores/workspace.svelte";
  import { workspace } from "$lib/stores/workspace.svelte";
  import { page } from "$app/stores";

  const currentPath = $derived($page.url.pathname);

  let {
    activeDockTab = "watchlist" as DockTab,
    isDockOpen = false,
    onOpenDockTab = () => {},
    hideDockButtons = false,
    indicatorCount = 0,
    onOpenSettings = () => {},
  }: {
    activeDockTab?: DockTab;
    isDockOpen?: boolean;
    onOpenDockTab?: (tab: DockTab) => void;
    hideDockButtons?: boolean;
    indicatorCount?: number;
    onOpenSettings?: () => void;
  } = $props();

  const isDark = $derived(workspace.theme === "dark");
</script>

<header class="topbar">
  <div class="topbar__left">
    <a class="brand" href="/" aria-label="fastQuant 홈">
      <svg class="brand__icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </svg>
      <span class="brand__name">fastQuant</span>
    </a>
  </div>

  <nav class="topbar__center" aria-label="Primary">
    <a class:active={currentPath.startsWith("/dashboard")} href="/dashboard">Dashboard</a>
    <a class:active={currentPath.startsWith("/strategy")} href="/strategy">Strategy Lab</a>
  </nav>

  <div class="topbar__right">
    <ApiStatus compact />

    {#if !hideDockButtons}
    <div class="icon-group" role="group" aria-label="패널 전환">
      <button
        type="button"
        class="icon-btn"
        class:active={isDockOpen && activeDockTab === "watchlist"}
        onclick={() => onOpenDockTab("watchlist")}
        aria-label="관심종목 패널"
        title="관심종목"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      </button>

      <button
        type="button"
        class="icon-btn icon-btn--has-badge"
        class:active={isDockOpen && activeDockTab === "indicators"}
        onclick={() => onOpenDockTab("indicators")}
        aria-label="지표 패널{indicatorCount > 0 ? `, ${indicatorCount}개 활성` : ''}"
        title="지표"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19h16M7 16V9M12 16V5M17 16v-6" />
        </svg>
        {#if indicatorCount > 0}
          <span class="icon-btn__badge" aria-hidden="true">{indicatorCount}</span>
        {/if}
      </button>

      <button
        type="button"
        class="icon-btn"
        class:active={isDockOpen && activeDockTab === "fundamentals"}
        onclick={() => onOpenDockTab("fundamentals")}
        aria-label="펀더멘털 패널"
        title="펀더멘털"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 3v18h18" />
          <path d="M18 17V9M13 17V5M8 17v-4" />
        </svg>
      </button>
    </div>
    {/if}

    <button
      type="button"
      class="icon-btn theme-btn"
      onclick={() => workspace.toggleTheme()}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={isDark ? "라이트 모드" : "다크 모드"}
    >
      {#if isDark}
        <!-- Sun icon -->
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5" />
          <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      {:else}
        <!-- Moon icon -->
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      {/if}
    </button>

    <button
      type="button"
      class="icon-btn theme-btn"
      onclick={onOpenSettings}
      aria-label="전역 설정"
      title="전역 설정"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .92 1.7 1.7 0 0 1-3.2 0 1.7 1.7 0 0 0-1-.92 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.92-1 1.7 1.7 0 0 1 0-3.2 1.7 1.7 0 0 0 .92-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.92 1.7 1.7 0 0 1 3.2 0 1.7 1.7 0 0 0 1 .92 1.7 1.7 0 0 0 1.87-.34l.06.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.24.39.57.7.96.89a1.7 1.7 0 0 1 0 3.2c-.39.19-.72.5-.96.91Z" />
      </svg>
    </button>
  </div>
</header>

<style>
  .topbar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 0 12px;
    height: 44px;
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    backdrop-filter: blur(16px);
    box-shadow: var(--shadow);
  }

  .brand {
    display: flex;
    align-items: center;
    gap: 7px;
    text-decoration: none;
    color: var(--text);
  }

  .brand__icon {
    color: var(--accent);
    flex-shrink: 0;
  }

  .brand__name {
    font-size: var(--fs-base);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .topbar__center {
    display: flex;
    gap: 2px;
    justify-content: center;
  }

  .topbar__center a {
    border: 1px solid transparent;
    border-radius: 6px;
    padding: 5px 10px;
    text-decoration: none;
    color: var(--muted);
    font-size: var(--fs-sm);
    font-weight: 500;
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }

  .topbar__center a:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--text) 7%, transparent);
  }

  .topbar__center a.active {
    color: var(--text);
    border-color: var(--line);
    background: color-mix(in srgb, var(--text) 5%, transparent);
    font-weight: 600;
  }

  .topbar__right {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .icon-group {
    display: flex;
    gap: 1px;
    padding: 2px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--input);
  }

  .icon-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }

  .icon-btn:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--text) 9%, transparent);
  }

  .icon-btn.active {
    border-color: color-mix(in srgb, var(--accent) 60%, transparent);
    background: var(--accent-soft);
    color: var(--accent);
  }

  .icon-btn--has-badge { position: relative; }

  .icon-btn__badge {
    position: absolute;
    top: -3px;
    right: -3px;
    min-width: 16px;
    height: 16px;
    padding: 0 4px;
    border-radius: 999px;
    background: var(--accent);
    color: var(--primary-fore);
    font-size: var(--fs-2xs);
    font-weight: 800;
    line-height: 1;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 0 0 2px var(--input);
    pointer-events: none;
  }

  .theme-btn {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--input);
    width: 34px;
    height: 34px;
  }

  .theme-btn:hover {
    border-color: color-mix(in srgb, var(--accent) 50%, var(--line));
    background: var(--accent-soft);
    color: var(--accent);
  }
</style>
