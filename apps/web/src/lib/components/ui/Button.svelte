<script lang="ts">
  import type { Snippet } from "svelte";

  let {
    variant = "primary",
    size = "md",
    disabled = false,
    loading = false,
    type = "button",
    onclick,
    children,
    class: className = "",
  }: {
    variant?: "primary" | "secondary" | "ghost" | "danger";
    size?: "sm" | "md" | "lg";
    disabled?: boolean;
    loading?: boolean;
    type?: "button" | "submit" | "reset";
    onclick?: (e: MouseEvent) => void;
    children?: Snippet;
    class?: string;
  } = $props();
</script>

<button
  {type}
  {disabled}
  aria-busy={loading}
  class="btn btn--{variant} btn--{size} {className}"
  onclick={onclick}
>
  {#if loading}
    <span class="btn__spinner" aria-hidden="true"></span>
  {/if}
  {@render children?.()}
</button>

<style>
  .btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    font-weight: 600;
    border: none;
    border-radius: var(--radius-md);
    cursor: pointer;
    transition: background var(--dur-fast) var(--ease),
                opacity var(--dur-fast) var(--ease),
                transform var(--dur-fast) var(--ease);
    white-space: nowrap;
    user-select: none;
  }

  .btn:active:not(:disabled) { transform: scale(0.97); }
  .btn:disabled { opacity: 0.45; cursor: not-allowed; }

  /* Sizes */
  .btn--sm { height: 32px; padding: 0 12px; font-size: 13px; border-radius: var(--radius-sm); }
  .btn--md { height: 40px; padding: 0 16px; font-size: 14px; }
  .btn--lg { height: 48px; padding: 0 22px; font-size: 16px; border-radius: var(--radius-lg); }

  /* Variants */
  .btn--primary {
    background: var(--primary);
    color: var(--primary-fore);
  }
  .btn--primary:hover:not(:disabled) { background: color-mix(in srgb, var(--primary) 88%, #000); }

  .btn--secondary {
    background: var(--muted-bg);
    color: var(--foreground);
    border: 1px solid var(--border);
  }
  .btn--secondary:hover:not(:disabled) { background: var(--border); }

  .btn--ghost {
    background: transparent;
    color: var(--muted-fore);
  }
  .btn--ghost:hover:not(:disabled) {
    background: var(--muted-bg);
    color: var(--foreground);
  }

  .btn--danger {
    background: var(--destructive-soft);
    color: var(--destructive);
  }
  .btn--danger:hover:not(:disabled) {
    background: color-mix(in srgb, var(--destructive) 18%, transparent);
  }

  /* Spinner */
  .btn__spinner {
    width: 14px;
    height: 14px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: var(--radius-full);
    animation: spin 0.6s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
