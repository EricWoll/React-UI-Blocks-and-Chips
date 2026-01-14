import '../cursorBlink.typeWriter.css';
import clsx from 'clsx';

interface AnimatedCursorProps extends React.HTMLAttributes<HTMLSpanElement> {
    isBlinking?: boolean;
    isVisible?: boolean;
}

/** Uses "keyframe" named 'blink' */
export function AnimatedCursor({
    isBlinking = true,
    isVisible = true,
    className,
    ...props
}: AnimatedCursorProps) {
    if (!isVisible) return null;

    return (
        <span
            className={clsx(
                'w-[1ch]',
                `${isBlinking ? 'animate-[blink_1s_steps(1)_infinite]' : ''}`,
                className
            )}
            {...props}
        >
            |
        </span>
    );
}
