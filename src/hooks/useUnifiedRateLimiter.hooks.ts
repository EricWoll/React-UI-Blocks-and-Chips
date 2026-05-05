import { useCallback, useEffect, useRef, useTransition } from 'react';

export type RateLimitMode =
    | 'debounce'
    | 'throttle'
    | 'debounce-throttle'
    | 'transition'
    | 'raf';

export interface UnifiedRateLimitOptions {
    mode: RateLimitMode;
    delay?: number; // debounce delay
    limit?: number; // throttle window
    leading?: boolean; // for debounce / debounce-throttle
    trailing?: boolean; // for debounce / debounce-throttle
    maxWait?: number; // max wait for debounce
    transition?: boolean; // wrap invoke in startTransition
    onPendingChange?: (pending: boolean) => void;
    abortPrevious?: boolean; // inject AbortSignal as last arg and cancel previous
    debug?: boolean;
}

export function useUnifiedRateLimiter<T extends (...args: any[]) => any>(
    fn: T,
    options: UnifiedRateLimitOptions,
) {
    const {
        mode,
        delay = 200,
        limit = 200,
        leading = false,
        trailing = true,
        maxWait,
        transition = false,
        onPendingChange,
        abortPrevious = false,
        debug = false,
    } = options;

    const fnRef = useRef(fn);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const maxWaitRef = useRef<NodeJS.Timeout | null>(null);
    const lastArgsRef = useRef<any[] | null>(null);
    const lastRunRef = useRef(0);
    const frameRef = useRef<number | null>(null);
    const abortRef = useRef<AbortController | null>(null);
    const hasLeadingCalledRef = useRef(false);

    const [isPending, startTransition] = useTransition();

    useEffect(() => {
        fnRef.current = fn;
    }, [fn]);

    useEffect(() => {
        if (onPendingChange) onPendingChange(isPending);
    }, [isPending, onPendingChange]);

    const log = (...msg: any[]) => {
        if (debug) console.log('[UnifiedRateLimiter]', ...msg);
    };

    const createAbortSignal = () => {
        if (!abortPrevious) return undefined;
        if (abortRef.current) abortRef.current.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        return controller.signal;
    };

    const clearTimers = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (maxWaitRef.current) {
            clearTimeout(maxWaitRef.current);
            maxWaitRef.current = null;
        }
        if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
            frameRef.current = null;
        }
    };

    const invoke = useCallback(() => {
        if (!lastArgsRef.current) return;

        let args = lastArgsRef.current;

        const signal = createAbortSignal();
        if (signal) {
            args = [...args, signal];
        }

        const run = () => fnRef.current(...args);

        if (transition) {
            startTransition(run);
        } else {
            run();
        }

        lastArgsRef.current = null;
        hasLeadingCalledRef.current = false;
    }, [transition, abortPrevious]); // abortPrevious used via createAbortSignal

    const cancel = useCallback(() => {
        log('cancel');
        if (abortRef.current) {
            abortRef.current.abort();
            abortRef.current = null;
        }
        clearTimers();
        lastArgsRef.current = null;
        hasLeadingCalledRef.current = false;
        lastRunRef.current = 0;
    }, []);

    const flush = useCallback(() => {
        log('flush');
        if (lastArgsRef.current) invoke();
        clearTimers();
    }, [invoke]);

    const handler = useCallback(
        (...args: Parameters<T>) => {
            const now = Date.now();
            lastArgsRef.current = args;

            switch (mode) {
                case 'debounce': {
                    // Leading edge
                    const isFirstCall = !hasLeadingCalledRef.current;
                    if (leading && isFirstCall) {
                        hasLeadingCalledRef.current = true;
                        lastRunRef.current = now;
                        invoke();
                    }

                    // Clear existing debounce timer
                    if (timerRef.current) clearTimeout(timerRef.current);

                    // Trailing edge
                    if (trailing) {
                        timerRef.current = setTimeout(() => {
                            // If leading only and no trailing, this won't run
                            if (!leading || trailing) {
                                invoke();
                            }
                        }, delay);
                    }

                    // maxWait: ensure it fires at least once within maxWait
                    if (maxWait && !maxWaitRef.current) {
                        maxWaitRef.current = setTimeout(() => {
                            invoke();
                        }, maxWait);
                    }

                    break;
                }

                case 'throttle': {
                    if (now - lastRunRef.current >= limit) {
                        lastRunRef.current = now;
                        invoke();
                    }
                    break;
                }

                case 'debounce-throttle': {
                    // Debounce first, then throttle window
                    if (timerRef.current) clearTimeout(timerRef.current);

                    timerRef.current = setTimeout(() => {
                        const nowInner = Date.now();
                        if (nowInner - lastRunRef.current >= limit) {
                            lastRunRef.current = nowInner;
                            invoke();
                        }
                    }, delay);

                    if (maxWait && !maxWaitRef.current) {
                        maxWaitRef.current = setTimeout(() => {
                            const nowInner = Date.now();
                            if (nowInner - lastRunRef.current >= limit) {
                                lastRunRef.current = nowInner;
                                invoke();
                            }
                        }, maxWait);
                    }

                    break;
                }

                case 'transition': {
                    // Just debounce + transition semantics
                    if (timerRef.current) clearTimeout(timerRef.current);

                    timerRef.current = setTimeout(() => {
                        invoke();
                    }, delay);

                    if (maxWait && !maxWaitRef.current) {
                        maxWaitRef.current = setTimeout(() => {
                            invoke();
                        }, maxWait);
                    }

                    break;
                }

                case 'raf': {
                    // High-frequency events: schedule once per frame
                    if (frameRef.current === null) {
                        frameRef.current = requestAnimationFrame(() => {
                            invoke();
                            frameRef.current = null;
                        });
                    }
                    break;
                }

                default:
                    throw new Error(`Unknown mode: ${mode}`);
            }
        },
        [mode, delay, limit, leading, trailing, maxWait, invoke],
    );

    useEffect(() => cancel, [cancel]);

    return {
        run: handler,
        cancel,
        flush,
        isPending,
    };
}
