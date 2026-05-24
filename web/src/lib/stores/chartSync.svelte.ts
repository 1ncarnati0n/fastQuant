import type { IChartApi } from "lightweight-charts";

class ChartSyncStore {
  mainChart = $state<IChartApi | null>(null);

  register(chart: IChartApi) {
    this.mainChart = chart;
  }

  unregister() {
    this.mainChart = null;
  }
}

export const chartSync = new ChartSyncStore();
