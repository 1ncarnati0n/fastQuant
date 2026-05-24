<script lang="ts">
  import { indicatorVisibility } from "$lib/stores/indicatorVisibility.svelte";

  let {
    indicatorKey,
    label,
  }: {
    indicatorKey: string;
    label: string;
  } = $props();

  const isHidden = $derived(indicatorVisibility.hidden.has(indicatorKey));
</script>

<button
  type="button"
  class="visibility-toggle"
  class:is-hidden={isHidden}
  onclick={() => indicatorVisibility.toggle(indicatorKey)}
  aria-label={isHidden ? `${label} 표시` : `${label} 숨김`}
  title={isHidden ? "표시" : "숨김"}
>
  {#if isHidden}
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M3 3l18 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
      <path d="M10.6 5.2A10 10 0 0 1 12 5c6 0 9.5 7 9.5 7a16 16 0 0 1-2.6 3.2" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M6.7 6.7C4 8.4 2.5 12 2.5 12S6 19 12 19c1.5 0 2.8-.4 4-.9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M10.1 10.1a2.7 2.7 0 0 0 3.8 3.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
    </svg>
  {:else}
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="12" cy="12" r="2.7" stroke="currentColor" stroke-width="1.8" />
    </svg>
  {/if}
</button>

<style>
  .visibility-toggle {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 18px;
    height: 18px;
    padding: 0;
    border: none;
    background: transparent;
    color: var(--muted);
    border-radius: 4px;
    cursor: pointer;
    flex-shrink: 0;
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease);
  }

  .visibility-toggle:hover {
    color: var(--accent);
    background: color-mix(in srgb, var(--accent) 14%, transparent);
  }

  .visibility-toggle.is-hidden {
    color: color-mix(in srgb, var(--muted) 75%, transparent);
  }
</style>
