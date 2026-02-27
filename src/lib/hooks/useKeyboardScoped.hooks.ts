import { useEffect, useRef } from "react";

type ScopedShortcut = {
  keys: string[];
  /** Use native modifier flags—default: false (not required) */
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;

  /** Handler to run on match */
  handler: (e: KeyboardEvent) => void;

  /**
   * Ignore events from inputs/textarea/select/contentEditable by default.
   * Set true if you want shortcuts to trigger while typing in inputs.
   */
  includeInputs?: boolean;

  /** Defaults: preventDefault = true, stopPropagation = false */
  preventDefault?: boolean;
  stopPropagation?: boolean;
};

type UseKeyboardScopedOptions = {
  /** The DOM container to scope to (required). */
  target: HTMLElement | null;
  /** Enable/disable the hook; default true. */
  when?: boolean;
  /** Listener options; default { capture: false, passive: false } */
  eventOptions?: AddEventListenerOptions;
  /**
   * If true and on macOS, treat `ctrl: true` shortcuts as `meta` (⌘) instead,
   * for familiar UX. Default false (literal ctrl).
   */
  mapCtrlToMetaOnMac?: boolean;
};

const isMac =
  typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const el = target as HTMLElement;
  const tag = el.tagName;
  return (
    el.isContentEditable ||
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT"
  );
}

function matchModifiers(
  e: KeyboardEvent,
  sc: ScopedShortcut,
  mapCtrlToMetaOnMac: boolean
): boolean {
  // If a modifier is explicitly true, it must be pressed.
  // If explicitly false (or undefined), we don't require it, and we also don't require it to be false.
  const needCtrl = !!sc.ctrl;
  const needMeta = !!sc.meta;
  const needAlt = !!sc.alt;
  const needShift = !!sc.shift;

  const ctrlPressed = mapCtrlToMetaOnMac && isMac ? e.metaKey : e.ctrlKey;

  if (needCtrl && !ctrlPressed) return false;
  if (needMeta && !e.metaKey) return false;
  if (needAlt && !e.altKey) return false;
  if (needShift && !e.shiftKey) return false;

  return true;
}

function matchShortcut(
  e: KeyboardEvent,
  sc: ScopedShortcut,
  mapCtrlToMetaOnMac: boolean
): boolean {
  if (!matchModifiers(e, sc, mapCtrlToMetaOnMac)) return false;
  const key = e.key;
  return sc.keys.includes(key);
}

/**
 * Attach keyboard shortcuts to a specific DOM container so they only work
 * inside the component and its descendants.
 */
function useKeyboardScoped(
  shortcuts: ScopedShortcut[] | ScopedShortcut,
  {
    target,
    when = true,
    eventOptions = { capture: false, passive: false },
    mapCtrlToMetaOnMac = false,
  }: UseKeyboardScopedOptions
) {
  const shortcutsRef = useRef<ScopedShortcut[]>(
    Array.isArray(shortcuts) ? shortcuts : [shortcuts]
  );
  const optsRef = useRef({ when, eventOptions, target, mapCtrlToMetaOnMac });

  shortcutsRef.current = Array.isArray(shortcuts) ? shortcuts : [shortcuts];
  optsRef.current = { when, eventOptions, target, mapCtrlToMetaOnMac };

  useEffect(() => {
    const t = optsRef.current.target;
    if (!t || !optsRef.current.when) return;

    const onKeyDown = (e: KeyboardEvent) => {
      for (const sc of shortcutsRef.current) {
        if (!sc.includeInputs && isEditableTarget(e.target)) continue;

        if (matchShortcut(e, sc, optsRef.current.mapCtrlToMetaOnMac)) {
          if (sc.preventDefault ?? true) e.preventDefault();
          if (sc.stopPropagation) e.stopPropagation();
          sc.handler(e);
          return; // first match wins
        }
      }
    };

    t.addEventListener("keydown", onKeyDown, optsRef.current.eventOptions);
    return () => t.removeEventListener("keydown", onKeyDown, optsRef.current.eventOptions);
  }, [
    target,
    when,
    eventOptions?.capture,
    eventOptions?.passive,
    Array.isArray(shortcuts) ? shortcuts.length : 1,
    mapCtrlToMetaOnMac,
  ]);
}
useKeyboardScoped.displayName = "useKeyboardScoped";

export {
  type ScopedShortcut,
  type UseKeyboardScopedOptions,
  useKeyboardScoped
}
