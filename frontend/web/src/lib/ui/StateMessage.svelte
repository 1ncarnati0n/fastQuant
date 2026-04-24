<script lang="ts" module>
  export type StateMessageKind = "loading" | "empty" | "error";
</script>

<script lang="ts">
  let {
    kind = "empty",
    message,
    compact = false,
  }: {
    kind?: StateMessageKind;
    message: string;
    compact?: boolean;
  } = $props();
</script>

<div class="state-message state-message--{kind}" class:state-message--compact={compact} role={kind === "error" ? "alert" : "status"}>
  {#if kind === "loading"}
    <span class="state-message__spinner" aria-hidden="true"></span>
  {:else if kind === "error"}
    <svg class="state-message__icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  {/if}
  <span>{message}</span>
</div>

<style>
  .state-message {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    min-height: 96px;
    padding: 22px 14px;
    color: var(--muted);
    font-size: var(--fs-sm);
    line-height: 1.45;
    text-align: center;
  }

  .state-message--compact {
    min-height: 44px;
    padding: 10px 8px;
  }

  .state-message--error {
    color: var(--danger);
  }

  .state-message__spinner {
    width: 16px;
    height: 16px;
    border: 2px solid var(--line);
    border-top-color: var(--accent);
    border-radius: 50%;
    flex-shrink: 0;
    animation: state-message-spin 0.7s linear infinite;
  }

  .state-message__icon {
    flex-shrink: 0;
  }

  @keyframes state-message-spin {
    to { transform: rotate(360deg); }
  }
</style>
