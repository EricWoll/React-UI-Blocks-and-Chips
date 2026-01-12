'use client';
import useTypewriterEffect, {
    UseTypewriterOptions,
} from '../hooks/useTypeWriterEffect.hook';

type TypewriterInJsProps = React.HTMLAttributes<HTMLParagraphElement> &
    UseTypewriterOptions;

export default function TypeWriter({
    text,
    startDelay,
    minDelay,
    maxDelay,
    completionPause,
    isReversing,
    loop,
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
    });

    return <p {...props}>{typeWriter.text}</p>;
}
