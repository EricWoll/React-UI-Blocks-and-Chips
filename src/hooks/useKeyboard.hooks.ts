"use client";
import { useEffect, useRef } from "react";

/* -------------------------------------------------------------------------- */
/* Key Types                                                                  */
/* -------------------------------------------------------------------------- */

export const Key = {
  Enter: "Enter",
  Escape: "Escape",
  Tab: "Tab",
  Backspace: "Backspace",
  Delete: "Delete",

  ArrowUp: "ArrowUp",
  ArrowDown: "ArrowDown",
  ArrowLeft: "ArrowLeft",
  ArrowRight: "ArrowRight",

  Space: " ",
} as const;

type KnownKey = (typeof Key)[keyof typeof Key];

type CharKey =
  | Lowercase<string>
  | Uppercase<string>
  | "0"
  | "1"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "/"
  | "."
  | ","
  | "-"
  | "=";

export type KeyboardKey = KnownKey | CharKey;

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

export type KeyChord = {
  key: KeyboardKey;
  ctrl?: boolean;
  alt?: boolean;
  shift?: boolean;
  meta?: boolean;
};

export type Shortcut = {
  chord: KeyChord | KeyChord[];
  handler: (e: KeyboardEvent) => void;

  includeInputs?: boolean;
  preventDefault?: boolean;
  stopPropagation?: boolean;

  when?: boolean | (() => boolean);

  priority?: number;
};

export type UseKeyboardOptions = {
  target?: HTMLElement | "global";
  when?: boolean;
  mapCtrlToMetaOnMac?: boolean;
  sequenceTimeout?: number;
  capture?: boolean;
};

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const isMac =
  typeof navigator !== "undefined" &&
  /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);

function isEditableTarget(target: Element | null): boolean {
  if (!target) return false;

  if (target instanceof HTMLElement) {
    if (target.isContentEditable) return true;

    if (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
      return true;
    }
  }

  let el: Element | null = target;
  while (el) {
    if (el instanceof HTMLElement && el.isContentEditable) return true;
    el = el.parentElement;
  }

  return false;
}

function matchKey(e: KeyboardEvent, key: KeyboardKey): boolean {
  if (e.key.length === 1) {
    return e.key.toLowerCase() === key.toLowerCase();
  }
  return e.key === key;
}

function matchChord(
  e: KeyboardEvent,
  chord: KeyChord,
  mapCtrlToMetaOnMac: boolean,
): boolean {
  if (!matchKey(e, chord.key)) return false;

  const ctrlPressed = mapCtrlToMetaOnMac && isMac ? e.metaKey : e.ctrlKey;

  if (chord.ctrl !== undefined && chord.ctrl !== ctrlPressed) return false;
  if (chord.alt !== undefined && chord.alt !== e.altKey) return false;
  if (chord.shift !== undefined && chord.shift !== e.shiftKey) return false;
  if (chord.meta !== undefined && chord.meta !== e.metaKey) return false;

  return true;
}

/* -------------------------------------------------------------------------- */
/* Hook                                                                       */
/* -------------------------------------------------------------------------- */

export function useKeyboard(
  shortcuts: Shortcut | Shortcut[],
  {
    target = "global",
    when = true,
    mapCtrlToMetaOnMac = false,
    sequenceTimeout = 500,
    capture = false,
  }: UseKeyboardOptions = {},
): void {
  const shortcutsRef = useRef<Shortcut[]>([]);
  const stepsRef = useRef<number[]>([]);
  const timeoutRef = useRef<number | null>(null);

  const optionsRef = useRef({
    when,
    mapCtrlToMetaOnMac,
    sequenceTimeout,
  });

  shortcutsRef.current = Array.isArray(shortcuts) ? shortcuts : [shortcuts];

  optionsRef.current = {
    when,
    mapCtrlToMetaOnMac,
    sequenceTimeout,
  };

  useEffect(() => {
    const el = target === "global" ? window : target;
    if (!el) return;

    stepsRef.current = shortcutsRef.current.map(() => 0);

    function reset() {
      stepsRef.current = shortcutsRef.current.map(() => 0);

      if (timeoutRef.current !== null) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }

    function evaluateWhen(condition?: boolean | (() => boolean)) {
      if (condition === undefined) return true;
      return typeof condition === "function" ? condition() : condition;
    }

    function onKeyDown(e: KeyboardEvent) {
      const { when, mapCtrlToMetaOnMac, sequenceTimeout } = optionsRef.current;

      if (!when) return;

      const activeElement = document.activeElement;

      // sort by priority (higher first)
      const sorted = shortcutsRef.current
        .map((sc, i) => ({ sc, i }))
        .sort((a, b) => (b.sc.priority ?? 0) - (a.sc.priority ?? 0));

      let progressed = false;

      for (let j = 0; j < sorted.length; j++) {
        const { sc, i } = sorted[j];

        if (!evaluateWhen(sc.when)) continue;

        if (!sc.includeInputs && isEditableTarget(activeElement)) {
          continue;
        }

        const steps = Array.isArray(sc.chord) ? sc.chord : [sc.chord];
        const index = stepsRef.current[i];
        const step = steps[index];

        if (!step) continue;

        if (matchChord(e, step, mapCtrlToMetaOnMac)) {
          stepsRef.current[i]++;
          progressed = true;

          if (stepsRef.current[i] === steps.length) {
            if (sc.preventDefault ?? true) e.preventDefault();
            if (sc.stopPropagation) e.stopPropagation();

            sc.handler(e);
            reset();
            return;
          }
        } else {
          stepsRef.current[i] = 0;
        }
      }

      if (progressed) {
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = window.setTimeout(reset, sequenceTimeout);
      }
    }

    const listener = (e: Event) => onKeyDown(e as KeyboardEvent);

    el.addEventListener("keydown", listener, { capture });

    return () => {
      el.removeEventListener("keydown", listener, { capture });
      reset();
    };
  }, [target, capture]);
}
