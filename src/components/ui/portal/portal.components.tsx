"use client";

import { type ReactNode } from "react";
import { createPortal } from "react-dom";
import { usePortalLayer } from "./portal.contexts";

export interface PortalProps {
  children: ReactNode;
  layer: string;
  zIndex?: number;
}

export function Portal({ children, layer, zIndex }: PortalProps) {
  const container = usePortalLayer(layer, { zIndex });
  return container ? createPortal(children, container) : null;
}

Portal.displayName = "Portal";
