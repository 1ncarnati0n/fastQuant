export interface ShortcutHelpItem {
  id: string;
  keys: string[];
  desc: string;
}

export interface ShortcutHelpGroup {
  title: string;
  items: ShortcutHelpItem[];
}

export const SHORTCUT_HELP_GROUPS: ShortcutHelpGroup[] = [
  {
    title: "명령",
    items: [
      { id: "cmd.palette",    keys: ["Ctrl/⌘", "J"], desc: "명령 팔레트 열기" },
      { id: "cmd.shortcuts",  keys: ["?"],            desc: "단축키 도움말" },
    ],
  },
  {
    title: "차트 조작",
    items: [
      { id: "chart.fit",             keys: ["Home"],       desc: "차트 맞춤" },
      { id: "chart.replay_toggle",   keys: ["R"],          desc: "바 리플레이 시작/종료" },
      { id: "chart.delete_drawing",  keys: ["Delete"],     desc: "최근 드로잉 삭제" },
    ],
  },
  {
    title: "화면",
    items: [
      { id: "view.toggle_fullscreen", keys: ["F"],   desc: "전체화면 전환" },
      { id: "view.escape",             keys: ["Esc"], desc: "팔레트/패널 닫기" },
    ],
  },
  {
    title: "패널",
    items: [
      { id: "panel.toggle_watchlist", keys: ["Ctrl/⌘", "B"], desc: "관심종목 패널" },
      { id: "panel.toggle_settings",  keys: ["Ctrl/⌘", ","], desc: "분석 패널" },
      { id: "panel.open_symbol_search", keys: ["Ctrl/⌘", "K"], desc: "심볼 검색" },
      { id: "panel.open_symbol_search_alt", keys: ["/"],     desc: "심볼 검색 (보조)" },
    ],
  },
];

export function isEditableKeyboardTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function isActiveDialogLayer(target: EventTarget | null): boolean {
  const element = target instanceof HTMLElement ? target : null;
  if (element?.closest('[role="dialog"]')) return true;
  if (typeof document === "undefined") return false;
  return Boolean(document.querySelector('[role="dialog"][data-state="open"]'));
}

/**
 * True when the event's modifier state matches a Cmd/Ctrl combo with the given key.
 * `key` should be lowercased (matches `e.key.toLowerCase()`).
 */
export function isModKey(e: KeyboardEvent, key: string): boolean {
  return (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === key.toLowerCase();
}
