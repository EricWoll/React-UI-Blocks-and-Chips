"use client";

import clsx from "clsx";
import { useEffect, useMemo } from "react";

type DrawerDirection = "left" | "right" | "top" | "bottom";

type DrawerOptions = {
  zIndexBase?: number;
  durationMs?: number;
  hasBackground?: boolean;
  direction?: DrawerDirection;
  sizePx?: number | null;
};

type DrawerProps = {
  children: React.ReactNode;
  isOpen: boolean;
  toggleOpen: () => void;
  options?: DrawerOptions;
  backgroundProps?: React.HTMLAttributes<HTMLDivElement>;
  drawerProps?: React.HTMLAttributes<HTMLDivElement>;
};

/**
 * Drawer component: stable, glitch-free, custom-sized sliding drawer.
 * Works from any direction and supports custom widths/heights.
 */
function Drawer({
  children,
  isOpen,
  toggleOpen,
  backgroundProps,
  drawerProps,
  options = {},
}: DrawerProps) {
  const {
    zIndexBase = 50,
    durationMs = 300,
    hasBackground = true,
    direction = "left",
    sizePx = null,
  } = options;

  // BODY SCROLL LOCK
  useEffect(() => {
    const original = document.body.style.overflow;
    if (isOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [isOpen]);

  const isHorizontal = direction === "left" || direction === "right";

  const resolvedSize = useMemo(() => {
    // Custom size always wins
    if (sizePx !== null && sizePx !== undefined) return sizePx;

    // SSR fallback
    if (typeof window === "undefined") {
      return isHorizontal ? 288 : 600;
    }

    // Defaults
    return isHorizontal
      ? 288 // w-72 ≈ 288px
      : Math.round(window.innerHeight * 0.8);
  }, [isHorizontal, sizePx]);

  const sizeStyle: React.CSSProperties = isHorizontal
    ? {
        width: resolvedSize,
        maxWidth: "85vw",
        height: "100vh",
      }
    : {
        height: resolvedSize,
        maxHeight: "85vh",
        width: "100%",
      };

  const positionClasses = clsx("fixed overflow-hidden", {
    // Horizontal
    "top-0 bottom-0": isHorizontal,
    "left-0": direction === "left",
    "right-0": direction === "right",

    // Vertical
    "left-0 right-0": !isHorizontal,
    "top-0": direction === "top",
    "bottom-0": direction === "bottom",
  });

  const closedTransform: Record<DrawerDirection, string> = {
    left: "translateX(-100%)",
    right: "translateX(100%)",
    top: "translateY(-100%)",
    bottom: "translateY(100%)",
  };

  const transformValue = isOpen ? "translate(0,0)" : closedTransform[direction];

  return (
    <div>
      {/* ---------------- BACKDROP ---------------- */}
      {hasBackground && (
        <div
          role="presentation"
          aria-hidden={!isOpen}
          onClick={toggleOpen}
          className={clsx(
            "fixed inset-0 transition-opacity duration-300",
            isOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none",
          )}
          style={{ zIndex: zIndexBase }}
          {...backgroundProps}
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      {/* ---------------- DRAWER PANEL ---------------- */}
      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
        {...drawerProps}
        className={clsx(
          positionClasses,
          "shadow-lg bg-white",
          "overflow-y-auto",
          drawerProps?.className,
        )}
        style={{
          ...sizeStyle,
          transform: transformValue,
          transition: `transform ${durationMs}ms ease-in-out`,
          willChange: "transform",
          zIndex: zIndexBase + 1,
          ...drawerProps?.style,
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && isOpen) toggleOpen();
          drawerProps?.onKeyDown?.(e);
        }}
      >
        <div className="h-full w-full overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

Drawer.displayName = "Drawer";

export { type DrawerOptions, Drawer };
