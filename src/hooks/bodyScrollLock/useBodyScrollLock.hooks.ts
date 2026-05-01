"use client";
import { useEffect, useLayoutEffect, useRef } from "react";

const useIsomorphicLayoutEffect =
    typeof window !== "undefined" ? useLayoutEffect : useEffect;

// ---------------------------------------------------------------------------
// Shared state
// ---------------------------------------------------------------------------
let activeLockers = new Set<number>();
let lockerIdCounter = 0;

interface SavedStyles {
    overflow: string;
    scrollTop: number;
}

let savedStyles: SavedStyles | null = null;

function getRoot(): HTMLElement {
    const root = document.getElementById("root");
    if (!root) {
        throw new Error("#root element not found");
    }
    return root;
}

function applyLock(): void {
    const root = getRoot();

    savedStyles = {
        overflow: root.style.overflow,
        scrollTop: root.scrollTop,
    };

    root.style.overflow = "hidden";
}

function removeLock(): void {
    if (!savedStyles) return;

    const root = getRoot();

    root.style.overflow = savedStyles.overflow;
    root.scrollTo({ top: savedStyles.scrollTop, behavior: "instant" });

    savedStyles = null;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------
export function useBodyScrollLock(locked: boolean): void {
    const lockerIdRef = useRef<number | null>(null);

    if (lockerIdRef.current === null) {
        lockerIdRef.current = ++lockerIdCounter;
    }

    const lockerId = lockerIdRef.current;

    useIsomorphicLayoutEffect(() => {
        if (!locked) {
            if (activeLockers.has(lockerId)) {
                activeLockers.delete(lockerId);
                if (activeLockers.size === 0) removeLock();
            }
            return;
        }

        const wasEmpty = activeLockers.size === 0;
        activeLockers.add(lockerId);

        if (wasEmpty) applyLock();

        return () => {
            activeLockers.delete(lockerId);
            if (activeLockers.size === 0) removeLock();
        };
    }, [locked, lockerId]);
}
