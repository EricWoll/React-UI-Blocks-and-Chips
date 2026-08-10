"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";

import {
  KeyboardEngine,
  type KeyboardEngineOptions,
  type KeyboardErrorHandler,
} from "./keyboardEngine";

const KeyboardEngineContext = createContext<KeyboardEngine | null>(null);

export interface KeyboardProviderProps extends PropsWithChildren {
  options?: Omit<KeyboardEngineOptions, "target">;
}

export function KeyboardProvider({
  children,
  options = {},
}: KeyboardProviderProps) {
  const [engine, setEngine] = useState<KeyboardEngine | null>(null);

  /*
   * Keep the latest callback without rebuilding the entire engine whenever
   * the parent creates a new options object.
   */
  const onErrorRef = useRef<KeyboardErrorHandler | undefined>(options.onError);

  useEffect(() => {
    onErrorRef.current = options.onError;
  }, [options.onError]);

  const {
    enabled = true,
    capture = false,
    platform,
    mapCtrlToMetaOnMac = true,
    sequenceTimeout = 750,
    defaultScope = "global",
  } = options;

  useEffect(() => {
    const nextEngine = new KeyboardEngine({
      target: window,
      enabled,
      capture,
      platform,
      mapCtrlToMetaOnMac,
      sequenceTimeout,
      defaultScope,

      onError(error, context) {
        onErrorRef.current?.(error, context);
      },
    });

    setEngine(nextEngine);

    return () => {
      /*
       * Clear context only if this is still the active engine. This matters
       * during dependency changes and React Strict Mode development checks.
       */
      setEngine((currentEngine) =>
        currentEngine === nextEngine ? null : currentEngine,
      );

      nextEngine.destroy();
    };
  }, [capture, platform, mapCtrlToMetaOnMac, sequenceTimeout, defaultScope]);

  useEffect(() => {
    engine?.setEnabled(enabled);
  }, [engine, enabled]);

  /*
   * Do not render consumers until the engine exists. Otherwise consumers call
   * useKeyboardEngineContext during the initial render and receive null before
   * the effect has created the engine.
   */
  if (!engine) {
    return null;
  }

  return (
    <KeyboardEngineContext.Provider value={engine}>
      {children}
    </KeyboardEngineContext.Provider>
  );
}

export function useKeyboardEngineContext(): KeyboardEngine {
  const engine = useContext(KeyboardEngineContext);

  if (!engine) {
    throw new Error(
      "useKeyboardEngineContext must be used inside KeyboardProvider.",
    );
  }

  return engine;
}

export function useOptionalKeyboardEngineContext(): KeyboardEngine | null {
  return useContext(KeyboardEngineContext);
}
