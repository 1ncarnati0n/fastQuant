<script lang="ts">
  let {
    vertical = false,
    class: className = "",
  }: {
    vertical?: boolean;
    class?: string;
  } = $props();
</script>

<hr class="divider {vertical ? 'divider--v' : ''} {className}" />

<style>
  .divider {
    border: none;
    background: var(--border);
    margin: 0;
    flex-shrink: 0;
  }

  .divider:not(.divider--v) {
    width: 100%;
    height: 1px;
  }

  .divider--v {
    width: 1px;
    height: 100%;
    align-self: stretch;
  }
</style>
