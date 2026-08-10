"use client";

import { useCallback, useLayoutEffect, useRef, type RefObject } from "react";

export type Placement = "top" | "bottom" | "left" | "right";

export type Align = "start" | "center" | "end";

export type PositionStrategy = "fixed" | "absolute";

export type UseAutoPositionOptions = {
  /**
   * Controls whether positioning observers and event listeners are active.
   *
   * Pass the dropdown's open state so the hook attaches to the newly mounted
   * popup element each time the dropdown opens.
   *
   * @default true
   */
  enabled?: boolean;

  /**
   * Preferred placement or ordered placement fallbacks.
   *
   * @default ["bottom", "top", "right", "left"]
   */
  placement?: Placement | readonly Placement[];

  /**
   * Alignment along the placement's cross-axis.
   *
   * @default "center"
   */
  align?: Align;

  /**
   * Whether the popup uses viewport-relative or offset-parent-relative
   * coordinates.
   *
   * @default "fixed"
   */
  strategy?: PositionStrategy;

  /**
   * Called when the anchor is completely outside the visual viewport.
   */
  onClose?: () => void;

  /**
   * Space between the anchor and popup.
   *
   * @default 8
   */
  gap?: number;

  /**
   * Minimum space between the popup and viewport edges.
   *
   * @default 8
   */
  viewportPadding?: number;
};

type Point = {
  top: number;
  left: number;
};

type Viewport = {
  top: number;
  left: number;
  width: number;
  height: number;
};

function getOverflow(
  point: Point,
  popupWidth: number,
  popupHeight: number,
  viewport: Viewport,
  padding: number,
): number {
  const viewportLeft = viewport.left + padding;

  const viewportTop = viewport.top + padding;

  const viewportRight = viewport.left + viewport.width - padding;

  const viewportBottom = viewport.top + viewport.height - padding;

  const leftOverflow = Math.max(0, viewportLeft - point.left);

  const rightOverflow = Math.max(0, point.left + popupWidth - viewportRight);

  const topOverflow = Math.max(0, viewportTop - point.top);

  const bottomOverflow = Math.max(0, point.top + popupHeight - viewportBottom);

  return leftOverflow + rightOverflow + topOverflow + bottomOverflow;
}

function getScrollParents(element: Element | null): Array<Element | Window> {
  const parents: Array<Element | Window> = [];

  let current = element?.parentElement ?? null;

  while (current) {
    const style = window.getComputedStyle(current);

    const overflow = [style.overflow, style.overflowX, style.overflowY].join(
      " ",
    );

    if (/(auto|scroll|overlay|hidden|clip)/.test(overflow)) {
      parents.push(current);
    }

    current = current.parentElement;
  }

  parents.push(window);

  return parents;
}

function isVerticalPlacement(
  placement: Placement,
): placement is "top" | "bottom" {
  return placement === "top" || placement === "bottom";
}

export function useAutoPosition(
  anchorRef: RefObject<HTMLElement | null>,
  popoverRef: RefObject<HTMLElement | null>,
  options: UseAutoPositionOptions = {},
) {
  /*
   * Keep options current without forcing updatePosition and scheduleUpdate
   * to receive new identities every time an options object is recreated.
   */
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const animationFrameRef = useRef<number | null>(null);

  const lastPositionRef = useRef("");

  /*
   * Tracks the specific positioned DOM element.
   *
   * A reopened portal creates a new element that can have the same calculated
   * coordinates as the previous one. Coordinate equality alone is therefore
   * not enough to skip the style writes.
   */
  const positionedElementRef = useRef<HTMLElement | null>(null);

  const updatePosition = useCallback(() => {
    const anchor = anchorRef.current;
    const popover = popoverRef.current;

    if (!anchor || !popover || !anchor.isConnected || !popover.isConnected) {
      return;
    }

    const {
      placement = ["bottom", "top", "right", "left"],
      align = "center",
      strategy = "fixed",
      onClose,
      gap = 8,
      viewportPadding = 8,
    } = optionsRef.current;

    const placements: readonly Placement[] = Array.isArray(placement)
      ? placement
      : [placement];

    if (placements.length === 0) {
      return;
    }

    const visualViewport = window.visualViewport;

    const viewport: Viewport = {
      left: visualViewport?.offsetLeft ?? 0,

      top: visualViewport?.offsetTop ?? 0,

      width: visualViewport?.width ?? document.documentElement.clientWidth,

      height: visualViewport?.height ?? document.documentElement.clientHeight,
    };

    const viewportLeft = viewport.left + viewportPadding;

    const viewportTop = viewport.top + viewportPadding;

    const viewportRight = viewport.left + viewport.width - viewportPadding;

    const viewportBottom = viewport.top + viewport.height - viewportPadding;

    const anchorRect = anchor.getBoundingClientRect();

    const anchorIsVisible =
      anchorRect.bottom > viewport.top &&
      anchorRect.top < viewport.top + viewport.height &&
      anchorRect.right > viewport.left &&
      anchorRect.left < viewport.left + viewport.width;

    if (!anchorIsVisible) {
      onClose?.();
      return;
    }

    /*
     * Remove constraints from the previous calculation before measuring.
     *
     * Without this reset, a popup previously constrained to a small height
     * can remain unnecessarily small after more space becomes available.
     */
    popover.style.removeProperty("--dropdown-available-height");

    popover.style.removeProperty("--dropdown-available-width");

    let popoverRect = popover.getBoundingClientRect();

    const getAvailableMainAxisSpace = (candidate: Placement): number => {
      switch (candidate) {
        case "bottom":
          return Math.max(0, viewportBottom - (anchorRect.bottom + gap));

        case "top":
          return Math.max(0, anchorRect.top - gap - viewportTop);

        case "right":
          return Math.max(0, viewportRight - (anchorRect.right + gap));

        case "left":
          return Math.max(0, anchorRect.left - gap - viewportLeft);
      }
    };

    const getPoint = (
      candidate: Placement,
      popupWidth: number,
      popupHeight: number,
    ): Point => {
      const horizontalPosition =
        align === "start"
          ? anchorRect.left
          : align === "end"
            ? anchorRect.right - popupWidth
            : anchorRect.left + (anchorRect.width - popupWidth) / 2;

      const verticalPosition =
        align === "start"
          ? anchorRect.top
          : align === "end"
            ? anchorRect.bottom - popupHeight
            : anchorRect.top + (anchorRect.height - popupHeight) / 2;

      switch (candidate) {
        case "top":
          return {
            top: anchorRect.top - popupHeight - gap,
            left: horizontalPosition,
          };

        case "bottom":
          return {
            top: anchorRect.bottom + gap,
            left: horizontalPosition,
          };

        case "left":
          return {
            top: verticalPosition,
            left: anchorRect.left - popupWidth - gap,
          };

        case "right":
          return {
            top: verticalPosition,
            left: anchorRect.right + gap,
          };
      }
    };

    /*
     * Prefer the first placement that fully fits.
     *
     * If no placement fits, choose the candidate with the least overflow.
     * When overflow scores tie, choose the side with more usable space.
     */
    let resolvedPlacement = placements[0];

    let bestOverflow = Number.POSITIVE_INFINITY;

    let bestAvailableSpace = -1;

    for (const candidate of placements) {
      const candidatePoint = getPoint(
        candidate,
        popoverRect.width,
        popoverRect.height,
      );

      const candidateOverflow = getOverflow(
        candidatePoint,
        popoverRect.width,
        popoverRect.height,
        viewport,
        viewportPadding,
      );

      const candidateAvailableSpace = getAvailableMainAxisSpace(candidate);

      const isBetterCandidate =
        candidateOverflow < bestOverflow ||
        (candidateOverflow === bestOverflow &&
          candidateAvailableSpace > bestAvailableSpace);

      if (isBetterCandidate) {
        resolvedPlacement = candidate;
        bestOverflow = candidateOverflow;
        bestAvailableSpace = candidateAvailableSpace;
      }

      /*
       * Preserve the caller's fallback priority. The first placement that
       * completely fits wins.
       */
      if (candidateOverflow === 0) {
        break;
      }
    }

    /*
     * Constrain the popup to the selected side instead of moving it across
     * the anchor.
     *
     * A vertically placed dropdown receives the exact vertical space
     * available above or below the anchor. Its CSS should use this custom
     * property as part of max-height and provide overflow-y: auto.
     */
    if (isVerticalPlacement(resolvedPlacement)) {
      const availableHeight = Math.max(
        0,
        Math.floor(getAvailableMainAxisSpace(resolvedPlacement)),
      );

      popover.style.setProperty(
        "--dropdown-available-height",
        `${availableHeight}px`,
      );

      popover.style.setProperty(
        "--dropdown-available-width",
        `${Math.max(0, Math.floor(viewportRight - viewportLeft))}px`,
      );
    } else {
      /*
       * Left and right placements are constrained horizontally. Their height
       * can use the complete padded viewport.
       */
      const availableWidth = Math.max(
        0,
        Math.floor(getAvailableMainAxisSpace(resolvedPlacement)),
      );

      popover.style.setProperty(
        "--dropdown-available-width",
        `${availableWidth}px`,
      );

      popover.style.setProperty(
        "--dropdown-available-height",
        `${Math.max(0, Math.floor(viewportBottom - viewportTop))}px`,
      );
    }

    /*
     * Applying the custom size constraints may change the popup dimensions.
     * Measure again before calculating the final coordinates.
     */
    popoverRect = popover.getBoundingClientRect();

    let point = getPoint(
      resolvedPlacement,
      popoverRect.width,
      popoverRect.height,
    );

    if (isVerticalPlacement(resolvedPlacement)) {
      /*
       * For top and bottom placements, vertical placement is sacred.
       *
       * Clamp only horizontally so the popup cannot be moved across and over
       * its anchor.
       */
      const maximumLeft = Math.max(
        viewportLeft,
        viewportRight - popoverRect.width,
      );

      point.left = Math.min(Math.max(point.left, viewportLeft), maximumLeft);
    } else {
      /*
       * For left and right placements, horizontal placement is sacred.
       *
       * Clamp only vertically.
       */
      const maximumTop = Math.max(
        viewportTop,
        viewportBottom - popoverRect.height,
      );

      point.top = Math.min(Math.max(point.top, viewportTop), maximumTop);
    }

    if (strategy === "absolute") {
      const offsetParent =
        (popover.offsetParent as HTMLElement | null) ??
        document.documentElement;

      const parentRect = offsetParent.getBoundingClientRect();

      point = {
        top: point.top - parentRect.top + offsetParent.scrollTop,

        left: point.left - parentRect.left + offsetParent.scrollLeft,
      };
    }

    const roundedLeft = Math.round(point.left);

    const roundedTop = Math.round(point.top);

    const positionKey = [
      roundedLeft,
      roundedTop,
      resolvedPlacement,
      strategy,
      Math.round(popoverRect.width),
      Math.round(popoverRect.height),
    ].join(",");

    const isSameElement = positionedElementRef.current === popover;

    const isAlreadyPositioned = popover.dataset.positioned === "true";

    if (
      isSameElement &&
      isAlreadyPositioned &&
      lastPositionRef.current === positionKey
    ) {
      return;
    }

    positionedElementRef.current = popover;

    lastPositionRef.current = positionKey;

    popover.style.position = strategy;

    popover.style.left = `${roundedLeft}px`;

    popover.style.top = `${roundedTop}px`;

    popover.style.visibility = "visible";

    popover.dataset.placement = resolvedPlacement;

    popover.dataset.positioned = "true";
  }, [anchorRef, popoverRef]);

  const schedulePositionUpdate = useCallback(() => {
    if (animationFrameRef.current !== null) {
      return;
    }

    animationFrameRef.current = window.requestAnimationFrame(() => {
      animationFrameRef.current = null;

      updatePosition();
    });
  }, [updatePosition]);

  const enabled = options.enabled ?? true;

  useLayoutEffect(() => {
    if (!enabled) {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);

        animationFrameRef.current = null;
      }

      lastPositionRef.current = "";
      positionedElementRef.current = null;

      return;
    }

    let resizeObserver: ResizeObserver | null = null;

    let observedAnchor: HTMLElement | null = null;

    let observedPopover: HTMLElement | null = null;

    let scrollParentsList: Array<Element | Window> = [];

    let retryFrame: number | null = null;

    let cancelled = false;
    let attached = false;

    const attach = () => {
      if (cancelled || attached) {
        return;
      }

      const anchor = anchorRef.current;

      const popover = popoverRef.current;

      /*
       * Portal content may not exist during this component's first layout
       * effect. Retry on the next frame until the new popup node is mounted.
       */
      if (!anchor || !popover) {
        retryFrame = window.requestAnimationFrame(attach);

        return;
      }

      attached = true;
      observedAnchor = anchor;
      observedPopover = popover;

      /*
       * Mark the new popup as unpositioned. It may receive exactly the same
       * coordinates as the popup from the previous open cycle.
       */
      popover.dataset.positioned = "false";

      positionedElementRef.current = null;

      lastPositionRef.current = "";

      updatePosition();

      resizeObserver = new ResizeObserver(() => {
        schedulePositionUpdate();
      });

      resizeObserver.observe(anchor);
      resizeObserver.observe(popover);

      scrollParentsList = [
        ...new Set([...getScrollParents(anchor), ...getScrollParents(popover)]),
      ];

      for (const parent of scrollParentsList) {
        parent.addEventListener("scroll", schedulePositionUpdate, {
          passive: true,
        });
      }

      window.addEventListener("resize", schedulePositionUpdate, {
        passive: true,
      });

      window.visualViewport?.addEventListener(
        "resize",
        schedulePositionUpdate,
        {
          passive: true,
        },
      );

      window.visualViewport?.addEventListener(
        "scroll",
        schedulePositionUpdate,
        {
          passive: true,
        },
      );
    };

    attach();

    return () => {
      cancelled = true;
      attached = false;

      if (retryFrame !== null) {
        window.cancelAnimationFrame(retryFrame);
      }

      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);

        animationFrameRef.current = null;
      }

      resizeObserver?.disconnect();

      for (const parent of scrollParentsList) {
        parent.removeEventListener("scroll", schedulePositionUpdate);
      }

      window.removeEventListener("resize", schedulePositionUpdate);

      window.visualViewport?.removeEventListener(
        "resize",
        schedulePositionUpdate,
      );

      window.visualViewport?.removeEventListener(
        "scroll",
        schedulePositionUpdate,
      );

      /*
       * Only reset the specific nodes observed by this effect. Refs may
       * already point to nodes belonging to a newer open cycle.
       */
      if (observedPopover) {
        observedPopover.dataset.positioned = "false";
      }

      observedAnchor = null;
      observedPopover = null;
      scrollParentsList = [];

      positionedElementRef.current = null;

      lastPositionRef.current = "";
    };
  }, [enabled, anchorRef, popoverRef, schedulePositionUpdate, updatePosition]);

  return {
    updatePosition,
    schedulePositionUpdate,
  };
}
