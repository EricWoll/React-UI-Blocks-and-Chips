import React from 'react';
import useTypewriterEffect, {
    UseTypewriterOptions,
} from '../hooks/useTypeWriterEffect.hook';

type TypewriterInJsProps = React.HTMLAttributes<HTMLParagraphElement> &
    UseTypewriterOptions;

function TypewriterInJs({
    text,
    startDelay,
    minDelay,
    maxDelay,
    completionPause,
    isReversing,
    loop,
    isPaused,
    ...props
}: TypewriterInJsProps) {
    const typeWriter = useTypewriterEffect({
        text: text,
        startDelay: startDelay,
        minDelay: minDelay,
        maxDelay: maxDelay,
        completionPause: completionPause,
        isReversing: isReversing,
        loop: true,
        isPaused: isPaused,
    });

    return (
        <p
            data-running={!typeWriter.isPaused}
            data-reversing={typeWriter.isReversing}
            data-complete={typeWriter.isComplete}
            {...props}
        >
            {typeWriter.text}
        </p>
    );
}

TypewriterInJs.displayName = 'TypewriterInJs';
export default TypewriterInJs;
