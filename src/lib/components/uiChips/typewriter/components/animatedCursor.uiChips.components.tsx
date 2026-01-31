import '@/lib/components/uiChips/typewriter/styling/cursorBlink.typeWriter.css';
import clsx from 'clsx';

interface AnimatedCursorProps extends React.HTMLAttributes<HTMLSpanElement> {
    isBlinking?: boolean;
    isVisible?: boolean;
    cursor?: string;
}

/**
 * Animated cursor component for typewriter effects.
 *
 * Displays a blinking cursor character (default: "|") that can be
 * toggled on/off and made visible/invisible.
 *
 * @example
 * <AnimatedCursor isBlinking={true} isVisible={isTyping} />
 *
 * @example
 * // Custom cursor character
 * <AnimatedCursor cursor="_" isBlinking={true} />
 */
function AnimatedCursor({
    isBlinking = true,
    isVisible = true,
    cursor = '|',
    className,
    ...props
}: AnimatedCursorProps) {
    return (
        <span
            className={clsx(
                'inline-block w-[1ch]',
                isBlinking && 'animate-[cursor-blink_1s_steps(1)_infinite]',
                !isVisible && 'opacity-0',
                className,
            )}
            data-blinking={isBlinking}
            data-visible={isVisible}
            aria-hidden="true"
            {...props}
        >
            {isVisible ? cursor : ''}
        </span>
    );
}

AnimatedCursor.displayName = 'AnimatedCursor';

export default AnimatedCursor;
