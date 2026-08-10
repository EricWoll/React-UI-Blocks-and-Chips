"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface LayerOptions {
  zIndex?: number;
}

interface LayerRecord {
  element: HTMLDivElement;
  users: Map<symbol, number | undefined>;
}

interface PortalContextValue {
  acquireLayer(
    name: string,
    owner: symbol,
    options?: LayerOptions,
  ): HTMLElement;
  releaseLayer(name: string, owner: symbol): void;
}

const PortalContext = createContext<PortalContextValue | null>(null);

function syncZIndex(record: LayerRecord) {
  const values = [...record.users.values()].filter(
    (value): value is number => value !== undefined,
  );
  record.element.style.zIndex = values.length
    ? String(Math.max(...values))
    : "";
}

export function PortalProvider({ children }: { children: ReactNode }) {
  const layersRef = useRef(new Map<string, LayerRecord>());

  const acquireLayer = useCallback(
    (name: string, owner: symbol, options?: LayerOptions) => {
      let record = layersRef.current.get(name);

      if (!record) {
        const element = document.createElement("div");
        element.id = `portal-layer-${name}`;
        element.dataset.portalLayer = name;
        element.style.position = "fixed";
        element.style.inset = "0";
        element.style.pointerEvents = "none";
        document.body.appendChild(element);

        record = { element, users: new Map() };
        layersRef.current.set(name, record);
      }

      record.users.set(owner, options?.zIndex);
      syncZIndex(record);
      return record.element;
    },
    [],
  );

  const releaseLayer = useCallback((name: string, owner: symbol) => {
    const record = layersRef.current.get(name);
    if (!record) return;

    record.users.delete(owner);
    if (record.users.size === 0) {
      record.element.remove();
      layersRef.current.delete(name);
      return;
    }

    syncZIndex(record);
  }, []);

  useLayoutEffect(() => {
    const layers = layersRef.current;
    return () => {
      for (const record of layers.values()) record.element.remove();
      layers.clear();
    };
  }, []);

  const value = useMemo(
    () => ({ acquireLayer, releaseLayer }),
    [acquireLayer, releaseLayer],
  );

  return (
    <PortalContext.Provider value={value}>{children}</PortalContext.Provider>
  );
}

export function usePortalLayer(name: string, options?: LayerOptions) {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error("usePortalLayer must be used inside <PortalProvider>.");
  }

  const ownerRef = useRef<symbol | null>(null);
  if (ownerRef.current === null) ownerRef.current = Symbol(name);
  const owner = ownerRef.current;
  const [element, setElement] = useState<HTMLElement | null>(null);
  const zIndex = options?.zIndex;

  useLayoutEffect(() => {
    const next = context.acquireLayer(name, owner, { zIndex });
    setElement(next);
    return () => context.releaseLayer(name, owner);
  }, [context, name, owner, zIndex]);

  return element;
}
