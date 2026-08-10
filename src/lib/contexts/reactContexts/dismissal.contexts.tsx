"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

interface Layer {
  id: string;
  getRoots: () => readonly (Element | null | undefined)[];
  onDismiss: () => void;
}

interface DismissalContextValue {
  registerLayer(layer: Layer): () => void;
}

export const DismissalContext = createContext<DismissalContextValue | null>(
  null,
);

export function DismissalProvider({ children }: { children: ReactNode }) {
  const stackRef = useRef<Layer[]>([]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;

      const path = event.composedPath();
      const stack = stackRef.current;
      let hitIndex = -1;

      for (let index = stack.length - 1; index >= 0; index -= 1) {
        const hit = stack[index]
          .getRoots()
          .some((root) => root != null && path.includes(root));
        if (hit) {
          hitIndex = index;
          break;
        }
      }

      // Snapshot callbacks first. A dismissal can synchronously unmount a layer
      // and mutate the live stack while this loop is running.
      const dismiss = stack
        .slice(hitIndex + 1)
        .reverse()
        .map((layer) => layer.onDismiss);

      for (const callback of dismiss) callback();
    };

    document.addEventListener("pointerdown", handlePointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", handlePointerDown, true);
  }, []);

  const registerLayer = useCallback((layer: Layer) => {
    stackRef.current = [...stackRef.current, layer];
    return () => {
      stackRef.current = stackRef.current.filter(
        (candidate) => candidate.id !== layer.id,
      );
    };
  }, []);

  const value = useMemo(() => ({ registerLayer }), [registerLayer]);
  return (
    <DismissalContext.Provider value={value}>
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
  getRoots: () => readonly (Element | null | undefined)[];
  onDismiss: () => void;
}) {
  const context = useContext(DismissalContext);
  const id = useId();
  const getRootsRef = useRef(getRoots);
  const onDismissRef = useRef(onDismiss);
  getRootsRef.current = getRoots;
  onDismissRef.current = onDismiss;

  useEffect(() => {
    if (!enabled || !context) return;
    return context.registerLayer({
      id,
      getRoots: () => getRootsRef.current(),
      onDismiss: () => onDismissRef.current(),
    });
  }, [context, enabled, id]);
}
