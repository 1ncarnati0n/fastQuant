<script lang="ts" module>
  export interface TabItem {
    key: string;
    label: string;
    hint?: string;
    disabled?: boolean;
  }
</script>

<script lang="ts">
  import { Tabs as T } from "bits-ui";
  import type { Snippet } from "svelte";

  let {
    items,
    value = $bindable(),
    orientation = "horizontal",
    panel,
  }: {
    items: TabItem[];
    value?: string;
    orientation?: "horizontal" | "vertical";
    panel: Snippet<[{ active: string }]>;
  } = $props();

  // Initialize to first non-disabled key once items are available
  $effect(() => {
    if (value === undefined || value === "") {
      value = items.find((i) => !i.disabled)?.key ?? items[0]?.key ?? "";
    }
  });
</script>

<T.Root bind:value {orientation} class="tabs tabs--{orientation}">
  <T.List class="tabs-list">
    {#each items as item (item.key)}
      <T.Trigger
        value={item.key}
        disabled={item.disabled}
        class="tabs-trigger"
      >
        <span class="tabs-trigger__label">{item.label}</span>
        {#if item.hint}
          <span class="tabs-trigger__hint">{item.hint}</span>
        {/if}
      </T.Trigger>
    {/each}
  </T.List>

  <div class="tabs-panel">
    {@render panel({ active: value ?? "" })}
  </div>
</T.Root>

<style>
  :global(.tabs) {
    display: flex;
    min-height: 0;
    height: 100%;
  }

  :global(.tabs--horizontal) { flex-direction: column; }
  :global(.tabs--vertical)   { flex-direction: row; }

  :global(.tabs--horizontal .tabs-list) {
    display: flex;
    gap: 2px;
    padding: 6px;
    border-bottom: 1px solid var(--line-soft);
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    flex-shrink: 0;
  }

  :global(.tabs--vertical .tabs-list) {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
    border-right: 1px solid var(--line-soft);
    background: color-mix(in srgb, var(--surface) 92%, transparent);
    width: 180px;
    flex-shrink: 0;
    overflow-y: auto;
  }

  :global(.tabs-trigger) {
    all: unset;
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 7px 12px;
    border: 1px solid transparent;
    border-radius: 6px;
    color: var(--muted);
    font-size: var(--fs-sm);
    font-weight: 500;
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }

  :global(.tabs-trigger:hover:not([data-disabled])) {
    color: var(--text);
    background: color-mix(in srgb, var(--text) 6%, transparent);
  }

  :global(.tabs-trigger[data-state="active"]) {
    border-color: color-mix(in srgb, var(--accent) 45%, transparent);
    background: var(--accent-soft);
    color: var(--accent);
    font-weight: 600;
  }

  :global(.tabs-trigger[data-disabled]) {
    opacity: 0.45;
    cursor: not-allowed;
  }

  :global(.tabs-trigger__label) {
    line-height: 1.2;
  }

  :global(.tabs-trigger__hint) {
    font-size: var(--fs-2xs);
    font-weight: 500;
    color: inherit;
    opacity: 0.7;
  }

  :global(.tabs-panel) {
    flex: 1;
    min-height: 0;
    min-width: 0;
    overflow: auto;
  }
</style>
