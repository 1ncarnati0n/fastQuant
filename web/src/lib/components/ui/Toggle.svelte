<script lang="ts">
  let {
    checked = $bindable(false),
    disabled = false,
    size = "md",
    onchange,
    onclick,
  }: {
    checked?: boolean;
    disabled?: boolean;
    size?: "sm" | "md";
    onchange?: (next: boolean) => void;
    onclick?: (event: MouseEvent) => void;
  } = $props();

  function toggle(event: MouseEvent) {
    onclick?.(event);
    if (disabled) return;
    checked = !checked;
    onchange?.(checked);
  }
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={checked ? "켜짐" : "꺼짐"}
  {disabled}
  class="toggle toggle--{size}"
  class:is-on={checked}
  onclick={toggle}
>
  <span class="thumb"></span>
</button>

<style>
  .toggle {
    position: relative;
    display: inline-flex;
    align-items: center;
    border: none;
    padding: 2px;
    border-radius: var(--radius-full);
    background: var(--border);
    cursor: pointer;
    flex-shrink: 0;
    transition: background var(--dur-fast) var(--ease);
    outline: none;
  }

  .toggle:focus-visible {
    box-shadow: 0 0 0 2px var(--primary-soft);
  }

  .toggle.is-on {
    background: var(--primary);
  }

  .toggle:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  /* sizes */
  .toggle--md {
    width: 36px;
    height: 20px;
  }
  .toggle--sm {
    width: 28px;
    height: 16px;
  }

  .thumb {
    display: block;
    background: #fff;
    border-radius: var(--radius-full);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.25);
    transition: transform var(--dur-fast) var(--ease);
    flex-shrink: 0;
  }

  .toggle--md .thumb {
    width: 16px;
    height: 16px;
  }
  .toggle--md.is-on .thumb {
    transform: translateX(16px);
  }

  .toggle--sm .thumb {
    width: 12px;
    height: 12px;
  }
  .toggle--sm.is-on .thumb {
    transform: translateX(12px);
  }
</style>
