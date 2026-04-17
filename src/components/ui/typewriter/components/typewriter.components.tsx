"use client";

import React from "react";
import useTypewriterEffect, {
    UseTypewriterOptions,
} from "../hooks/useTypewriterEffect.hooks";

type TypewriterProps = React.HTMLAttributes<HTMLParagraphElement> & {
    text: string;
    options: Omit<UseTypewriterOptions, "text">;
};

/**
 * Typewriter text animation component.
 *
 * @param {string} text - The text to animate
 * @param {Omit<UseTypewriterOptions, 'text'>} options - Typewriter animation options
 * @param {React.HTMLAttributes<HTMLParagraphElement>} props - Additional HTML paragraph attributes
 *
 * @example
 * ```tsx
 * <Typewriter
 *   text="Hello, World!"
 *   options={{
 *     startDelay: 250,
 *     minDelayMs: 75,
 *     maxDelayMs: 300,
 *   }}
 * />
 * ```
 */
function Typewriter({ text, options, ...props }: TypewriterProps) {
    const typewriter = useTypewriterEffect({
        text,
        options: {
            ...options,
        },
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
