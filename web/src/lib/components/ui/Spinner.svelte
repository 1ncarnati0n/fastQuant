<script lang="ts">
  let {
    size = "md",
    class: className = "",
  }: {
    size?: "sm" | "md" | "lg";
    class?: string;
  } = $props();

  const sizeMap: Record<string, number> = { sm: 16, md: 24, lg: 36 };
  const px = $derived(sizeMap[size] ?? 24);
</script>

<span
  class="spinner {className}"
  style="width:{px}px;height:{px}px"
  role="status"
  aria-label="로딩 중"
></span>

<style>
  .spinner {
    display: inline-block;
    border: 2px solid var(--border);
    border-top-color: var(--primary);
    border-radius: var(--radius-full);
    animation: spin 0.65s linear infinite;
    flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
