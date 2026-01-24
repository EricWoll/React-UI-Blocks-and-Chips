import { useEffect, useState, useRef, useCallback } from 'react';

interface UseTypewriterOptions {
    text: string;
    startDelay?: number;
    minDelayMs?: number;
    maxDelayMs?: number;
    completionPause?: number;
    isReversing?: boolean;
    loop?: boolean;
    isPaused?: boolean;
}

interface TypewriterState {
    currentText: string;
    isReversing: boolean;
    isComplete: boolean;
}

/**
 * Hook that creates a typewriter effect for text.
 *
 * Supports forward typing, reverse typing (deletion), looping, and pausing.
 * Character delays are randomized between minDelay and maxDelay for natural effect.
 *
 * @param options - Configuration options for the typewriter effect
 * @param options.text - Text to type out
 * @param options.startDelay - Delay before typing starts (ms, default: 250)
 * @param options.minDelay - Minimum delay between characters (ms, default: 75)
 * @param options.maxDelay - Maximum delay between characters (ms, default: 300)
 * @param options.completionPause - Pause duration when typing completes before looping (ms, default: 3000)
 * @param options.isReversing - Start in reverse mode/deleting (default: false)
 * @param options.loop - Loop the typing animation (default: false)
 * @param options.isPaused - Pause the animation (default: false)
 *
 * @returns Typewriter state and controls
 * @returns text - The current text being displayed (partially typed)
 * @returns isComplete - Whether the typing animation has completed
 * @returns isReversing - Whether currently in reverse/deletion mode
 * @returns isPaused - Whether the animation is currently paused
 * @returns reset - Function to reset the typewriter to initial state, optionally specify reverse mode
 *
 * @example
 * const typewriter = useTypewriterEffect({
 *   text: "Hello, World!",
 *   loop: true,
 *   minDelay: 50,
 *   maxDelay: 150,
 * });
 *
 * return (
 *   <div>
 *     <p>{typewriter.text}</p>
 *     <button onClick={() => typewriter.reset()}>Reset</button>
 *   </div>
 * );
 */
function useTypewriterEffect({
    text,
    startDelay = 250,
    minDelayMs = 75,
    maxDelayMs = 300,
    completionPause = 3000,
    isReversing = false,
    loop = false,
    isPaused = false,
}: UseTypewriterOptions) {
    const [state, setState] = useState<TypewriterState>({
        currentText: isReversing ? text : '',
        isReversing: isReversing,
        isComplete: false,
    });

    const timerRef = useRef<number | null>(null);

    // Store config in refs to avoid effect re-runs
    const configRef = useRef({
        startDelay,
        minDelayMs,
        maxDelayMs,
        completionPause,
        loop,
    });

    // Update config ref when values change
    useEffect(() => {
        configRef.current = {
            startDelay,
            minDelayMs,
            maxDelayMs,
            completionPause,
            loop,
        };
    }, [startDelay, minDelayMs, maxDelayMs, completionPause, loop]);

    useEffect(() => {
        if (!text || text.length === 0 || isPaused) return;

        const config = configRef.current;
        const atInitialStart =
            (!state.isReversing && state.currentText.length === 0) ||
            (state.isReversing && state.currentText.length === text.length);

        // Calculate delay
        let delay = config.startDelay;
        if (state.isComplete) {
            delay = config.completionPause;
        } else if (!atInitialStart) {
            delay =
                Math.floor(
                    Math.random() * (config.maxDelayMs - config.minDelayMs + 1),
                ) + config.minDelayMs;
        }

        timerRef.current = window.setTimeout(() => {
            setState((prev) => {
                // Handle completion and looping
                if (prev.isComplete) {
                    if (!config.loop) return prev;

                    const nextIsReversing = !prev.isReversing;
                    return {
                        isComplete: false,
                        isReversing: nextIsReversing,
                        currentText: nextIsReversing ? text : '',
                    };
                }

                // Forward typing
                if (!prev.isReversing) {
                    const nextText = text.slice(0, prev.currentText.length + 1);
                    const done = nextText.length === text.length;
                    return {
                        ...prev,
                        currentText: nextText,
                        isComplete: done,
                    };
                }

                // Reverse typing
                const nextText = prev.currentText.slice(0, -1);
                const done = nextText.length === 0;
                return {
                    ...prev,
                    currentText: nextText,
                    isComplete: done,
                };
            });
        }, delay);

        return () => {
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [
        text,
        state.currentText,
        state.isReversing,
        state.isComplete,
        isPaused,
    ]);

    const reset = useCallback(
        (resetToReverse: boolean = isReversing) => {
            if (timerRef.current !== null) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            setState({
                currentText: resetToReverse ? text : '',
                isReversing: resetToReverse,
                isComplete: false,
            });
        },
        [text, isReversing],
    );

    return {
        text: state.currentText,
        isComplete: state.isComplete,
        isReversing: state.isReversing,
        isPaused: isPaused,
        reset,
    };
}

useTypewriterEffect.displayName = 'useTypewriterEffect';

export { type UseTypewriterOptions, type TypewriterState };
export default useTypewriterEffect;
