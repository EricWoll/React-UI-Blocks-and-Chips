import { useEffect, useState, useRef } from 'react';

interface UseTypewriterOptions {
    text: string;
    startDelay?: number;
    minDelay?: number;
    maxDelay?: number;
    completionPause?: number;
    isReversing?: boolean;
    loop?: boolean;
    isPaused?: boolean;
}

interface TyperwriterState {
    currentText: string;
    isReversing: boolean;
    isComplete: boolean;
    textIndex: number;
    isPaused?: boolean;
}

function useTypewriterEffect({
    text,
    startDelay = 250,
    minDelay = 75,
    maxDelay = 300,
    completionPause = 3000,
    isReversing = false,
    loop = false,
    isPaused = false,
}: UseTypewriterOptions) {
    const [state, setState] = useState<TyperwriterState>({
        currentText: isReversing ? text : '',
        isReversing: isReversing,
        isComplete: false,
        textIndex: isReversing ? Math.max(text.length - 1, 0) : 0,
    });

    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!text || text.length === 0) return;
        if (isPaused) return;

        const atInitialStart =
            (!state.isReversing && state.currentText.length === 0) ||
            (state.isReversing && state.currentText.length === text.length);

        // Sets Up Delay
        let delay = startDelay;
        if (state.isComplete) {
            delay = completionPause;
        }
        if (!state.isComplete && !atInitialStart) {
            delay =
                Math.floor(Math.random() * (maxDelay - minDelay + 1)) +
                minDelay;
        }

        timerRef.current = window.setTimeout(() => {
            setState((prev) => {
                if (prev.isComplete) {
                    if (!loop) return prev;

                    const nextIsReversing = !prev.isReversing;

                    // loop complete, reset to start
                    return {
                        ...prev,
                        isComplete: false,
                        isReversing: nextIsReversing,
                        currentText: nextIsReversing ? text : '',
                        textIndex: nextIsReversing
                            ? Math.max(text.length - 1, 0)
                            : 0,
                    };
                }

                // Forward Typing
                if (!prev.isReversing) {
                    const nextText = text.slice(0, prev.currentText.length + 1);
                    const done = nextText.length === text.length;
                    return {
                        ...prev,
                        currentText: nextText,
                        isComplete: done,
                        textIndex: Math.min(
                            prev.textIndex + 1,
                            Math.max(text.length - 1, 0)
                        ),
                    };
                }

                // Reversing typing
                const nextText = prev.currentText.slice(0, -1);
                const done = nextText.length === 0;
                return {
                    ...prev,
                    currentText: nextText,
                    isComplete: done,
                    textIndex: Math.max(prev.textIndex - 1, 0),
                };
            });
        }, delay);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [
        text,
        startDelay,
        minDelay,
        maxDelay,
        completionPause,
        isReversing,
        loop,
        state.currentText,
        state.isReversing,
        state.isComplete,
        isPaused,
    ]);

    const reset = (isReverse: boolean = isReversing) => {
        setState({
            currentText: isReverse ? text : '',
            isReversing: isReverse,
            isComplete: false,
            textIndex: isReverse ? Math.max(text.length - 1, 0) : 0,
        });
    };

    return {
        text: state.currentText,
        isComplete: state.isComplete,
        isReversing: state.isReversing,
        isPaused: isPaused,
        textIndex: state.textIndex,
        reset,
    };
}

useTypewriterEffect.displayName = 'useTypewriterEffect';

export { type UseTypewriterOptions, type TyperwriterState };

export default useTypewriterEffect;
