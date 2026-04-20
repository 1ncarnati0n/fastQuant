<script lang="ts">
  import { Dialog as Dlg } from "bits-ui";
  import type { Snippet } from "svelte";

  let {
    open = $bindable(false),
    title,
    description,
    size = "md",
    padding = "lg",
    draggable = true,
    children,
  }: {
    open?: boolean;
    title?: string;
    description?: string;
    size?: "sm" | "md" | "lg" | "xl";
    padding?: "none" | "md" | "lg";
    draggable?: boolean;
    children: Snippet;
  } = $props();

  // Floating position (null = centered via CSS)
  let pos = $state<{ x: number; y: number } | null>(null);
  let contentEl = $state<HTMLElement | null>(null);
  let dragging = $state(false);

  function onHeaderPointerDown(ev: PointerEvent) {
    if (!draggable || !contentEl) return;
    const target = ev.target as HTMLElement | null;
    if (target?.closest("[data-no-drag]")) return;
    if (ev.button !== 0) return;

    const rect = contentEl.getBoundingClientRect();
    const offX = ev.clientX - rect.left;
    const offY = ev.clientY - rect.top;

    // Lock to current pixel position — removes centering transform without a jump.
    pos = { x: rect.left, y: rect.top };
    dragging = true;

    // Listen on document at capture phase so bits-ui's focus/outside-click
    // handlers can't stop propagation before we see pointerup.
    const onMove = (e: PointerEvent) => {
      const maxX = Math.max(0, window.innerWidth  - (contentEl?.offsetWidth  ?? 0));
      const maxY = Math.max(0, window.innerHeight - (contentEl?.offsetHeight ?? 0));
      pos = {
        x: Math.min(Math.max(0, e.clientX - offX), maxX),
        y: Math.min(Math.max(0, e.clientY - offY), maxY),
      };
    };
    const endDrag = () => {
      dragging = false;
      document.removeEventListener("pointermove", onMove, true);
      document.removeEventListener("pointerup", endDrag, true);
      document.removeEventListener("pointercancel", endDrag, true);
      window.removeEventListener("blur", endDrag);
    };
    document.addEventListener("pointermove", onMove, true);
    document.addEventListener("pointerup", endDrag, true);
    document.addEventListener("pointercancel", endDrag, true);
    window.addEventListener("blur", endDrag);
  }

  function recenter() {
    pos = null;
  }

  // Reset position each time the dialog closes so next open re-centers.
  $effect(() => {
    if (!open) pos = null;
  });
</script>

<Dlg.Root bind:open>
  <Dlg.Portal>
    <Dlg.Content
      bind:ref={contentEl}
      interactOutsideBehavior="ignore"
      class="dlg-content dlg-size-{size} dlg-pad-{padding}"
      data-dragging={dragging ? "" : undefined}
      data-floating={pos ? "" : undefined}
      style={pos ? `top:${pos.y}px;left:${pos.x}px;transform:none` : undefined}
    >
      {#if title}
        <div
          class="dlg-head"
          role="presentation"
          onpointerdown={onHeaderPointerDown}
          ondblclick={recenter}
        >
          <span class="dlg-drag-grip" aria-hidden="true">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="6"  cy="7"  r="1.3"/>
              <circle cx="6"  cy="12" r="1.3"/>
              <circle cx="6"  cy="17" r="1.3"/>
              <circle cx="12" cy="7"  r="1.3"/>
              <circle cx="12" cy="12" r="1.3"/>
              <circle cx="12" cy="17" r="1.3"/>
            </svg>
          </span>
          <div class="dlg-title-block">
            <Dlg.Title class="dlg-title">{title}</Dlg.Title>
            {#if description}
              <Dlg.Description class="dlg-desc">{description}</Dlg.Description>
            {/if}
          </div>
          <div class="dlg-actions" data-no-drag>
            {#if draggable && pos}
              <button
                type="button"
                class="dlg-iconbtn"
                onclick={recenter}
                aria-label="가운데 정렬"
                title="더블클릭 또는 버튼으로 중앙 복귀"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                  <path d="M9 12h6M12 9v6"/>
                </svg>
              </button>
            {/if}
            <Dlg.Close class="dlg-iconbtn" aria-label="닫기">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </Dlg.Close>
          </div>
        </div>
      {/if}
      <div class="dlg-body">
        {@render children()}
      </div>
    </Dlg.Content>
  </Dlg.Portal>
</Dlg.Root>

<style>
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
    border-radius: 12px;
    background: var(--surface);
    box-shadow: var(--shadow-elevated);
    outline: none;
    overflow: hidden;
    animation: dlg-scale 180ms var(--ease);
  }

  :global(.dlg-content[data-floating]) {
    animation: none;
  }

  :global(.dlg-content[data-dragging]) {
    box-shadow:
      0 18px 40px -12px rgba(0, 0, 0, 0.45),
      0 0 0 1px color-mix(in srgb, var(--primary) 35%, transparent);
    user-select: none;
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
    gap: 10px;
    padding: 10px 12px 10px 10px;
    border-bottom: 1px solid var(--line-soft);
    cursor: grab;
    touch-action: none;
    user-select: none;
  }

  :global(.dlg-content[data-dragging] .dlg-head) {
    cursor: grabbing;
  }

  :global(.dlg-drag-grip) {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 22px;
    height: 22px;
    color: var(--muted);
    opacity: 0.6;
  }

  :global(.dlg-title-block) {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }

  :global(.dlg-title) {
    margin: 0;
    font-size: var(--fs-lg);
    font-weight: 700;
    letter-spacing: -0.02em;
    color: var(--text);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.dlg-desc) {
    margin: 0;
    font-size: var(--fs-sm);
    color: var(--muted);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  :global(.dlg-actions) {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  :global(.dlg-iconbtn) {
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

  :global(.dlg-iconbtn:hover) {
    color: var(--text);
    border-color: var(--line);
  }

  :global(.dlg-body) {
    min-height: 0;
    overflow: auto;
  }

  @keyframes dlg-scale {
    from { opacity: 0; transform: translate(-50%, -50%) scale(0.96); }
    to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
  }
</style>
