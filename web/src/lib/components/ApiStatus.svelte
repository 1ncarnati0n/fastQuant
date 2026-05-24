<script lang="ts">
  import { onMount } from "svelte";
  import { fetchHealth } from "$lib/api/client";

  let { compact = false }: { compact?: boolean } = $props();

  let status = $state<"checking" | "ok" | "offline">("checking");
  let detail = $state("FastAPI 연결 확인 중");

  onMount(async () => {
    try {
      const res = await fetchHealth();
      status = res.status === "ok" ? "ok" : "offline";
      detail = res.service ?? res.status;
    } catch (err) {
      status = "offline";
      detail = err instanceof Error ? err.message : "연결 실패";
    }
  });
</script>

<div class="api-status" class:compact class:ok={status === "ok"} class:offline={status === "offline"} role="status" aria-label="API 연결 상태">
  <span class="dot" aria-hidden="true"></span>
  {#if compact}
    <span class="label">{status === "checking" ? "..." : status}</span>
  {:else}
    <div class="copy">
      <strong class="status-text">{status}</strong>
      <span class="detail-text">{detail}</span>
    </div>
  {/if}
</div>

<style>
  .api-status {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    padding: 6px 10px;
    border: 1px solid var(--line);
    border-radius: 7px;
    background: var(--input);
    font-size: var(--fs-sm);
    transition: border-color var(--dur-fast) var(--ease);
  }

  .api-status.ok     { border-color: color-mix(in srgb, var(--success) 40%, var(--line)); }
  .api-status.offline { border-color: color-mix(in srgb, var(--danger) 40%, var(--line)); }

  .dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--muted);
    flex-shrink: 0;
    transition: background var(--dur-fast) var(--ease);
  }

  .ok .dot    { background: var(--success); box-shadow: 0 0 5px color-mix(in srgb, var(--success) 55%, transparent); }
  .offline .dot { background: var(--danger); }

  /* checking: pulse */
  .api-status:not(.ok):not(.offline) .dot {
    animation: pulse-dot 1.4s ease-in-out infinite;
  }

  @keyframes pulse-dot {
    0%, 100% { opacity: 0.4; }
    50%       { opacity: 1; }
  }

  .label {
    font-size: var(--fs-xs);
    font-weight: 700;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: var(--muted);
  }

  .ok .label    { color: var(--success); }
  .offline .label { color: var(--danger); }

  .copy {
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  .status-text {
    font-size: var(--fs-sm);
    font-weight: 700;
    color: var(--text);
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }

  .detail-text {
    font-size: var(--fs-xs);
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 180px;
  }

  /* Compact mode is default when used in TopBar */
  .compact {
    padding: 5px 9px;
    gap: 5px;
  }
</style>
