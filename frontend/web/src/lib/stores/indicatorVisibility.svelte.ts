function createIndicatorVisibility() {
  let hidden = $state<Set<string>>(new Set());

  return {
    get hidden() {
      return hidden;
    },
    isHidden(key: string) {
      return hidden.has(key);
    },
    hide(key: string) {
      if (hidden.has(key)) return;
      hidden = new Set([...hidden, key]);
    },
    show(key: string) {
      if (!hidden.has(key)) return;
      const next = new Set(hidden);
      next.delete(key);
      hidden = next;
    },
    toggle(key: string) {
      const next = new Set(hidden);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      hidden = next;
    },
    clear() {
      hidden = new Set();
    },
  };
}

export const indicatorVisibility = createIndicatorVisibility();
