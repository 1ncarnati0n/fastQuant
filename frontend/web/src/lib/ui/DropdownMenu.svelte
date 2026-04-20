<script lang="ts">
  import { DropdownMenu as Dropdown } from "bits-ui";
  import type { Snippet } from "svelte";

  export interface DropdownItem {
    key: string;
    label: string;
    active?: boolean;
    disabled?: boolean;
    onSelect: () => void;
  }

  let {
    items,
    align = "start",
    sideOffset = 8,
    contentClass = "",
    triggerAriaLabel,
    triggerTitle,
    trigger,
  }: {
    items: DropdownItem[];
    align?: "start" | "center" | "end";
    sideOffset?: number;
    contentClass?: string;
    triggerAriaLabel?: string;
    triggerTitle?: string;
    trigger: Snippet<[{ isOpen: boolean }]>;
  } = $props();

  let open = $state(false);
</script>

<Dropdown.Root bind:open>
  <Dropdown.Trigger>
    {#snippet child({ props })}
      <button
        {...props}
        class="dd-trigger"
        type="button"
        aria-label={triggerAriaLabel}
        title={triggerTitle}
      >
        {@render trigger({ isOpen: open })}
      </button>
    {/snippet}
  </Dropdown.Trigger>

  <Dropdown.Portal>
    <Dropdown.Content {align} {sideOffset} class="dd-content {contentClass}">
      {#each items as item (item.key)}
        <Dropdown.Item
          disabled={item.disabled}
          onSelect={item.onSelect}
          class="dd-item {item.active ? 'is-active' : ''}"
        >
          <span>{item.label}</span>
          {#if item.active}
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          {/if}
        </Dropdown.Item>
      {/each}
    </Dropdown.Content>
  </Dropdown.Portal>
</Dropdown.Root>

<style>
  .dd-trigger {
    all: unset;
    display: inline-flex;
  }

  :global(.dd-content) {
    z-index: 50;
    min-width: 140px;
    padding: 4px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-elevated);
    outline: none;
    animation: dd-in 140ms var(--ease);
  }

  :global(.dd-item) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 7px 9px;
    border-radius: 6px;
    background: transparent;
    color: var(--text);
    font-size: var(--fs-sm);
    cursor: pointer;
    outline: none;
    transition: background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease);
  }

  :global(.dd-item[data-highlighted]),
  :global(.dd-item:hover) {
    background: color-mix(in srgb, var(--text) 8%, transparent);
  }

  :global(.dd-item.is-active) {
    color: var(--accent);
    font-weight: 600;
    background: var(--accent-soft);
  }

  :global(.dd-item[data-disabled]) {
    opacity: 0.45;
    pointer-events: none;
  }

  @keyframes dd-in {
    from { opacity: 0; transform: translateY(-3px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
