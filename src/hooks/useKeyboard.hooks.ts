"use client";
import { useEffect, useRef } from "react";

// ---------------------------------------------------------------------------
// Key constants — React uses the DOM Level 3 KeyboardEvent.key spec.
// Use these instead of raw strings so typos blow up at compile time.
// ---------------------------------------------------------------------------
export const Key = {
  // Modifiers
  Control: "Control",
  Alt: "Alt",
  Shift: "Shift",
  Meta: "Meta",
  // Navigation
  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",
  Home: "Home",
  End: "End",
  PageUp: "PageUp",
  PageDown: "PageDown",
  // Editing
  Backspace: "Backspace",
  Delete: "Delete",
  Insert: "Insert",
  Enter: "Enter",
  Tab: "Tab",
  Escape: "Escape",
  Space: " ",
  // Function
  F1: "F1", F2: "F2", F3: "F3", F4: "F4",
  F5: "F5", F6: "F6", F7: "F7", F8: "F8",
  F9: "F9", F10: "F10", F11: "F11", F12: "F12",
} as const;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A single chord step: one key + optional modifiers held simultaneously.
 * Use React's KeyboardEvent.key naming ("Control", "ArrowUp", "k", " ", etc.)
 */
export type KeyChord = {
  key: keyof typeof Key;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
};

/**
 * A shortcut is either:
 *   - A single chord:    { key: "k", ctrl: true }
 *   - A sequence:        [{ key: "g" }, { key: "g" }]  (vim-style gg)
 *   - Mixed:             [{ key: "k", ctrl: true }, { key: "j" }]
 */
export type Shortcut = {
  /**
   * A single KeyChord or an ordered array of KeyChords to match in sequence.
   * Each chord in a sequence must be pressed within `sequenceTimeout` ms of
   * the previous one.
   */
  chord: KeyChord | KeyChord[];

  /** Called when the full chord / sequence matches. */
  handler: (e: KeyboardEvent) => void;

  /**
   * If true, the shortcut fires even when focus is inside an input,
   * textarea, select, or contentEditable element. Default: false.
   */
  includeInputs?: boolean;

  /** Default: true. Set false to allow the browser's default action. */
  preventDefault?: boolean;

  /** Default: false. */
  stopPropagation?: boolean;
};

export type UseKeyboardOptions = {
  /**
   * DOM element to scope the listener to, or "global" to attach to window.
   * Passing null disables the hook (same as when: false).
   */
  target: HTMLElement | "global" | null;

  /** Master enable/disable switch. Default: true. */
  when?: boolean;

  /**
   * If true and on macOS, ctrl shortcuts are matched against ⌘ (meta) instead,
   * for native-feeling UX. Default: false.
   */
  mapCtrlToMetaOnMac?: boolean;

  /**
   * Milliseconds allowed between steps in a sequence before the buffer resets.
   * Default: 500.
   */
  sequenceTimeout?: number;

  /**
   * Called whenever the sequence buffer changes — useful for showing progress
   * hints in the UI (e.g. "1/2 keys matched").
   * Called with 0 when the buffer resets.
   */
  onSequenceProgress?: (matchedSteps: number) => void;

  /** Attach listener in capture phase. Default: false. */
  capture?: boolean;
};

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

const EDITABLE_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || EDITABLE_TAGS.has(target.tagName);
}

/**
 * Matches a single KeyChord against a KeyboardEvent.
 * Modifiers that are NOT required must also not be pressed — this prevents
 * shortcuts from firing as accidental side-effects of unrelated combos.
 */
function matchChord(
  e: KeyboardEvent,
  chord: KeyChord,
  mapCtrlToMetaOnMac: boolean,
): boolean {
  if (e.key !== chord.key) return false;

  const needCtrl = !!chord.ctrl;
  const needAlt = !!chord.alt;
  const needShift = !!chord.shift;
  const needMeta = !!chord.meta;

  // If mapCtrlToMetaOnMac is on, a `ctrl` shortcut maps to ⌘ on Mac.
  const ctrlSatisfied = mapCtrlToMetaOnMac && isMac ? e.metaKey : e.ctrlKey;

  if (needCtrl !== ctrlSatisfied) return false;
  if (needAlt !== e.altKey) return false;
  if (needShift !== e.shiftKey) return false;
  // When mapCtrlToMetaOnMac redirects ctrl → meta, don't double-check meta.
  if (!mapCtrlToMetaOnMac && needMeta !== e.metaKey) return false;

  return true;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Declaratively bind keyboard shortcuts to a DOM container or globally.
 *
 * Supports:
 *   - Single chords:       { key: "k", ctrl: true }
 *   - Sequences:           [{ key: "g" }, { key: "g" }]
 *   - Mixed:               [{ key: "k", ctrl: true }, { key: "j" }]
 *   - Container scoping:   target={ref.current}
 *   - Global:              target="global"
 */
export function useKeyboard(
  shortcuts: Shortcut | Shortcut[],
  {
    target,
    when = true,
    mapCtrlToMetaOnMac = false,
    sequenceTimeout = 500,
    onSequenceProgress,
    capture = false,
  }: UseKeyboardOptions,
): void {
  const shortcutsRef = useRef<Shortcut[]>([]);
  shortcutsRef.current = Array.isArray(shortcuts) ? shortcuts : [shortcuts];

  // These are read inside the listener but must not cause re-attachment.
  const mapCtrlRef = useRef(mapCtrlToMetaOnMac);
  mapCtrlRef.current = mapCtrlToMetaOnMac;

  const onProgressRef = useRef(onSequenceProgress);
  onProgressRef.current = onSequenceProgress;

  const sequenceTimeoutRef = useRef(sequenceTimeout);
  sequenceTimeoutRef.current = sequenceTimeout;

  useEffect(() => {
    if (!target || !when) return;

    const el: EventTarget = target === "global" ? window : target;

    // Sequence state — one shared buffer across all registered shortcuts.
    // Each shortcut independently tracks how many of its steps have matched.
    let stepCounts: number[] = shortcutsRef.current.map(() => 0);
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    function resetSequence() {
      stepCounts = shortcutsRef.current.map(() => 0);
      if (timeoutId !== null) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      onProgressRef.current?.(0);
    }

    const onKeyDown = (e: KeyboardEvent) => {
      // Re-read the latest shortcuts on every event so the ref stays authoritative.
      const currentShortcuts = shortcutsRef.current;

      // Rebuild stepCounts if the number of shortcuts changed (e.g. dynamic lists).
      if (stepCounts.length !== currentShortcuts.length) {
        stepCounts = currentShortcuts.map(() => 0);
      }

      let anyProgress = false;
      let handled = false;

      for (let i = 0; i < currentShortcuts.length; i++) {
        const sc = currentShortcuts[i];

        if (!sc.includeInputs && isEditableTarget(e.target)) continue;

        const steps = Array.isArray(sc.chord) ? sc.chord : [sc.chord];
        const step = steps[stepCounts[i]];

        if (!step) continue;

        if (matchChord(e, step, mapCtrlRef.current)) {
          stepCounts[i]++;

          if (stepCounts[i] === steps.length) {
            // Full match.
            if (sc.preventDefault ?? true) e.preventDefault();
            if (sc.stopPropagation) e.stopPropagation();
            sc.handler(e);
            resetSequence();
            handled = true;
            break;
          }

          // Partial sequence match — arm the timeout.
          anyProgress = true;
        } else {
          // Mismatch: reset this shortcut's progress.
          stepCounts[i] = 0;
        }
      }

      if (handled) return;

      if (anyProgress) {
        const maxProgress = Math.max(...stepCounts);
        onProgressRef.current?.(maxProgress);

        // Reset the timeout window on each new matched step.
        if (timeoutId !== null) clearTimeout(timeoutId);
        timeoutId = setTimeout(resetSequence, sequenceTimeoutRef.current);
      } else {
        // Nothing matched at all — full reset.
        resetSequence();
      }
    };

    el.addEventListener("keydown", onKeyDown as EventListener, { capture });
    return () => {
      el.removeEventListener("keydown", onKeyDown as EventListener, { capture });
      if (timeoutId !== null) clearTimeout(timeoutId);
    };
  // Only re-attach when the physical binding needs to change.
  // Everything else is served through refs.
  }, [target, when, capture]);
}