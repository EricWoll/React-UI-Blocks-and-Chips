import React from "react";
import useTypewriterEffect, {
    UseTypewriterOptions,
} from "@/lib/components/uiChips/typewriter/hooks/useTypewriterEffect.uiChips.hooks";

type TypewriterProps = React.HTMLAttributes<HTMLParagraphElement> &
    UseTypewriterOptions;

/**
 * Typewriter text animation component.
 *
 * @param {string} text - The text to animate
 * @param {number} [startDelay=0] - Initial delay before animation starts
 * @param {number} [minDelayMs=50] - Minimum delay between characters
 * @param {number} [maxDelayMs=150] - Maximum delay between characters
 * @param {number} [completionPause=1000] - Pause after completing the animation
 * @param {boolean} [isReversing=false] - Whether to reverse the animation
 * @param {boolean} [loop=false] - Whether to loop the animation
 * @param {boolean} [isPaused=false] - Whether the animation is paused
 * @param {React.HTMLAttributes<HTMLParagraphElement>} props - Additional HTML paragraph attributes
 *
 * @example
 * ```tsx
 * <Typewriter
 *   text="Hello, World!"
 *   loop={true}
 *   minDelayMs={50}
 *   maxDelayMs={150}
 * />
 * ```
 */
function Typewriter({
    text,
    startDelay,
    minDelayMs,
    maxDelayMs,
    completionPause,
    isReversing,
    loop,
    isPaused,
    ...props
}: TypewriterProps) {
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

    Typewriter.displayName = "Typewriter";
export default Typewriter;
