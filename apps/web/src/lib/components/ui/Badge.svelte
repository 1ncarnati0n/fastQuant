<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    variant = "neutral",
    size = "sm",
    children,
    class: className = "",
  }: {
    variant?: "up" | "down" | "neutral" | "primary" | "warning";
    size?: "xs" | "sm" | "md";
    children?: Snippet;
    class?: string;
  } = $props();
</script>

<span class="badge badge--{variant} badge--{size} {className}">
  {@render children?.()}
</span>

<style>
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    font-weight: 600;
    border-radius: var(--radius-sm);
  }

  .badge--xs { font-size: 11px; padding: 1px 5px; }
  .badge--sm { font-size: 12px; padding: 2px 7px; }
  .badge--md { font-size: 13px; padding: 3px 9px; }

  .badge--up      { background: var(--destructive-soft); color: var(--destructive); }
  .badge--down    { background: var(--primary-soft);     color: var(--primary); }
  .badge--neutral { background: var(--muted-bg);         color: var(--muted-fore); }
  .badge--primary { background: var(--primary-soft);     color: var(--primary); }
  .badge--warning { background: var(--warning-soft);     color: var(--warning); }
</style>
