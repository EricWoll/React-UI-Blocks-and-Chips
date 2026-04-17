"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

const DEFAULT_IS_CLIENT = typeof window !== "undefined";

export type WindowSize = {
  width: number;
  height: number;
};

/**
 * Tailwind-style breakpoint keys.
 */
export type Breakpoint = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

export type WindowSizeResult<S = WindowSize> = {
  wSize: S;
  isPortrait: boolean;
  isMobile: boolean;
  breakpoint: Breakpoint;
  aspectRatio: number | undefined;
};

export type UseWindowSizeOptions<S = WindowSize> = {
  /**
   * @default { width: 0, height: 0 }
   */
  fallback?: WindowSize;

  /**
   * @example
   * const { value: width } = useWindowSize({ selector: (s) => s.width });
   */
  selector?: (size: WindowSize) => S;

  /**
   * Coarse the update rate with an additional debounce (ms) on top of the rAF
   * throttle. Useful for expensive downstream computations.
   *
   * @default 0  (rAF throttle only)
   */
  debounceMs?: number;

  /**
   * Useful in tests that simulate an SSR environment inside JSDOM.
   *
   * @default true  (in a browser); false (in Node / SSR)
   */
  isClient?: boolean;
};

const BREAKPOINTS: { key: Breakpoint; minWidth: number }[] = [
  { key: "2xl", minWidth: 1536 },
  { key: "xl", minWidth: 1280 },
  { key: "lg", minWidth: 1024 },
  { key: "md", minWidth: 768 },
  { key: "sm", minWidth: 640 },
  { key: "xs", minWidth: 0 },
];

function resolveBreakpoint(width: number): Breakpoint {
  return BREAKPOINTS.find((bp) => width >= bp.minWidth)?.key ?? "xs";
}

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Returns the current viewport size plus derived helpers. SSR-safe.
 *
 * @example — full size
 * const { value, isMobile, breakpoint } = useWindowSize();
 *
 * @example — width only (no re-render on height change)
 * const { value: width } = useWindowSize({ selector: (s) => s.width });
 *
 * @example — SSR with assumed dimensions
 * const { value } = useWindowSize({ fallback: { width: 1280, height: 800 } });
 */
function useWindowSize<S = WindowSize>(
  options: UseWindowSizeOptions<S> = {},
): WindowSizeResult<S> {
  const {
    fallback = { width: 0, height: 0 },
    selector,
    debounceMs = 0,
    isClient = DEFAULT_IS_CLIENT,
  } = options;

  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const frameRef = useRef<number>(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(false);

  const [size, setSize] = useState<WindowSize>(
    isClient
      ? { width: window.innerWidth, height: window.innerHeight }
      : fallback,
  );

  const measure = useCallback((): WindowSize => {
    // accounts for virtual keyboard and pinch-zoom (visualViewport).
    if (window.visualViewport) {
      return {
        width: Math.round(window.visualViewport.width),
        height: Math.round(window.visualViewport.height),
      };
    }
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }, []);

  const scheduleUpdate = useCallback(() => {
    cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      if (!mountedRef.current) return;

      if (debounceMs > 0) {
        if (debounceTimerRef.current !== null) {
          clearTimeout(debounceTimerRef.current);
        }
        debounceTimerRef.current = setTimeout(() => {
          if (mountedRef.current) setSize(measure());
        }, debounceMs);
      } else {
        setSize(measure());
      }
    });
  }, [measure, debounceMs]);

  useIsomorphicLayoutEffect(() => {
    if (!isClient) return;

    mountedRef.current = true;

    // Take an immediate measurement to sync before paint.
    setSize(measure());

    window.addEventListener("resize", scheduleUpdate, { passive: true });

    // covers mobile virtual keyboard + pinch-zoom gaps.
    const vv = window.visualViewport;
    vv?.addEventListener("resize", scheduleUpdate);
    vv?.addEventListener("scroll", scheduleUpdate);

    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(frameRef.current);
      if (debounceTimerRef.current !== null) {
        clearTimeout(debounceTimerRef.current);
      }
      window.removeEventListener("resize", scheduleUpdate);
      vv?.removeEventListener("resize", scheduleUpdate);
      vv?.removeEventListener("scroll", scheduleUpdate);
    };
  }, [isClient, measure, scheduleUpdate]);

  const isPortrait = size.height > size.width;
  const isMobile = size.width < 768;
  const breakpoint = resolveBreakpoint(size.width);
  const aspectRatio =
    isClient && size.height !== 0 ? size.width / size.height : undefined;

  const wSize = (selectorRef.current ? selectorRef.current(size) : size) as S;

  return { wSize, isPortrait, isMobile, breakpoint, aspectRatio };
}

export default useWindowSize;
