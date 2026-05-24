<script lang="ts">
  import { drawing } from "$lib/stores/drawing.svelte";
  import type { DrawingTool } from "$lib/chart/drawing/types";

  interface ToolDef {
    id: DrawingTool;
    label: string;
    title: string;
    path: string;
  }

  const tools: ToolDef[] = [
    { id: "none", label: "▸", title: "선택/이동", path: "" },
    { id: "horizontal", label: "—", title: "수평선", path: "M4 12h16" },
    { id: "trend", label: "╱", title: "추세선", path: "M4 20L20 4" },
    { id: "fib", label: "ℱ", title: "피보나치", path: "M4 20L20 4M4 14h16M4 17h16" },
    { id: "measure", label: "↔", title: "측정", path: "M4 12h16M4 8v8M20 8v8" },
    { id: "rectangle", label: "□", title: "사각형", path: "M4 4h16v16H4z" },
    { id: "text", label: "T", title: "텍스트", path: "M4 7h16M12 7v14M9 21h6" },
    { id: "channel", label: "⫼", title: "채널", path: "M4 8l16 0M4 16l16 0" },
    { id: "pitchfork", label: "Ψ", title: "피치포크", path: "M12 4v16M4 12c2-4 6-4 8 0M20 12c-2-4-6-4-8 0" },
  ];

  const active = $derived(drawing.activeTool);
</script>

<aside class="toolbar" aria-label="드로잉 툴바">
  <div class="tool-group">
    {#each tools as tool}
      <button
        type="button"
        class="tool-btn"
        class:active={active === tool.id}
        title={tool.title}
        aria-label={tool.title}
        aria-pressed={active === tool.id}
        onclick={() => drawing.setTool(tool.id)}
      >
        {#if tool.path}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
            <path d={tool.path} />
          </svg>
        {:else}
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="6,4 20,12 6,20 6,4" />
          </svg>
        {/if}
      </button>
    {/each}
  </div>

  <div class="divider"></div>

  <div class="action-group">
    <button
      type="button"
      class="tool-btn"
      class:disabled={!drawing.canUndo}
      disabled={!drawing.canUndo}
      title="실행 취소 (Ctrl+Z)"
      aria-label="실행 취소"
      onclick={() => drawing.undo()}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 7v6h6" />
        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
      </svg>
    </button>

    <button
      type="button"
      class="tool-btn"
      class:disabled={!drawing.canRedo}
      disabled={!drawing.canRedo}
      title="다시 실행 (Ctrl+Y)"
      aria-label="다시 실행"
      onclick={() => drawing.redo()}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 7v6h-6" />
        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
      </svg>
    </button>

    <button
      type="button"
      class="tool-btn danger"
      title="모두 지우기"
      aria-label="모두 지우기"
      onclick={() => {
        if (drawing.drawings.length > 0 && confirm("모든 드로잉을 지울까요?")) drawing.clear();
      }}
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" />
      </svg>
    </button>
  </div>
</aside>

<style>
  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 6px 4px;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--surface);
    box-shadow: var(--shadow);
  }

  .tool-group,
  .action-group {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border: 1px solid transparent;
    border-radius: 6px;
    background: transparent;
    color: var(--muted);
    cursor: pointer;
    font-size: var(--fs-sm);
    transition: color 0.12s, background 0.12s, border-color 0.12s;
  }

  .tool-btn:hover {
    color: var(--text);
    background: color-mix(in srgb, var(--text) 8%, transparent);
  }

  .tool-btn.active {
    border-color: var(--accent);
    background: var(--accent-soft);
    color: var(--accent);
  }

  .tool-btn:disabled {
    opacity: 0.35;
    cursor: not-allowed;
  }

  .tool-btn.danger:hover {
    color: var(--danger);
    background: var(--danger-soft);
    border-color: var(--danger);
  }

  .divider {
    height: 1px;
    margin: 2px 4px;
    background: var(--line-soft);
  }
</style>
