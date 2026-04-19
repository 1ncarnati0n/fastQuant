<script lang="ts">
  import { Dialog as Dlg } from "bits-ui";
  import type { Snippet } from "svelte";

  let {
    open = $bindable(false),
    title,
    description,
    size = "md",
    padding = "lg",
    children,
  }: {
    open?: boolean;
    title?: string;
    description?: string;
    size?: "sm" | "md" | "lg" | "xl";
    padding?: "none" | "md" | "lg";
    children: Snippet;
  } = $props();
</script>

<Dlg.Root bind:open>
  <Dlg.Portal>
    <Dlg.Overlay class="dlg-overlay" />
    <Dlg.Content class="dlg-content dlg-size-{size} dlg-pad-{padding}">
      {#if title}
        <div class="dlg-head">
          <Dlg.Title class="dlg-title">{title}</Dlg.Title>
          <Dlg.Close class="dlg-close" aria-label="닫기">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </Dlg.Close>
        </div>
        {#if description}
          <Dlg.Description class="dlg-desc">{description}</Dlg.Description>
        {/if}
      {/if}
      <div class="dlg-body">
        {@render children()}
      </div>
    </Dlg.Content>
  </Dlg.Portal>
</Dlg.Root>

<style>
  :global(.dlg-overlay) {
    position: fixed;
    inset: 0;
    z-index: 60;
    background: color-mix(in srgb, #000 44%, transparent);
    backdrop-filter: blur(2px);
    animation: dlg-fade 160ms var(--ease);
  }

  :global(.dlg-content) {
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 61;
    width: min(calc(100% - 2rem), 500px);
    max-height: min(calc(100vh - 4rem), 720px);
    display: flex;
    flex-direction: column;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow-elevated);
    outline: none;
    overflow: hidden;
    animation: dlg-scale 200ms var(--ease);
  }

  :global(.dlg-size-sm)  { width: min(calc(100% - 2rem), 360px); }
  :global(.dlg-size-md)  { width: min(calc(100% - 2rem), 500px); }
  :global(.dlg-size-lg)  { width: min(calc(100% - 2rem), 640px); }
  :global(.dlg-size-xl)  { width: min(calc(100% - 2rem), 1120px); }

  :global(.dlg-pad-none .dlg-body) { padding: 0; }
  :global(.dlg-pad-md   .dlg-body) { padding: 14px 16px 16px; }
  :global(.dlg-pad-lg   .dlg-body) { padding: 18px 22px 22px; }

  :global(.dlg-head) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 14px 18px 10px;
    border-bottom: 1px solid var(--line-soft);
  }

  :global(.dlg-title) {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text);
  }

  :global(.dlg-desc) {
    margin: 0;
    padding: 4px 18px 0;
    font-size: var(--fs-sm);
    color: var(--muted);
  }

  :global(.dlg-close) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    transition: color var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);
  }

  :global(.dlg-close:hover) {
    color: var(--text);
    border-color: var(--line);
  }

  :global(.dlg-body) {
    min-height: 0;
    overflow: auto;
  }

  @keyframes dlg-fade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }

  @keyframes dlg-scale {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
</style>
