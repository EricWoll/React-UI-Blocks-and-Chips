"use client";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
} from "react";

interface Layer {
  id: string;
  /** Returns the set of roots that belong to this layer (incl. portals). */
  getRoots: () => Array<Element | null | undefined>;
  onDismiss: () => void;
}

interface DismissalContextValue {
  register: (layer: Layer) => () => void;
}

const DismissalContext = createContext<DismissalContextValue | null>(null);

export function DismissalProvider({ children }: { children: React.ReactNode }) {
  // Ordered stack: index 0 = bottom (dialog), last index = top (dropdown)
  const stackRef = useRef<Layer[]>([]);

  useEffect(() => {
    const handler = (e: PointerEvent): void => {
      const path = e.composedPath();
      const stack = stackRef.current;

      // Walk top-to-bottom, find the highest layer that was actually hit
      let hitIndex = -1;
      for (let i = stack.length - 1; i >= 0; i--) {
        const hit = stack[i]
          .getRoots()
          .some((el) => el != null && path.includes(el));
        if (hit) {
          hitIndex = i;
          break;
        }
      }

      // Dismiss every layer above the hit (or all of them if nothing was hit)
      for (let i = stack.length - 1; i > hitIndex; i--) {
        stack[i].onDismiss();
      }
    };

    // capture: true so we see the event before React's synthetic system
    document.addEventListener("pointerdown", handler, { capture: true });
    return () =>
      document.removeEventListener("pointerdown", handler, { capture: true });
  }, []);

  const register = useCallback((layer: Layer): (() => void) => {
    stackRef.current = [...stackRef.current, layer];
    return () => {
      stackRef.current = stackRef.current.filter((l) => l.id !== layer.id);
    };
  }, []);

  return (
    <DismissalContext.Provider value={{ register }}>
      {children}
    </DismissalContext.Provider>
  );
}

export function useDismissableLayer({
  enabled,
  getRoots,
  onDismiss,
}: {
  enabled: boolean;
  /** Must be stable — wrap in useCallback at the call site. */
  getRoots: () => Array<Element | null | undefined>;
  /** Must be stable — wrap in useCallback at the call site. */
  onDismiss: () => void;
}): void {
  const ctx = useContext(DismissalContext);
  const id = useId(); // React 18+ — stable, no module-level mutable globals

  // Keep the latest callbacks in refs so the effect never needs to re-run
  // when they change identity (common with inline arrow functions)
  const getRootsRef = useRef(getRoots);
  const onDismissRef = useRef(onDismiss);
  getRootsRef.current = getRoots;
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!ctx || !enabled) return;
    return ctx.register({
      id,
      getRoots: () => getRootsRef.current(),
      onDismiss: () => onDismissRef.current(),
    });
  }, [ctx, enabled, id]);
}
