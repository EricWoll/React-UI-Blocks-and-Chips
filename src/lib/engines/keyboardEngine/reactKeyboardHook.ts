"use client";

import {
  RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";

import {
  KeyboardEngine,
  type KeyboardEngineOptions,
  type ShortcutDefinition,
  type ShortcutHandler,
} from "./keyboardEngine";

const useIsomorphicLayoutEffect =
  typeof window === "undefined"
    ? useEffect
    : useLayoutEffect;

function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);

  useIsomorphicLayoutEffect(() => {
    ref.current = value;
  });

  return ref;
}

export interface UseKeyboardEngineOptions
  extends KeyboardEngineOptions {
  /**
   * If false, the engine exists but ignores keyboard input.
   */
  enabled?: boolean;
}

/**
 * Creates one KeyboardEngine for the component's mounted lifetime.
 *
 * Options are treated as construction options. If target or capture must
 * change, mount the hook under a differently keyed component.
 */
export function useKeyboardEngine(
  options: UseKeyboardEngineOptions = {},
): KeyboardEngine | null {
  const engineRef = useRef<KeyboardEngine | null>(null);
  const errorHandlerRef = useLatest(options.onError);

  useEffect(() => {
    const engine = new KeyboardEngine({
      ...options,
      onError: (error, context) => {
        errorHandlerRef.current?.(error, context);
      },
    });

    engine.setEnabled(options.enabled ?? true);
    engineRef.current = engine;

    return () => {
      engineRef.current = null;
      engine.destroy();
    };

    /*
     * These are engine construction options. Rebuilding an engine because an
     * object literal changed identity would be worse than requiring callers to
     * treat them as construction-time configuration.
     */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    options.target,
    options.capture,
    options.platform,
    options.mapCtrlToMetaOnMac,
    options.sequenceTimeout,
    options.defaultScope,
  ]);

  useEffect(() => {
    engineRef.current?.setEnabled(options.enabled ?? true);
  }, [options.enabled]);

  return engineRef.current;
}

export interface UseShortcutsOptions {
  enabled?: boolean;
}

/**
 * Registers React shortcuts without allowing handlers or `when` callbacks to
 * become stale.
 *
 * Registration structure is updated when the definitions array changes.
 * Handler execution always delegates to the latest definitions.
 */
export function useShortcuts(
  engine: KeyboardEngine | null,
  definitions: readonly ShortcutDefinition[],
  options: UseShortcutsOptions = {},
): void {
  const definitionsRef = useLatest(definitions);
  const enabledRef = useLatest(options.enabled ?? true);

  useEffect(() => {
    if (!engine || definitions.length === 0) {
      return;
    }

    const controller = new AbortController();

    const registrations = definitions.map(
      (definition, index): ShortcutDefinition => {
        const stableHandler: ShortcutHandler = (context) => {
          if (!enabledRef.current) {
            return;
          }

          return definitionsRef.current[index]?.handler(context);
        };

        return {
          ...definition,

          when: () => {
            if (!enabledRef.current) {
              return false;
            }

            const latest = definitionsRef.current[index];

            if (!latest) {
              return false;
            }

            if (latest.when === undefined) {
              return true;
            }

            return typeof latest.when === "function"
              ? latest.when()
              : latest.when;
          },

          handler: stableHandler,
          signal: controller.signal,
        };
      },
    );

    engine.registerMany(registrations);

    return () => {
      controller.abort();
    };
  }, [engine, definitions, definitionsRef, enabledRef]);
}

export function useKeyboardScope(
  engine: KeyboardEngine | null,
  scope: string,
  active = true,
): void {
  useEffect(() => {
    if (!engine || !active) {
      return;
    }

    return engine.pushScope(scope);
  }, [engine, scope, active]);
}