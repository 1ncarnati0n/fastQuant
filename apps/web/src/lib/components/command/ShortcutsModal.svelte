<script lang="ts">
  import Dialog from "$lib/ui/Dialog.svelte";
  import { SHORTCUT_HELP_GROUPS } from "$lib/utils/shortcuts";

  let { open = $bindable(false) }: { open?: boolean } = $props();
</script>

<Dialog bind:open title="키보드 단축키" padding="none" size="md">
  <div class="groups">
    {#each SHORTCUT_HELP_GROUPS as group, i (group.title)}
      {#if i > 0}<div class="divider" aria-hidden="true"></div>{/if}
      <section class="group">
        <h3 class="group-title">{group.title}</h3>
        <ul class="rows" role="list">
          {#each group.items as item (item.id)}
            <li class="row">
              <span class="desc">{item.desc}</span>
              <span class="keys">
                {#each item.keys as k, ki}
                  {#if ki > 0}<span class="plus" aria-hidden="true">+</span>{/if}
                  <kbd class="kbd">{k}</kbd>
                {/each}
              </span>
            </li>
          {/each}
        </ul>
      </section>
    {/each}
  </div>
</Dialog>

<style>
  .groups {
    padding: 14px 18px 18px;
  }

  .group + .group { margin-top: 12px; }

  .divider {
    height: 1px;
    background: var(--line-soft);
    margin: 14px -2px;
  }

  .group-title {
    margin: 0 0 6px;
    font-size: var(--fs-2xs);
    font-weight: 800;
    letter-spacing: 0.09em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .rows {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 5px 0;
  }

  .desc {
    font-size: var(--fs-base);
    color: var(--text);
  }

  .keys {
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }

  .kbd {
    display: inline-flex;
    align-items: center;
    min-width: 22px;
    height: 22px;
    padding: 0 6px;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: var(--input);
    color: var(--text);
    font-family: ui-monospace, "SF Mono", "JetBrains Mono", "Menlo", monospace;
    font-size: var(--fs-xs);
    line-height: 1;
  }

  .plus {
    color: var(--muted);
    font-size: var(--fs-xs);
  }
</style>
