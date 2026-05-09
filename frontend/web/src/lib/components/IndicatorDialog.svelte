<script lang="ts">
  import Dialog from "$lib/ui/Dialog.svelte";
  import IndicatorPanel from "$lib/components/IndicatorPanel.svelte";
  import type { AnalysisParams } from "$lib/api/types";

  let {
    open = $bindable(false),
    params,
    onParamsChange,
  }: {
    open?: boolean;
    params: AnalysisParams;
    onParamsChange: (next: AnalysisParams) => void;
  } = $props();
</script>

<Dialog bind:open title="보조지표" size="xl" padding="none" draggable={false} minimalHeader>
  <div class="panel-wrap">
    <IndicatorPanel
      {params}
      onParamsChange={(next) => { onParamsChange(next); }}
    />
  </div>
</Dialog>

<style>
  .panel-wrap {
    display: flex;
    flex-direction: column;
    min-height: 0;
    height: 100%;
    overflow: hidden;
  }
</style>
