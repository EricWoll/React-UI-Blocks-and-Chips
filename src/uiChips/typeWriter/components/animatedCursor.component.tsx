import '../cursorBlink.typeWriter.css';
import clsx from 'clsx';

interface AnimatedCursorProps extends React.HTMLAttributes<HTMLSpanElement> {
    isBlinking?: boolean;
    isVisible?: boolean;
}

function AnimatedCursor({
    isBlinking = true,
    isVisible = true,
    className,
    ...props
}: AnimatedCursorProps) {
    if (!isVisible)
        return <div data-blinking={false} data-visible={isVisible}></div>;

    return (
        <span
            className={clsx(
                'w-[1ch]',
                `${isBlinking ? 'animate-[blink_1s_steps(1)_infinite]' : ''}`,
                className,
            )}
            data-blinking={isBlinking}
            data-visible={isVisible}
            {...props}
        >
            |
        </span>
    );
}
AnimatedCursor.displayName = 'AnimatedCursor';

export default AnimatedCursor;
