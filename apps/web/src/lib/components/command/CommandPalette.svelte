<script lang="ts" module>
  export interface CommandEntry {
    id: string;
    title: string;
    hint?: string;
    group: string;
    keywords?: string;
    shortcut?: string[];
    run: () => void;
  }
</script>

<script lang="ts">
  import Dialog from "$lib/ui/Dialog.svelte";
  import { tick } from "svelte";

  let {
    open = $bindable(false),
    commands,
  }: {
    open?: boolean;
    commands: CommandEntry[];
  } = $props();

  let query = $state("");
  let highlightIdx = $state(0);
  let inputEl: HTMLInputElement | null = null;

  const normalized = $derived(query.trim().toLowerCase());

  const filtered = $derived.by(() => {
    if (!normalized) return commands;
    return commands.filter((c) => {
      const hay = `${c.title} ${c.hint ?? ""} ${c.group} ${c.keywords ?? ""}`.toLowerCase();
      return hay.includes(normalized);
    });
  });

  // Group filtered entries keeping source order
  const grouped = $derived.by(() => {
    const map = new Map<string, CommandEntry[]>();
    for (const c of filtered) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return Array.from(map.entries());
  });

  // Flat order matches render order so highlightIdx maps to DOM
  const flat = $derived(grouped.flatMap(([, items]) => items));

  $effect(() => {
    // Reset highlight when list shrinks or query changes
    if (highlightIdx >= flat.length) highlightIdx = 0;
  });

  $effect(() => {
    if (open) {
      query = "";
      highlightIdx = 0;
      tick().then(() => inputEl?.focus());
    }
  });

  function runCommand(entry: CommandEntry) {
    entry.run();
    open = false;
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (flat.length > 0) highlightIdx = (highlightIdx + 1) % flat.length;
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (flat.length > 0) highlightIdx = (highlightIdx - 1 + flat.length) % flat.length;
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = flat[highlightIdx];
      if (entry) runCommand(entry);
    }
  }
</script>

<Dialog bind:open title="명령 팔레트" padding="none" size="lg">
  <div class="cp">
    <div class="search">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <input
        bind:this={inputEl}
        bind:value={query}
        type="text"
        class="search__input"
        placeholder="명령 또는 심볼 검색…"
        onkeydown={onKey}
        autocomplete="off"
        spellcheck="false"
      />
      <kbd class="hint">ESC</kbd>
    </div>

    <div class="list" role="listbox">
      {#if flat.length === 0}
        <div class="empty">일치하는 항목이 없습니다.</div>
      {:else}
        {#each grouped as [groupTitle, items] (groupTitle)}
          <div class="group-label">{groupTitle}</div>
          {#each items as cmd (cmd.id)}
            {@const idx = flat.indexOf(cmd)}
            <button
              type="button"
              role="option"
              aria-selected={idx === highlightIdx}
              class="item"
              class:is-highlight={idx === highlightIdx}
              onmouseenter={() => (highlightIdx = idx)}
              onclick={() => runCommand(cmd)}
            >
              <span class="item__main">
                <span class="item__title">{cmd.title}</span>
                {#if cmd.hint}
                  <span class="item__hint">{cmd.hint}</span>
                {/if}
              </span>
              {#if cmd.shortcut}
                <span class="item__keys">
                  {#each cmd.shortcut as k}<kbd class="kbd">{k}</kbd>{/each}
                </span>
              {/if}
            </button>
          {/each}
        {/each}
      {/if}
    </div>
  </div>
</Dialog>

<style>
  .cp { display: flex; flex-direction: column; }

  .search {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 12px 16px;
    border-bottom: 1px solid var(--line-soft);
    color: var(--muted);
  }

  .search__input {
    flex: 1;
    border: none;
    outline: none;
    background: transparent;
    color: var(--text);
    font: inherit;
    font-size: var(--fs-md);
    letter-spacing: -0.01em;
  }

  .search__input::placeholder { color: var(--muted); }

  .hint {
    font-family: ui-monospace, "SF Mono", monospace;
    font-size: var(--fs-2xs);
    padding: 2px 6px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: var(--input);
    color: var(--muted);
    line-height: 1;
  }

  .list {
    max-height: 420px;
    overflow-y: auto;
    padding: 6px;
  }

  .group-label {
    padding: 8px 10px 4px;
    font-size: var(--fs-2xs);
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 8px 10px;
    border: 1px solid transparent;
    border-radius: 7px;
    background: transparent;
    color: var(--text);
    font: inherit;
    cursor: pointer;
    text-align: left;
    transition: background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }

  .item.is-highlight {
    background: var(--accent-soft);
    border-color: color-mix(in srgb, var(--accent) 35%, transparent);
  }

  .item__main {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .item__title {
    font-size: var(--fs-base);
    font-weight: 600;
    color: var(--text);
  }

  .item.is-highlight .item__title { color: var(--accent); }

  .item__hint {
    font-size: var(--fs-xs);
    color: var(--muted);
  }

  .item__keys {
    display: inline-flex;
    gap: 3px;
    flex-shrink: 0;
  }

  .kbd {
    display: inline-flex;
    align-items: center;
    padding: 0 6px;
    height: 20px;
    border: 1px solid var(--line);
    border-radius: 4px;
    background: var(--input);
    color: var(--muted);
    font-family: ui-monospace, "SF Mono", monospace;
    font-size: var(--fs-2xs);
    line-height: 1;
  }

  .empty {
    padding: 28px 16px;
    text-align: center;
    color: var(--muted);
    font-size: var(--fs-base);
  }
</style>
