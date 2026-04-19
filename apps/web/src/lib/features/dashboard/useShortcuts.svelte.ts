import { browser } from "$app/environment";
import {
  isActiveDialogLayer,
  isEditableKeyboardTarget,
  isModKey,
} from "$lib/utils/shortcuts";

export interface ShortcutHandlers {
  onCommandPalette: () => void;
  onShortcutsHelp: () => void;
  onOpenWatchlist: () => void;
  onOpenSettings: () => void;
  onOpenSymbolSearch?: () => void;
  onToggleFullscreen?: () => void;
  onToggleReplay?: () => void;
  onReplayPlayPause?: () => void;
  onReplayStep?: (delta: number) => void;
}

export function installShortcuts(handlers: ShortcutHandlers): () => void {
  if (!browser) return () => {};

  function handle(e: KeyboardEvent) {
    if (isEditableKeyboardTarget(e.target)) return;

    // Command palette: Cmd/Ctrl+J. Allowed even inside dialogs (closes + reopens palette).
    if (isModKey(e, "j")) {
      e.preventDefault();
      handlers.onCommandPalette();
      return;
    }

    // While any dialog is open, ignore non-Esc shortcuts (dialog handles Esc itself).
    if (isActiveDialogLayer(e.target)) return;

    if (e.key === "?" && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      handlers.onShortcutsHelp();
      return;
    }

    if (isModKey(e, "b")) {
      e.preventDefault();
      handlers.onOpenWatchlist();
      return;
    }

    if ((e.metaKey || e.ctrlKey) && e.key === ",") {
      e.preventDefault();
      handlers.onOpenSettings();
      return;
    }

    if (isModKey(e, "k")) {
      e.preventDefault();
      handlers.onOpenSymbolSearch?.();
      return;
    }

    if (
      e.key === "/" &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !e.shiftKey
    ) {
      e.preventDefault();
      handlers.onOpenSymbolSearch?.();
      return;
    }

    if (
      e.key.toLowerCase() === "f" &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !e.shiftKey
    ) {
      e.preventDefault();
      handlers.onToggleFullscreen?.();
      return;
    }

    if (
      e.key.toLowerCase() === "r" &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey &&
      !e.shiftKey
    ) {
      e.preventDefault();
      handlers.onToggleReplay?.();
      return;
    }

    if (e.key === " " && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      handlers.onReplayPlayPause?.();
      return;
    }

    if (e.key === "ArrowLeft" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      if (handlers.onReplayStep) {
        e.preventDefault();
        handlers.onReplayStep(-1);
      }
      return;
    }
    if (e.key === "ArrowRight" && !e.ctrlKey && !e.metaKey && !e.altKey && !e.shiftKey) {
      if (handlers.onReplayStep) {
        e.preventDefault();
        handlers.onReplayStep(1);
      }
      return;
    }
  }

  window.addEventListener("keydown", handle);
  return () => window.removeEventListener("keydown", handle);
}
