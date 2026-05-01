import "@/components/ui/typewriter/css/cursorBlink.typeWriter.css";
import { cn } from "@/lib/tools/cn.tools";

type AnimatedCursorProps = React.HTMLAttributes<HTMLSpanElement> & {
    options?: {
        isBlinking: boolean;
        isVisible: boolean;
        cursor: string;
    };
};

const defaultCursorOptions = {
    isBlinking: true,
    isVisible: true,
    cursor: "|",
};

/**
 * Animated cursor component for typewriter effects.
 *
 * @param {Object} options - Cursor animation options
 * @param {React.HTMLAttributes<HTMLSpanElement>} props - Additional HTML span attributes
 *
 * @example
 * <AnimatedCursor cursor="_" isBlinking={true} />
 */
function AnimatedCursor({
    options = defaultCursorOptions,
    className,
    ...props
}: AnimatedCursorProps) {
    const { isBlinking, isVisible, cursor } = options;
    return (
        <span
            className={cn(
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

export { type AnimatedCursorProps, AnimatedCursor };
