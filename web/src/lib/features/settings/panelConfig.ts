import type { TabItem } from "$lib/ui/Tabs.svelte";

export const SETTINGS_TAB_ITEMS: TabItem[] = [
  { key: "indicators", label: "지표", hint: "오버레이 · 오실레이터" },
  { key: "layout", label: "레이아웃", hint: "차트 영역 구성" },
  { key: "appearance", label: "화면", hint: "차트 타입 · 축" },
  { key: "drawing", label: "드로잉", hint: "도구 · Undo" },
  { key: "replay", label: "리플레이", hint: "기본 속도 · Lookback" },
  { key: "shortcuts", label: "단축키", hint: "키보드 가이드" },
];
