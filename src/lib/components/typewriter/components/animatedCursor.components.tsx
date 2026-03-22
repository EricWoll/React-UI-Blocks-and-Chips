import "@/lib/components/uiChips/typewriter/styles/animatedCursor.uiChips.styles.css";
import clsx from "clsx";

interface AnimatedCursorProps extends React.HTMLAttributes<HTMLSpanElement> {
    isBlinking?: boolean;
    isVisible?: boolean;
    cursor?: string;
}

/**
 * Animated cursor component for typewriter effects.
 *
 * @param {boolean} [isBlinking=true] - Whether the cursor should blink
 * @param {boolean} [isVisible=true] - Whether the cursor is visible
 * @param {string} [cursor="|"] - The cursor character to display
 * @param {React.HTMLAttributes<HTMLSpanElement>} props - Additional HTML span attributes
 *
 * @example
 * <AnimatedCursor cursor="_" isBlinking={true} />
 */
function AnimatedCursor({
    isBlinking = true,
    isVisible = true,
    cursor = "|",
    className,
    ...props
}: AnimatedCursorProps) {
    return (
        <span
            className={clsx(
                "inline-block w-[1ch]",
                isBlinking && "animate-[cursor-blink_1s_steps(1)_infinite]",
                !isVisible && "opacity-0",
                className,
            )}
            data-blinking={isBlinking}
            data-visible={isVisible}
            aria-hidden="true"
            {...props}
        >
            {isVisible ? cursor : ""}
        </span>
    );
}

AnimatedCursor.displayName = "AnimatedCursor";

export default AnimatedCursor;
