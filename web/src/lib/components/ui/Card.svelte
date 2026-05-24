<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    padding = "md",
    shadow = true,
    class: className = "",
    children,
  }: {
    padding?: "none" | "sm" | "md" | "lg";
    shadow?: boolean;
    class?: string;
    children?: Snippet;
  } = $props();
</script>

<div class="card card--pad-{padding} {shadow ? 'card--shadow' : ''} {className}">
  {@render children?.()}
</div>

<style>
  .card {
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
  }

  .card--shadow { box-shadow: var(--shadow-sm); }

  .card--pad-none  { padding: 0; }
  .card--pad-sm    { padding: 12px; }
  .card--pad-md    { padding: 16px; }
  .card--pad-lg    { padding: 24px; }
</style>
