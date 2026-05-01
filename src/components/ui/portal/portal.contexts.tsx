"use client";

import {
  createContext,
  useContext,
  useRef,
  useCallback,
  ReactNode,
  useLayoutEffect,
} from "react";

interface LayerOptions {
  zIndex?: number;
}

interface PortalContextValue {
  getLayer: (name: string, options?: LayerOptions) => HTMLElement;
}

const PortalContext = createContext<PortalContextValue | null>(null);

export function PortalProvider({ children }: { children: ReactNode }) {
  const layersRef = useRef<Map<string, HTMLElement>>(new Map());

  const getLayer = useCallback((name: string, options?: LayerOptions) => {
    let el = layersRef.current.get(name);

    if (!el) {
      el = document.createElement("div");
      el.id = `portal-layer-${name}`;
      el.dataset.portalLayer = name;
      el.style.position = "fixed";
      el.style.inset = "0";
      el.style.pointerEvents = "none";
      document.body.appendChild(el);
      layersRef.current.set(name, el);
    }

    // Always sync options so the last caller wins (e.g. zIndex updates after
    // the layer is first created). Previously, options set on first creation
    // were permanent — a silent footgun when the same layer was used with
    // different zIndex values across the tree.
    if (options?.zIndex != null) {
      el.style.zIndex = String(options.zIndex);
    }

    return el;
  }, []);

  useLayoutEffect(() => {
    return () => {
      for (const el of layersRef.current.values()) {
        el.remove();
      }
      layersRef.current.clear();
    };
  }, []);

  return (
    <PortalContext.Provider value={{ getLayer }}>
      {children}
    </PortalContext.Provider>
  );
}

export function usePortalLayer(name: string, options?: LayerOptions) {
  const ctx = useContext(PortalContext);
  if (!ctx) {
    throw new Error("usePortalLayer must be used inside <PortalProvider />");
  }
  return ctx.getLayer(name, options);
}