<script lang="ts">
  let {
    width = "100%",
    height = "16px",
    radius = "var(--radius-sm)",
    class: className = "",
  }: {
    width?: string;
    height?: string;
    radius?: string;
    class?: string;
  } = $props();
</script>

<span
  class="skeleton {className}"
  style="width:{width};height:{height};border-radius:{radius}"
  aria-hidden="true"
></span>

<style>
  .skeleton {
    display: block;
    background: linear-gradient(
      90deg,
      var(--border) 25%,
      color-mix(in srgb, var(--border) 55%, var(--card)) 50%,
      var(--border) 75%
    );
    background-size: 200% 100%;
    animation: shimmer 1.4s ease infinite;
  }
  @keyframes shimmer {
    from { background-position: 200% 0; }
    to   { background-position: -200% 0; }
  }
</style>
