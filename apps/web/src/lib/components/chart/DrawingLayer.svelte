<script lang="ts">
  import { onMount } from "svelte";
  import type {
    IChartApi,
    ISeriesApi,
    SeriesType,
  } from "lightweight-charts";
  import { drawing } from "$lib/stores/drawing.svelte";
  import { pointToCoord, timeToSeconds, eventToPoint, type ChartRefs } from "$lib/chart/coords";
  import { uid, isTwoPointTool, TOOL_GUIDE, type DrawingPoint } from "$lib/chart/drawing/types";

  let {
    chart,
    series,
  }: {
    chart: IChartApi | null;
    series: ISeriesApi<SeriesType> | null;
  } = $props();

  let container: HTMLDivElement;
  let width = $state(0);
  let height = $state(0);
  let chartRange = $state<{ from: number; to: number } | null>(null);
  let pendingPoints = $state<DrawingPoint[]>([]);
  let hoverPoint = $state<DrawingPoint | null>(null);

  const refs = $derived<ChartRefs | null>(chart && series ? { chart, series } : null);
  const pointerActive = $derived(drawing.activeTool !== "none");

  const guide = $derived.by(() => {
    const tool = drawing.activeTool;
    if (tool === "none") return "";
    if (isTwoPointTool(tool)) {
      return pendingPoints.length === 0 ? `1/2 시작점 클릭` : `2/2 끝점 클릭`;
    }
    const labels: Record<string, string[]> = {
      channel: ["1/3 기준선 시작점 클릭", "2/3 기준선 끝점 클릭", "3/3 채널 폭 클릭"],
      pitchfork: ["1/3 A 클릭", "2/3 B 클릭", "3/3 C 클릭"],
    };
    if (labels[tool]) return labels[tool][pendingPoints.length] ?? TOOL_GUIDE[tool] ?? "";
    if (tool === "elliott" || tool === "harmonic") return `${Math.min(pendingPoints.length + 1, 5)}/5 점 클릭`;
    return TOOL_GUIDE[tool] ?? "";
  });

  onMount(() => {
    const ro = new ResizeObserver(([entry]) => {
      width = Math.floor(entry.contentRect.width);
      height = Math.floor(entry.contentRect.height);
    });
    ro.observe(container);

    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement;
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable) return;
      if (e.key === "Escape") {
        pendingPoints = [];
        hoverPoint = null;
        drawing.setTool("none");
      } else if (e.key === "Delete" || e.key === "Backspace") {
        if (drawing.selectedId) drawing.remove(drawing.selectedId);
        else drawing.undo();
      } else if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key === "z") {
        e.preventDefault();
        drawing.undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.shiftKey && e.key === "z"))) {
        e.preventDefault();
        drawing.redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);

    return () => {
      ro.disconnect();
      window.removeEventListener("keydown", onKeyDown);
    };
  });

  // Subscribe to visible logical-range changes to recompute SVG coordinates on pan/zoom.
  $effect(() => {
    if (!chart) return;
    const onRangeChange = (range: import("lightweight-charts").LogicalRange | null) => {
      chartRange = range ? { from: range.from, to: range.to } : null;
    };
    chart.timeScale().subscribeVisibleLogicalRangeChange(onRangeChange);
    return () => chart.timeScale().unsubscribeVisibleLogicalRangeChange(onRangeChange);
  });

  function handleOverlayClick(e: MouseEvent) {
    if (!refs) return;
    const point = eventToPoint(e, e.currentTarget as HTMLElement, refs);
    if (!point) return;
    processClick(point);
  }

  function handleOverlayMouseMove(e: MouseEvent) {
    if (!refs || pendingPoints.length === 0) { hoverPoint = null; return; }
    hoverPoint = eventToPoint(e, e.currentTarget as HTMLElement, refs);
  }

  $effect(() => {
    void drawing.activeTool;
    pendingPoints = [];
    hoverPoint = null;
  });

  function selectShape(e: MouseEvent, id: string) {
    e.stopPropagation();
    drawing.select(id);
  }

  function processClick(point: DrawingPoint) {
    const tool = drawing.activeTool;

    if (tool === "horizontal") {
      drawing.add({ id: uid(), type: "horizontal", price: point.price, color: "#f59e0b" });
      drawing.setTool("none");
      return;
    }
    if (tool === "text") {
      const input = window.prompt("텍스트 주석", "메모");
      if (input === null) return;
      drawing.add({ id: uid(), type: "text", point, text: input.trim() || "메모", color: "#38bdf8" });
      drawing.setTool("none");
      return;
    }
    if (tool === "channel") {
      if (pendingPoints.length < 2) { pendingPoints = [...pendingPoints, point]; return; }
      drawing.add({ id: uid(), type: "channel", start: pendingPoints[0]!, end: pendingPoints[1]!, offset: point, color: "#34d399", fillColor: "rgba(52,211,153,0.12)" });
      pendingPoints = []; drawing.setTool("none");
      return;
    }
    if (tool === "pitchfork") {
      if (pendingPoints.length < 2) { pendingPoints = [...pendingPoints, point]; return; }
      drawing.add({ id: uid(), type: "pitchfork", a: pendingPoints[0]!, b: pendingPoints[1]!, c: point, color: "#0ea5e9", fillColor: "rgba(14,165,233,0.10)" });
      pendingPoints = []; drawing.setTool("none");
      return;
    }
    if (tool === "elliott" || tool === "harmonic") {
      if (pendingPoints.length < 4) { pendingPoints = [...pendingPoints, point]; return; }
      const pts = [...pendingPoints, point] as [DrawingPoint, DrawingPoint, DrawingPoint, DrawingPoint, DrawingPoint];
      if (tool === "elliott") drawing.add({ id: uid(), type: "elliott", points: pts, color: "#a855f7" });
      else drawing.add({ id: uid(), type: "harmonic", x: pts[0], a: pts[1], b: pts[2], c: pts[3], d: pts[4], color: "#f43f5e", fillColor: "rgba(244,63,94,0.10)" });
      pendingPoints = []; drawing.setTool("none");
      return;
    }
    if (isTwoPointTool(tool)) {
      if (pendingPoints.length === 0) { pendingPoints = [point]; return; }
      const start = pendingPoints[0]!;
      if (tool === "rectangle") drawing.add({ id: uid(), type: "rectangle", start, end: point, color: "#f97316", fillColor: "rgba(249,115,22,0.12)" });
      else if (tool === "fib") drawing.add({ id: uid(), type: "fib", start, end: point, color: "#06b6d4" });
      else if (tool === "measure") drawing.add({ id: uid(), type: "measure", start, end: point, color: "#a78bfa" });
      else if (tool === "gann") drawing.add({ id: uid(), type: "gann", start, end: point, color: "#3b82f6" });
      else drawing.add({ id: uid(), type: "trend", start, end: point, color: "#22c55e" });
      pendingPoints = []; drawing.setTool("none");
    }
  }

  // Coord helper — creates $derived dependency on chartRange
  function toC(point: DrawingPoint) {
    void chartRange;
    return refs ? pointToCoord(refs, point) : null;
  }

  const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

  function makeInfiniteLine(p: {x:number;y:number}, dir: {x:number;y:number}, span = 5000) {
    const len = Math.hypot(dir.x, dir.y);
    if (len < 0.001) return null;
    const nx = dir.x / len; const ny = dir.y / len;
    return { x1: p.x - nx*span, y1: p.y - ny*span, x2: p.x + nx*span, y2: p.y + ny*span };
  }

  function glow(id: string) {
    return drawing.selectedId === id ? "drop-shadow(0 0 3px rgba(59,130,246,0.8))" : "";
  }

  function sw(id: string, base: number): number {
    return drawing.selectedId === id ? base + 0.8 : base;
  }
</script>

<div
  bind:this={container}
  class="layer"
  data-testid="drawing-layer"
  data-active-tool={drawing.activeTool}
  data-drawing-count={drawing.drawings.length}
  role="presentation"
>
  {#if guide}
    <div class="guide" aria-live="polite">{guide} · Esc 취소</div>
  {/if}

  <svg {width} {height} class="svg" aria-hidden="true">
    <!-- Committed drawings -->
    {#each drawing.drawings as item (item.id)}
      {#if item.type === "horizontal"}
        {@const y = refs?.series.priceToCoordinate(item.price) ?? null}
        {#if y !== null}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <g role="presentation" style:filter={glow(item.id)} onclick={(e) => selectShape(e, item.id)} style:cursor="pointer">
            <line x1={0} y1={y} x2={width} y2={y}
              stroke={item.color} stroke-width={sw(item.id, 1)} stroke-dasharray="4 4" />
            <text x={width - 4} y={y - 3} text-anchor="end" fill={item.color} font-size="10">{item.price.toFixed(4)}</text>
          </g>
        {/if}

      {:else if item.type === "trend"}
        {@const s = toC(item.start)} {@const e = toC(item.end)}
        {#if s && e}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <line role="presentation" x1={s.x} y1={s.y} x2={e.x} y2={e.y}
            stroke={item.color} stroke-width={sw(item.id, 2)}
            style:filter={glow(item.id)} style:cursor="pointer"
            onclick={(e) => selectShape(e, item.id)} />
        {/if}

      {:else if item.type === "fib"}
        {@const s = toC(item.start)} {@const eC = toC(item.end)}
        {#if s && eC}
          {@const minX = Math.min(s.x, eC.x)} {@const maxX = Math.max(s.x, eC.x)}
          {@const hi = Math.max(item.start.price, item.end.price)}
          {@const lo = Math.min(item.start.price, item.end.price)}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <g role="presentation" style:filter={glow(item.id)} style:cursor="pointer" onclick={(e) => selectShape(e, item.id)}>
            <line x1={s.x} y1={s.y} x2={eC.x} y2={eC.y} stroke={item.color} stroke-width={1} stroke-dasharray="3 3" />
            {#each FIB_LEVELS as level}
              {@const yf = refs?.series.priceToCoordinate(hi - (hi - lo) * level) ?? null}
              {#if yf !== null}
                <line x1={minX} y1={yf} x2={maxX} y2={yf} stroke={item.color} stroke-width={sw(item.id, 1)} />
                <text x={maxX + 3} y={yf - 2} fill={item.color} font-size="9">{(level * 100).toFixed(1)}%</text>
              {/if}
            {/each}
          </g>
        {/if}

      {:else if item.type === "measure"}
        {@const s = toC(item.start)} {@const e = toC(item.end)}
        {#if s && e}
          {@const diff = item.end.price - item.start.price}
          {@const pct = Math.abs(item.start.price) > 1e-10 ? (diff / item.start.price) * 100 : 0}
          {@const bars = Math.round(Math.abs(item.end.time - item.start.time))}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <g role="presentation" style:filter={glow(item.id)} style:cursor="pointer" onclick={(e) => selectShape(e, item.id)}>
            <line x1={s.x} y1={s.y} x2={e.x} y2={e.y}
              stroke={item.color} stroke-width={sw(item.id, 2)} stroke-dasharray="4 2" />
            <text x={(s.x + e.x)/2 + 4} y={(s.y + e.y)/2 - 6} fill={item.color} font-size="10">
              {diff >= 0 ? "+" : ""}{diff.toFixed(4)} ({pct.toFixed(2)}%) · {bars}bars
            </text>
          </g>
        {/if}

      {:else if item.type === "rectangle"}
        {@const s = toC(item.start)} {@const e = toC(item.end)}
        {#if s && e}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <rect
            role="presentation"
            x={Math.min(s.x, e.x)} y={Math.min(s.y, e.y)}
            width={Math.abs(e.x - s.x)} height={Math.abs(e.y - s.y)}
            fill={item.fillColor} stroke={item.color} stroke-width={sw(item.id, 1.5)}
            style:filter={glow(item.id)} style:cursor="pointer"
            onclick={(e) => selectShape(e, item.id)} />
        {/if}

      {:else if item.type === "text"}
        {@const c = toC(item.point)}
        {#if c}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <g role="presentation" style:filter={glow(item.id)} style:cursor="pointer" onclick={(e) => selectShape(e, item.id)}>
            <rect x={c.x + 6} y={c.y - 16} rx="3"
              width={Math.max(26, item.text.length * 6 + 8)} height={16}
              fill="rgba(17,22,33,0.85)" stroke={item.color} stroke-width={sw(item.id, 1)} />
            <text x={c.x + 10} y={c.y - 5} fill={item.color} font-size="10">{item.text}</text>
          </g>
        {/if}

      {:else if item.type === "channel"}
        {@const s = toC(item.start)} {@const e = toC(item.end)} {@const o = toC(item.offset)}
        {#if s && e && o}
          {@const dx = o.x - s.x} {@const dy = o.y - s.y}
          {@const s2 = {x: s.x+dx, y: s.y+dy}} {@const e2 = {x: e.x+dx, y: e.y+dy}}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <g role="presentation" style:filter={glow(item.id)} style:cursor="pointer" onclick={(ev) => selectShape(ev, item.id)}>
            <polygon points="{s.x},{s.y} {e.x},{e.y} {e2.x},{e2.y} {s2.x},{s2.y}" fill={item.fillColor} />
            <line x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke={item.color} stroke-width={sw(item.id,2)} />
            <line x1={s2.x} y1={s2.y} x2={e2.x} y2={e2.y} stroke={item.color} stroke-width={sw(item.id,2)} />
          </g>
        {/if}

      {:else if item.type === "pitchfork"}
        {@const a = toC(item.a)} {@const b = toC(item.b)} {@const c = toC(item.c)}
        {#if a && b && c}
          {@const mid = {x:(b.x+c.x)/2, y:(b.y+c.y)/2}}
          {@const dir = {x:mid.x-a.x, y:mid.y-a.y}}
          {@const ml = makeInfiniteLine(a, dir)} {@const ul = makeInfiniteLine(b, dir)} {@const ll = makeInfiniteLine(c, dir)}
          {#if ml && ul && ll}
            <!-- svelte-ignore a11y_click_events_have_key_events -->
            <g role="presentation" style:filter={glow(item.id)} style:cursor="pointer" onclick={(ev) => selectShape(ev, item.id)}>
              {#each [ml, ul, ll] as ln}
                <line x1={ln.x1} y1={ln.y1} x2={ln.x2} y2={ln.y2} stroke={item.color} stroke-width={1.5} />
              {/each}
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={item.color} stroke-width={1} />
              <line x1={a.x} y1={a.y} x2={c.x} y2={c.y} stroke={item.color} stroke-width={1} />
            </g>
          {/if}
        {/if}

      {:else if item.type === "gann"}
        {@const s = toC(item.start)} {@const e = toC(item.end)}
        {#if s && e}
          {@const dx = e.x - s.x} {@const dy = e.y - s.y}
          {@const sx = dx >= 0 ? 1 : -1}
          {#each [0.25, 0.5, 1, 2, 3, 4, 8] as ratio}
            {#if Math.abs(dx) > 0.001}
              {@const slope = dy / dx}
              <line x1={s.x} y1={s.y} x2={s.x + sx*2000} y2={s.y + slope*ratio*sx*2000}
                stroke={item.color} stroke-width={ratio === 1 ? 1.8 : 1} opacity={ratio === 1 ? 1 : 0.7} />
            {/if}
          {/each}
        {/if}

      {:else if item.type === "elliott"}
        {@const coords = item.points.map(p => toC(p))}
        {#if coords.every(c => c !== null)}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <g role="presentation" style:filter={glow(item.id)} style:cursor="pointer" onclick={(ev) => selectShape(ev, item.id)}>
            <polyline points={coords.map(c => `${c!.x},${c!.y}`).join(" ")}
              fill="none" stroke={item.color} stroke-width={1.8} stroke-linecap="round" stroke-linejoin="round" />
            {#each coords as c, i}
              {#if c}
                <circle cx={c.x} cy={c.y} r="3" fill={item.color} />
                <text x={c.x+5} y={c.y-6} fill={item.color} font-size="9">{i+1}</text>
              {/if}
            {/each}
          </g>
        {/if}

      {:else if item.type === "harmonic"}
        {@const coords = [item.x, item.a, item.b, item.c, item.d].map(p => toC(p))}
        {@const labels = ["X","A","B","C","D"]}
        {#if coords.every(c => c !== null)}
          <!-- svelte-ignore a11y_click_events_have_key_events -->
          <g role="presentation" style:filter={glow(item.id)} style:cursor="pointer" onclick={(ev) => selectShape(ev, item.id)}>
            <polygon points={coords.map(c => `${c!.x},${c!.y}`).join(" ")} fill={item.fillColor} stroke="none" />
            <polyline points={coords.map(c => `${c!.x},${c!.y}`).join(" ")}
              fill="none" stroke={item.color} stroke-width={1.8} stroke-linecap="round" stroke-linejoin="round" />
            {#each coords as c, i}
              {#if c}
                <circle cx={c.x} cy={c.y} r="3" fill={item.color} />
                <text x={c.x+5} y={c.y-6} fill={item.color} font-size="9">{labels[i]}</text>
              {/if}
            {/each}
          </g>
        {/if}
      {/if}
    {/each}

    <!-- Pending points -->
    {#each pendingPoints as pt}
      {@const c = toC(pt)}
      {#if c}<circle cx={c.x} cy={c.y} r="4" fill="var(--accent)" />{/if}
    {/each}

    <!-- Preview ghost -->
    {#if hoverPoint && pendingPoints.length > 0}
      {@const hover = toC(hoverPoint)}
      {@const first = toC(pendingPoints[0]!)}
      {#if hover && first}
        {#if drawing.activeTool === "rectangle"}
          <rect
            x={Math.min(first.x, hover.x)} y={Math.min(first.y, hover.y)}
            width={Math.abs(hover.x - first.x)} height={Math.abs(hover.y - first.y)}
            fill="rgba(249,115,22,0.08)" stroke="#f97316" stroke-dasharray="4 3" stroke-width={1.5} />
        {:else}
          <line x1={first.x} y1={first.y} x2={hover.x} y2={hover.y}
            stroke="var(--accent)" stroke-width={1.5} stroke-dasharray="4 3" />
        {/if}
      {/if}
    {/if}
  </svg>

  {#if pointerActive}
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <div
      class="capture-overlay"
      role="presentation"
      onclick={handleOverlayClick}
      onmousemove={handleOverlayMouseMove}
      onmouseleave={() => { hoverPoint = null; }}
    ></div>
  {/if}
</div>

<style>
  .layer {
    position: absolute;
    inset: 0;
    z-index: 7;
    pointer-events: none; /* click handling is done via chart.subscribeClick */
  }

  .svg {
    width: 100%;
    height: 100%;
    overflow: visible;
    pointer-events: none;
  }

  /* Only painted shapes themselves intercept clicks (for selection) */
  .svg :global(g),
  .svg :global(line),
  .svg :global(rect),
  .svg :global(text) {
    pointer-events: visiblePainted;
  }

  .capture-overlay {
    position: absolute;
    inset: 0;
    z-index: 8;
    pointer-events: auto;
    cursor: crosshair;
  }

  .guide {
    position: absolute;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 9;
    pointer-events: none;
    padding: 4px 10px;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: color-mix(in srgb, var(--bg) 88%, transparent);
    backdrop-filter: blur(4px);
    color: var(--muted);
    font-size: var(--fs-sm);
    white-space: nowrap;
  }
</style>
