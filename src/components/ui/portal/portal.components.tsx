"use client";

import { ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePortalLayer } from "./portal.contexts";

interface PortalProps {
  children: ReactNode;
  layer: string;
  zIndex?: number;
  className?: string;
}

function Portal({ children, layer, zIndex, className }: PortalProps) {
  const container = usePortalLayer(layer, { zIndex, className });
  return createPortal(children, container);
}

Portal.displayName = "Portal";
export { Portal };
