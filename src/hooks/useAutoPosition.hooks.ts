"use client";

import { useCallback, useLayoutEffect, useRef, useEffect } from "react";
import useWindowSize from "@/hooks/useWindowSize.hooks";

export type Placement = "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";

/**
 * "fixed"    — positions relative to the viewport. Use with portals or any
 *              element with `position: fixed`. Coordinates come directly from
 *              getBoundingClientRect().
 *
 * "absolute" — positions relative to the popover's offset parent. Use when
 *              the popover is rendered inline (not in a portal) inside a
 *              `position: relative` container. Viewport coords are converted
 *              into the offset parent's coordinate space.
 */
export type PositionStrategy = "fixed" | "absolute";

export type UseAutoPositionOptions = {
  /**
   * Where to render the popover relative to the anchor. Accepts either a
   * single placement or a priority-ordered list.
   *
   * When a list is provided, the hook tries each placement in order and uses
   * the first one that fits in the viewport. If none fit, it falls back to
   * the first entry (and clamps or closes depending on strategy).
   *
   * @example ["bottom", "top"]           // prefer bottom, flip to top
   * @example ["right", "left", "bottom"]  // right-first with two fallbacks
   * @default "bottom"
   */
  placement?: Placement | Placement[];
  align?: Align;
  strategy?: PositionStrategy;
  /**
   * Called when the anchor leaves the viewport or there is no room on either
   * side. Only meaningful for "fixed" strategy — when using "absolute", the
   * anchor scrolling away is expected behavior and you likely don't want this.
   */
  onClose?: () => void;
  /**
   * Gap in px between the anchor edge and the popover. Default: 8.
   */
  gap?: number;
  /**
   * Minimum distance from the viewport edge when clamping. Default: 4.
   * Only applied for "fixed" strategy.
   */
  viewportPadding?: number;
};

/**
 * useAutoPosition
 *
 * Positions a popover relative to an anchor element. Supports both viewport
 * (fixed) and offset-parent (absolute) coordinate strategies.
 *
 * The popover element must have `position: fixed` when using strategy="fixed",
 * or `position: absolute` when using strategy="absolute".
 *
 * Features:
 * - Auto-flip to opposite side when the preferred placement doesn't fit
 * - Auto-close (fixed only) when anchor leaves viewport or no side has room
 * - Mobile zoom offset correction via visualViewport (fixed only)
 * - Re-positions on scroll (synchronous, no rAF gap), resize (rAF-throttled),
 *   and anchor element resize (ResizeObserver)
 */
export function useAutoPosition(
  anchorRef: React.RefObject<HTMLElement | null>,
  popoverRef: React.RefObject<HTMLDivElement | null>,
  {
    placement = ["bottom", "right", "top", "left"],
    align = "center",
    strategy = "fixed",
    onClose,
    gap = 8,
    viewportPadding = 4,
  }: UseAutoPositionOptions = {},
) {
  const { wSize: viewport } = useWindowSize();

  // Keep mutable options in refs — changes should not cause effect re-runs,
  // only the next updatePosition call picks them up.
  const placementRef = useRef(placement);
  placementRef.current = placement;

  const alignRef = useRef(align);
  alignRef.current = align;

  const strategyRef = useRef(strategy);
  strategyRef.current = strategy;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const gapRef = useRef(gap);
  gapRef.current = gap;

  const viewportPaddingRef = useRef(viewportPadding);
  viewportPaddingRef.current = viewportPadding;

  const viewportRef = useRef(viewport);
  useLayoutEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const anchorRect = anchor.getBoundingClientRect();
    const popoverRect = popover.getBoundingClientRect();
    const { width: vWidth, height: vHeight } = viewportRef.current;
    const currentGap = gapRef.current;
    const currentPlacement = placementRef.current;
    const currentAlign = alignRef.current;
    const currentStrategy = strategyRef.current;
    const currentPadding = viewportPaddingRef.current;

    // ---------- CLOSE WHEN ANCHOR LEAVES VIEWPORT (fixed only) ----------
    if (currentStrategy === "fixed") {
      const anchorVisible =
        anchorRect.bottom > 0 &&
        anchorRect.top < vHeight &&
        anchorRect.right > 0 &&
        anchorRect.left < vWidth;

      if (!anchorVisible) {
        onCloseRef.current?.();
        return;
      }
    }

    // ---------- POSITION CALCULATOR ----------
    // All math is done in viewport coordinates first (getBoundingClientRect),
    // then converted to the offset parent's space if strategy is "absolute".
    const calcPosition = (p: Placement): { top: number; left: number } => {
      const getHorizontalAlign = (): number => {
        switch (currentAlign) {
          case "start":
            return anchorRect.left;
          case "center":
            return (
              anchorRect.left + anchorRect.width / 2 - popoverRect.width / 2
            );
          case "end":
            return anchorRect.right - popoverRect.width;
        }
      };

      const getVerticalAlign = (): number => {
        switch (currentAlign) {
          case "start":
            return anchorRect.top;
          case "center":
            return (
              anchorRect.top + anchorRect.height / 2 - popoverRect.height / 2
            );
          case "end":
            return anchorRect.bottom - popoverRect.height;
        }
      };

      switch (p) {
        case "bottom":
          return {
            top: anchorRect.bottom + currentGap,
            left: getHorizontalAlign(),
          };
        case "top":
          return {
            top: anchorRect.top - popoverRect.height - currentGap,
            left: getHorizontalAlign(),
          };
        case "right":
          return {
            top: getVerticalAlign(),
            left: anchorRect.right + currentGap,
          };
        case "left":
          return {
            top: getVerticalAlign(),
            left: anchorRect.left - popoverRect.width - currentGap,
          };
      }
    };

    // ---------- OVERLAP CHECK ----------
    const wouldOverlap = (top: number, left: number): boolean => {
      const right = left + popoverRect.width;
      const bottom = top + popoverRect.height;
      return (
        anchorRect.left < right &&
        anchorRect.right > left &&
        anchorRect.top < bottom &&
        anchorRect.bottom > top
      );
    };

    // ---------- VIEWPORT FIT CHECK ----------
    const fitsInViewport = (p: Placement): boolean => {
      switch (p) {
        case "bottom":
          return anchorRect.bottom + popoverRect.height + currentGap <= vHeight;
        case "top":
          return anchorRect.top - popoverRect.height - currentGap >= 0;
        case "right":
          return anchorRect.right + popoverRect.width + currentGap <= vWidth;
        case "left":
          return anchorRect.left - popoverRect.width - currentGap >= 0;
      }
    };

    // ---------- PLACEMENT RESOLUTION ----------
    // Normalise to an array so single and list placements share one code path.
    // Try each candidate in order and take the first one that fits. If none
    // fit, fall back to the first candidate and let the write step clamp/close.
    const placements = Array.isArray(currentPlacement)
      ? currentPlacement
      : [currentPlacement];

    const resolvedPlacement = placements.find(fitsInViewport) ?? placements[0];

    if (!placements.some(fitsInViewport)) {
      if (currentStrategy === "fixed") {
        onCloseRef.current?.();
        return;
      }
      // For absolute strategy, fall through and clamp instead of closing.
    }

    let { top, left } = calcPosition(resolvedPlacement);

    if (wouldOverlap(top, left)) {
      if (currentStrategy === "fixed") {
        onCloseRef.current?.();
        return;
      }
      // For absolute, just let it clamp — closing is not our call.
    }

    // ---------- FIXED: CLAMP TO VIEWPORT + MOBILE ZOOM FIX ----------
    if (currentStrategy === "fixed") {
      top = Math.max(
        currentPadding,
        Math.min(top, vHeight - popoverRect.height - currentPadding),
      );
      left = Math.max(
        currentPadding,
        Math.min(left, vWidth - popoverRect.width - currentPadding),
      );

      // visualViewport offsets correct for pinch-zoom panning on mobile.
      const vv = window.visualViewport;
      popover.style.top = `${top + (vv?.offsetTop ?? 0)}px`;
      popover.style.left = `${left + (vv?.offsetLeft ?? 0)}px`;
      return;
    }

    // ---------- ABSOLUTE: CONVERT TO OFFSET PARENT SPACE ----------
    // getBoundingClientRect() gives viewport-relative coords. To get the
    // correct absolute position we subtract the offset parent's viewport rect,
    // then add its scroll offset so the value doesn't drift when the container
    // is scrolled.
    //
    // Falls back to documentElement if no offset parent is found (e.g. the
    // popover is not yet in the DOM or has no positioned ancestor).
    const offsetParent = (popover.offsetParent ??
      document.documentElement) as HTMLElement;
    const parentRect = offsetParent.getBoundingClientRect();

    popover.style.top = `${top - parentRect.top + offsetParent.scrollTop}px`;
    popover.style.left = `${left - parentRect.left + offsetParent.scrollLeft}px`;
  }, [anchorRef, popoverRef]);
  // All behavioral options are in refs — only the stable ref objects are deps.

  // Stable ref so scroll/resize handlers always call the latest version
  // without needing to re-register.
  const updatePositionRef = useRef(updatePosition);
  useLayoutEffect(() => {
    updatePositionRef.current = updatePosition;
  }, [updatePosition]);

  // ---------- SCROLL (synchronous) ----------
  // Must not go through rAF or React state — any frame gap causes visible
  // drift between anchor and popover during scroll.
  useEffect(() => {
    const handler = () => updatePositionRef.current();
    window.addEventListener("scroll", handler, {
      passive: true,
      capture: true,
    });
    return () => window.removeEventListener("scroll", handler, true);
  }, []);

  // ---------- RESIZE (rAF-throttled via useWindowSize) ----------
  // rAF throttle is fine here — the user isn't scrolling, so a frame of lag
  // is imperceptible. useWindowSize already handles the rAF scheduling.
  // Skip the initial viewport value (handled by the layout effect below) by
  // only firing when the value actually changes.
  const prevViewportRef = useRef(viewport);
  useEffect(() => {
    if (prevViewportRef.current === viewport) return;
    prevViewportRef.current = viewport;
    updatePositionRef.current();
  }, [viewport]);

  // ---------- ANCHOR RESIZE ----------
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const ro = new ResizeObserver(() => updatePositionRef.current());
    ro.observe(anchor);
    return () => ro.disconnect();
  }, [anchorRef]);

  // ---------- INITIAL POSITION ----------
  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  return { updatePosition };
}
