import React from 'react';
import useTypewriterEffect, {
    UseTypewriterOptions,
} from '../hooks/useTypewriterEffect.uiChips.hooks';

type TypewriterInJsProps = React.HTMLAttributes<HTMLParagraphElement> &
    UseTypewriterOptions;

/**
 * Typewriter text animation component.
 *
 * Renders text with a typewriter effect, supporting forward typing,
 * reverse typing (deletion), looping, and pausing.
 *
 * @example
 * <TypewriterInJs
 *   text="Hello, World!"
 *   loop={true}
 *   minDelay={50}
 *   maxDelay={150}
 * />
 */
function TypewriterEffect({
    text,
    startDelay,
    minDelayMs,
    maxDelayMs,
    completionPause,
    isReversing,
    loop,
    isPaused,
    ...props
}: TypewriterInJsProps) {
    const typewriter = useTypewriterEffect({
        text,
        startDelay,
        minDelayMs,
        maxDelayMs,
        completionPause,
        isReversing,
        loop,
        isPaused,
    });

    return (
        <p
            data-is-paused={typewriter.isPaused}
            data-running={!typewriter.isPaused && !typewriter.isComplete}
            data-reversing={typewriter.isReversing}
            data-complete={typewriter.isComplete}
            {...props}
        >
            {typewriter.text}
        </p>
    );
}

TypewriterEffect.displayName = 'TypewriterEffect';
export default TypewriterEffect;
