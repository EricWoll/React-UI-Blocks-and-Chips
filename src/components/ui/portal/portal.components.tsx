"use client";

import { ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePortalLayer } from "./portal.contexts";

interface PortalProps {
  children: ReactNode;
  layer: string;
  zIndex?: number;
}

function Portal({ children, layer, zIndex }: PortalProps) {
  const container = usePortalLayer(layer, { zIndex });
  return createPortal(children, container);
}

Portal.displayName = "Portal";
export { Portal };