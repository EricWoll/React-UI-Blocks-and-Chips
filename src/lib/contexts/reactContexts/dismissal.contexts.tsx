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
  /**
   * Called on every pointerdown to get the current set of "inside" roots.
   * Using a function instead of a static Set prevents stale snapshots —
   * particularly the cross-contamination bug where a child layer's portal node
   * gets added to the parent layer's static Set by the MutationObserver,
   * causing the parent to never dismiss when clicking inside the child.
   */
  getRoots: () => (Element | null | undefined)[];
  onDismiss: () => void;
}

export const DismissalContext = createContext<{
  registerLayer: (layer: Layer) => () => void;
} | null>(null);

export function DismissalProvider({ children }: { children: React.ReactNode }) {
  const stackRef = useRef<Layer[]>([]);

  useEffect(() => {
    const handler = (e: PointerEvent) => {
      const path = e.composedPath();
      const stack = stackRef.current;

      // Walk from the top of the stack downward to find the deepest layer
      // whose roots contain the click target. Every layer above that index
      // is considered "outside" and gets dismissed.
      let hitIndex = -1;
      for (let i = stack.length - 1; i >= 0; i--) {
        const roots = stack[i].getRoots();
        const hit = roots.some((el) => el && path.includes(el));
        if (hit) {
          hitIndex = i;
          break;
        }
      }

      for (let i = stack.length - 1; i > hitIndex; i--) {
        stack[i].onDismiss();
      }
    };

    document.addEventListener("pointerdown", handler, { capture: true });
    return () =>
      document.removeEventListener("pointerdown", handler, { capture: true });
  }, []);

  const registerLayer = useCallback((layer: Layer) => {
    stackRef.current = [...stackRef.current, layer];
    return () => {
      stackRef.current = stackRef.current.filter((l) => l.id !== layer.id);
    };
  }, []);

  return (
    <DismissalContext.Provider value={{ registerLayer }}>
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
  /**
   * Returns the set of elements that are considered "inside" this layer.
   * The function is called on every pointerdown while the layer is active,
   * so it always reflects the current DOM state — no stale snapshots, no
   * MutationObserver hacks needed.
   *
   * Include every root that should keep the layer alive when clicked:
   * the trigger, the content panel, and any portal nodes (e.g. nested
   * dropdowns, tooltips) that belong to this layer.
   */
  getRoots: () => (Element | null | undefined)[];
  onDismiss: () => void;
}) {
  const ctx = useContext(DismissalContext);
  const id = useId();

  const getRootsRef = useRef(getRoots);
  getRootsRef.current = getRoots;

  const onDismissRef = useRef(onDismiss);
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!ctx) {
      console.error(
        "useDismissableLayer must be used inside a DismissalProvider",
      );
    }
  }, [ctx]);

  useEffect(() => {
    if (!enabled || !ctx) return;

    return ctx.registerLayer({
      id,
      getRoots: () => getRootsRef.current(),
      onDismiss: () => onDismissRef.current(),
    });
  }, [ctx, enabled, id]);
}
