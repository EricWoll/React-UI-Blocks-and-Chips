"use client";

import React, { useEffect, useMemo, useRef } from "react";
import { cn } from "@/lib/tools/cn.tools";
import { Portal } from "@/components/ui/portal/portal.components";

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
    /** Accessible label for the dialog — required for screen readers. */
    label: string;
    options?: DrawerOptions;
    backgroundProps?: React.HTMLAttributes<HTMLDivElement>;
    drawerProps?: React.HTMLAttributes<HTMLDivElement>;
};

/**
 * Sliding drawer that can open from any side. Supports custom widths/heights,
 * a dismissible backdrop, body-scroll locking, and keyboard (Escape) dismissal.
 */
function Drawer({
    children,
    isOpen,
    toggleOpen,
    label,
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

    const panelRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLElement | null>(null);
    // Ref-based previous-value tracking — does not cause re-renders, so
    // layout recalculations from useBodyScrollLock cannot accidentally
    // re-trigger the transition logic.
    const isOpenRef = useRef(false);

    useEffect(() => {
        // Transition: closed → open
        if (isOpen && !isOpenRef.current) {
            isOpenRef.current = true;
            triggerRef.current =
                document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null;

            const id = setTimeout(() => {
                const panel = panelRef.current;
                if (!panel) return;
                const focusable = panel.querySelector<HTMLElement>(
                    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
                );
                focusable?.focus();
            }, durationMs);

            return () => clearTimeout(id);
        }

        // Transition: open → closed
        if (!isOpen && isOpenRef.current) {
            isOpenRef.current = false;
            triggerRef.current?.focus();
            triggerRef.current = null;
        }
    }, [isOpen, durationMs]);

    const isHorizontal = direction === "left" || direction === "right";

    const resolvedSize = useMemo(() => {
        if (sizePx !== null && sizePx !== undefined) return sizePx;
        if (typeof window === "undefined") {
            return isHorizontal ? 288 : 600;
        }
        return isHorizontal ? 288 : Math.round(window.innerHeight * 0.8);
    }, [isHorizontal, sizePx]);

    const sizeStyle: React.CSSProperties = isHorizontal
        ? { width: resolvedSize, maxWidth: "85vw", height: "100vh" }
        : { height: resolvedSize, maxHeight: "85vh", width: "100%" };

    const positionClasses = cn("fixed overflow-hidden", {
        "top-0 bottom-0": isHorizontal,
        "left-0": direction === "left",
        "right-0": direction === "right",
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

    const transformValue = isOpen
        ? "translate(0,0)"
        : closedTransform[direction];

    return (
        <Portal layer="Drawer" zIndex={1000}>
            {/* BACKDROP */}
            {hasBackground && (
                <div
                    // Backdrop is purely decorative — always hidden from AT.
                    role="presentation"
                    aria-hidden="true"
                    onClick={toggleOpen}
                    className={cn(
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

            {/* DRAWER PANEL */}
            <div
                ref={panelRef}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                // aria-hidden removes the closed drawer from the AT tree entirely.
                aria-hidden={!isOpen}
                // inert when closed prevents focus from reaching it via Tab.
                // Must be absent (not false) when open.
                {...(!isOpen
                    ? ({
                          inert: "",
                      } as unknown as React.HTMLAttributes<HTMLDivElement>)
                    : {})}
                {...drawerProps}
                className={cn(
                    positionClasses,
                    "shadow-lg bg-white pointer-events-auto",
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
        </Portal>
    );
}

Drawer.displayName = "Drawer";

export { type DrawerOptions, Drawer };
