"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

const useIsoLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

// -----------------------------------------------------------------------------
// GLOBAL STATE
// -----------------------------------------------------------------------------

let activeLocks = new Set<number>();
let idCounter = 0;

let lockedScrollContainer: HTMLElement | null = null;
let gestureScrollChain: HTMLElement[] = [];

let layoutDirty = false;

// inertia
let lastTime = 0;
let velocityY = 0;
let isInInertia = false;
let inertiaTimeout: number | null = null;

// visibility
const visibilityMap = new Map<HTMLElement, number>();
const observedElements = new WeakSet<HTMLElement>();

// -----------------------------------------------------------------------------
// OBSERVERS
// -----------------------------------------------------------------------------

const resizeObserver = new ResizeObserver(() => {
    layoutDirty = true;
});

const mutationObserver = new MutationObserver(() => {
    layoutDirty = true;
});

const intersectionObserver = new IntersectionObserver(
    (entries) => {
        for (const entry of entries) {
            visibilityMap.set(
                entry.target as HTMLElement,
                entry.intersectionRatio,
            );
        }
    },
    { threshold: [0, 0.25, 0.5, 0.75, 1] },
);

// -----------------------------------------------------------------------------
// HELPERS
// -----------------------------------------------------------------------------

function getRoot(): HTMLElement {
    const el = document.getElementById("root");
    if (!el) throw new Error("#root not found");
    return el;
}

function isFormElementDeep(el: HTMLElement | null): boolean {
    return !!el?.closest("input, textarea, select, [contenteditable=true]");
}

function isScrollable(el: HTMLElement): boolean {
    const style = getComputedStyle(el);

    return (
        (["auto", "scroll", "overlay"].includes(style.overflowY) &&
            el.scrollHeight > el.clientHeight) ||
        (["auto", "scroll", "overlay"].includes(style.overflowX) &&
            el.scrollWidth > el.clientWidth)
    );
}

/**
 * ✅ Shadow‑DOM‑safe scroll chain resolution
 */
function getScrollableChainFromEvent(e: Event): HTMLElement[] {
    const path = e.composedPath?.() ?? [];
    const chain: HTMLElement[] = [];

    for (const node of path) {
        if (
            node instanceof HTMLElement &&
            node !== document.body &&
            isScrollable(node)
        ) {
            chain.push(node);
        }
    }

    return chain;
}

function observeElement(el: HTMLElement) {
    if (observedElements.has(el)) return;
    observedElements.add(el);

    resizeObserver.observe(el);
    intersectionObserver.observe(el);
}

// -----------------------------------------------------------------------------
// VISIBILITY
// -----------------------------------------------------------------------------

function getVisibilityScore(el: HTMLElement): number {
    const ratio = visibilityMap.get(el);
    if (!ratio) return 0;

    const rect = el.getBoundingClientRect();
    const area = rect.width * rect.height;

    const center = rect.top + rect.height / 2;
    const viewportCenter = window.innerHeight / 2;
    const bias = 1 - Math.abs(center - viewportCenter) / window.innerHeight;

    return ratio * area * (0.7 + bias * 0.3);
}

// -----------------------------------------------------------------------------
// SCROLL LOGIC
// -----------------------------------------------------------------------------

const WHEEL_TOLERANCE = 2;

function canScroll(el: HTMLElement, deltaY: number, deltaX = 0): boolean {
    const {
        scrollTop,
        scrollHeight,
        clientHeight,
        scrollLeft,
        scrollWidth,
        clientWidth,
    } = el;

    if (deltaY !== 0) {
        const maxY = scrollHeight - clientHeight;
        if (deltaY > 0) return scrollTop < maxY - WHEEL_TOLERANCE;
        if (deltaY < 0) return scrollTop > WHEEL_TOLERANCE;
    }

    if (deltaX !== 0) {
        const maxX = scrollWidth - clientWidth;
        if (deltaX > 0) return scrollLeft < maxX - WHEEL_TOLERANCE;
        if (deltaX < 0) return scrollLeft > WHEEL_TOLERANCE;
    }

    return false;
}

function pickBestContainer(
    chain: HTMLElement[],
    deltaY: number,
    deltaX: number,
): HTMLElement | null {
    let best: HTMLElement | null = null;
    let bestScore = 0;

    for (const el of chain) {
        if (!canScroll(el, deltaY, deltaX)) continue;

        const score = getVisibilityScore(el);
        if (score > bestScore) {
            best = el;
            bestScore = score;
        }
    }

    return best;
}

// -----------------------------------------------------------------------------
// INPUT TYPE DETECTION
// -----------------------------------------------------------------------------

function detectWheelType(e: WheelEvent): "mouse" | "trackpad" {
    if (e.deltaMode === 1 || e.deltaMode === 2) return "mouse";

    const absX = Math.abs(e.deltaX);
    const absY = Math.abs(e.deltaY);

    if (absX < 40 && absY < 40) return "trackpad";
    if (absY > 80) return "mouse";

    return "trackpad";
}

// -----------------------------------------------------------------------------
// INERTIA
// -----------------------------------------------------------------------------

function updateVelocity(deltaY: number) {
    const now = performance.now();
    const dt = now - lastTime;

    velocityY = dt > 0 ? deltaY / dt : 0;
    lastTime = now;

    if (Math.abs(velocityY) > 1.2) {
        isInInertia = true;
        clearTimeout(inertiaTimeout!);

        inertiaTimeout = window.setTimeout(() => {
            isInInertia = false;
        }, 120);
    }
}

// -----------------------------------------------------------------------------
// WHEEL HANDLER (FULLY FIXED)
// -----------------------------------------------------------------------------

function handleWheel(e: WheelEvent) {
    if (e.defaultPrevented) return;

    // ✅ Allow browser zoom
    if (e.ctrlKey || e.metaKey) return;

    const target = e.target as HTMLElement;
    const deltaY = e.deltaY;
    const deltaX = e.deltaX;

    updateVelocity(deltaY);

    const chain = getScrollableChainFromEvent(e);
    chain.forEach(observeElement);

    // ✅ Inputs: degrade to simple behavior
    if (isFormElementDeep(target)) {
        const canAny = chain.some((el) => canScroll(el, deltaY, deltaX));

        if (!canAny) e.preventDefault();
        return;
    }

    if (!chain.length) {
        e.preventDefault();
        return;
    }

    const type = detectWheelType(e);

    const owner =
        lockedScrollContainer ?? pickBestContainer(chain, deltaY, deltaX);

    if (owner) lockedScrollContainer = owner;

    if (type === "mouse") {
        if (!owner || !canScroll(owner, deltaY, deltaX)) {
            e.preventDefault();
        }
        return;
    }

    // trackpad
    if (!owner || !canScroll(owner, deltaY, deltaX)) {
        if (!isInInertia && Math.abs(velocityY) < 0.4) {
            e.preventDefault();
        }
    }
}

// -----------------------------------------------------------------------------
// HOOK
// -----------------------------------------------------------------------------

export function useBodyScrollLock(locked: boolean) {
    const idRef = useRef<number | null>(null);
    if (idRef.current === null) idRef.current = ++idCounter;

    const id = idRef.current;

    useIsoLayoutEffect(() => {
        if (!locked) {
            activeLocks.delete(id);
            if (activeLocks.size === 0) cleanup();
            return;
        }

        const first = activeLocks.size === 0;
        activeLocks.add(id);
        if (first) apply();

        return () => {
            activeLocks.delete(id);
            if (activeLocks.size === 0) cleanup();
        };
    }, [locked, id]);
}

// -----------------------------------------------------------------------------
// APPLY / CLEANUP
// -----------------------------------------------------------------------------

let saved: any = null;

function apply() {
    const root = getRoot();

    saved = {
        overflow: root.style.overflow,
        scrollTop: root.scrollTop,
        gutter: root.style.scrollbarGutter,
    };

    root.style.overflow = "hidden";
    root.style.scrollbarGutter = "";

    document.addEventListener("wheel", handleWheel, {
        passive: false,
    });

    mutationObserver.observe(root, {
        childList: true,
        subtree: true,
    });
}

function cleanup() {
    const root = getRoot();
    if (!saved) return;

    root.style.overflow = saved.overflow;
    root.style.scrollbarGutter = saved.gutter;
    root.scrollTo({ top: saved.scrollTop });

    document.removeEventListener("wheel", handleWheel);
    mutationObserver.disconnect();

    lockedScrollContainer = null;
    gestureScrollChain = [];
}
