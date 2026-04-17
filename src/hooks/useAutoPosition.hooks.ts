"use client";

import { useCallback, useLayoutEffect, useRef, useEffect } from "react";
import useWindowSize from "@/hooks/useWindowSize.hooks";

export type Placement = "top" | "bottom" | "left" | "right";
export type Align = "start" | "center" | "end";

// Maps each placement to its opposite for flip attempts.
const FLIP_MAP: Record<Placement, Placement> = {
  bottom: "top",
  top: "bottom",
  left: "right",
  right: "left",
};

/**
 * useAutoPosition
 *
 * Positions a `position: fixed` popover relative to an anchor element.
 *
 * Supports:
 * - Viewport-based positioning (fixed positioning assumed)
 * - Mobile zoom offset correction (visualViewport) — via useWindowSize
 * - Auto-flip to opposite side before closing when space is constrained
 * - Auto-close when anchor leaves viewport entirely
 * - Auto-close when popover overlaps anchor on both sides (no room anywhere)
 * - Auto-update on scroll, resize, and anchor resize
 * - rAF-throttled updates on resize; synchronous updates on scroll
 *
 * NOTE: The popover element must use `position: fixed`. Absolute positioning
 * will produce incorrect results since getBoundingClientRect() returns
 * viewport-relative coordinates.
 */
export function useAutoPosition(
  anchorRef: React.RefObject<HTMLElement | null>,
  popoverRef: React.RefObject<HTMLDivElement | null>,
  placement: Placement = "bottom",
  align: Align = "center",
  onCloseFunc?: () => void,
) {
  // useWindowSize gives us rAF-throttled viewport dimensions for resize only.
  // Scroll is handled separately and synchronously — see SCROLL UPDATES below.
  const { wSize: viewport } = useWindowSize();

  // useLayoutEffect keeps these refs current after every committed render.
  // This is the concurrent-mode-safe alternative to assigning during render —
  // React 18 with Suspense data fetching can speculatively render a component
  // without committing it, so a render-time assignment could briefly hold an
  // uncommitted value. useLayoutEffect only fires after a committed render,
  // so .current is always consistent with what's on screen.
  const viewportRef = useRef(viewport);
  useLayoutEffect(() => {
    viewportRef.current = viewport;
  }, [viewport]);

  const onCloseRef = useRef(onCloseFunc);
  useLayoutEffect(() => {
    onCloseRef.current = onCloseFunc;
  }, [onCloseFunc]);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;
    if (!anchor || !popover) return;

    const anchorRect = anchor.getBoundingClientRect();
    // Read popover size before repositioning — reflects last render's dimensions.
    // This is acceptable: size is stable once rendered, and we're only adjusting position.
    const popoverRect = popover.getBoundingClientRect();

    // ---------- CLOSE WHEN ANCHOR LEAVES VIEWPORT ----------
    // Use hook-measured viewport dimensions instead of window.innerWidth/Height
    // so the check stays consistent with the same source used for clamping below.
    const { width: vWidth, height: vHeight } = viewportRef.current;

    const anchorVisible =
      anchorRect.bottom > 0 &&
      anchorRect.top < vHeight &&
      anchorRect.right > 0 &&
      anchorRect.left < vWidth;

    if (!anchorVisible) {
      onCloseRef.current?.();
      return;
    }

    // ---------- POSITION CALCULATOR ----------
    // Extracted so we can call it for both the preferred and flipped placement
    // without duplicating the switch logic.
    const calcPosition = (p: Placement): { top: number; left: number } => {
      const getHorizontalAlign = () => {
        switch (align) {
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

      const getVerticalAlign = () => {
        switch (align) {
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
          return { top: anchorRect.bottom + 8, left: getHorizontalAlign() };
        case "top":
          return {
            top: anchorRect.top - popoverRect.height - 8,
            left: getHorizontalAlign(),
          };
        case "right":
          return { top: getVerticalAlign(), left: anchorRect.right + 8 };
        case "left":
          return {
            top: getVerticalAlign(),
            left: anchorRect.left - popoverRect.width - 8,
          };
      }
    };

    // ---------- OVERLAP CHECK ----------
    // Checks whether a popover placed at the *calculated* (top, left) would
    // overlap the anchor. Uses popoverRect.width/height for the popover's size
    // since that doesn't change with position, but uses the passed-in top/left
    // instead of the live DOM position — so this reflects where it *would* land,
    // not where it currently sits on screen.
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
    // Checks whether there is enough room in the viewport on the given side
    // for the popover to fit without overlapping the anchor. Used alongside
    // wouldOverlap so we correctly distinguish "overlaps anchor" from
    // "pushed into anchor by the viewport clamp".
    const fitsInViewport = (p: Placement): boolean => {
      switch (p) {
        case "bottom":
          return anchorRect.bottom + popoverRect.height + 8 <= vHeight;
        case "top":
          return anchorRect.top - popoverRect.height - 8 >= 0;
        case "right":
          return anchorRect.right + popoverRect.width + 8 <= vWidth;
        case "left":
          return anchorRect.left - popoverRect.width - 8 >= 0;
      }
    };

    // ---------- FLIP LOGIC ----------
    // Prefer the requested placement. If it doesn't fit in the viewport on that
    // side, try the opposite. Only close if neither side has room.
    // fitsInViewport is used here rather than wouldOverlap because the overlap
    // check compares calculated coordinates — which can be correct even when the
    // popover is about to be clamped into the anchor by the viewport boundary.
    let resolvedPlacement = placement;

    if (!fitsInViewport(placement)) {
      const flipped = FLIP_MAP[placement];

      if (!fitsInViewport(flipped)) {
        // Neither side has room — close.
        onCloseRef.current?.();
        return;
      }

      resolvedPlacement = flipped;
    }

    let { top, left } = calcPosition(resolvedPlacement);

    // Final safety: if after clamping the popover would still overlap the anchor
    // (e.g. the anchor is very close to a viewport edge and the popover is large),
    // close rather than render an overlapping popover.
    if (wouldOverlap(top, left)) {
      onCloseRef.current?.();
      return;
    }

    // ---------- CLAMP TO VIEWPORT ----------
    // Hook-measured dimensions account for visualViewport on mobile, so the
    // clamp boundary is correct even during pinch-zoom or with a virtual keyboard open.
    top = Math.max(4, Math.min(top, vHeight - popoverRect.height - 4));
    left = Math.max(4, Math.min(left, vWidth - popoverRect.width - 4));

    // ---------- MOBILE ZOOM FIX ----------
    // visualViewport offsets correct for pinch-zoom panning on mobile.
    // useWindowSize already reads from visualViewport for dimensions, but the
    // *offset* (how far the viewport has panned) still needs to be applied here
    // since it is a positional correction, not a size measurement.
    // Scroll offsets are intentionally NOT applied — getBoundingClientRect()
    // already returns viewport-relative coords, and `position: fixed` elements
    // are positioned relative to the viewport, not the document.
    const vv = window.visualViewport;
    popover.style.left = `${left + (vv?.offsetLeft ?? 0)}px`;
    popover.style.top = `${top + (vv?.offsetTop ?? 0)}px`;

    // placement and align are the only true logical dependencies here.
    // anchorRef/popoverRef are stable refs. viewportRef and onCloseRef are
    // kept current via useLayoutEffect above.
  }, [placement, align, anchorRef, popoverRef]);

  // Keep a stable ref to updatePosition so the scroll listener can always
  // call the latest version without re-registering on every render.
  const updatePositionRef = useRef(updatePosition);
  useLayoutEffect(() => {
    updatePositionRef.current = updatePosition;
  }, [updatePosition]);

  // ---------- RE-POSITION ON VIEWPORT CHANGE (resize) ----------
  // viewport changes on rAF-throttled resize events via useWindowSize.
  // This is the correct update path for resize — rAF throttling is fine
  // because the user isn't actively scrolling.
  useEffect(() => {
    updatePosition();
  }, [viewport, updatePosition]);

  // ---------- SCROLL UPDATES ----------
  // Scroll must be synchronous. If we go through React state (via useWindowSize)
  // or rAF, there is a frame gap between the scroll event and the position write.
  // During that gap the anchor has moved but the popover hasn't, causing visible
  // drift. Calling updatePositionRef.current() directly in the event handler
  // writes style.top/left in the same task as the scroll, eliminating the lag.
  // Capture phase ensures we catch scroll from any scrollable ancestor.
  useEffect(() => {
    const handler = () => updatePositionRef.current();
    window.addEventListener("scroll", handler, {
      passive: true,
      capture: true,
    });
    return () => window.removeEventListener("scroll", handler, true);
  }, []); // empty — handler ref is stable, no need to re-register

  // ---------- ANCHOR RESIZE OBSERVER ----------
  // Only observe the anchor — observing the popover too would cause a feedback
  // loop: updatePosition writes style.left/top → popover reflows → observer
  // fires → repeat. The popover's size is already read fresh inside
  // updatePosition via getBoundingClientRect(), so it doesn't need observing.
  useLayoutEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;

    const ro = new ResizeObserver(updatePosition);
    ro.observe(anchor);

    return () => ro.disconnect();
  }, [anchorRef, updatePosition]);

  // ---------- FIRST RUN ----------
  useLayoutEffect(() => {
    updatePosition();
  }, [updatePosition]);

  return { updatePosition };
}
