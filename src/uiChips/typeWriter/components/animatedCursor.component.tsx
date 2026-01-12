import '../cursorBlink.typeWriter.css';

/* Uses Global "keyframe" named 'blink' */
export function AnimatedCursor({
    isBlinking = true,
}: {
    isBlinking?: boolean;
}) {
    return (
        <span
            className={`w-[1ch] ${
                isBlinking ? 'animate-[blink_1s_steps(1)_infinite]' : ''
            }`}
        >
            |
        </span>
    );
}
