import {
    useState,
    createContext,
    useContext,
    useMemo,
    useCallback,
    useRef,
    useEffect,
} from "react";
import createId from "@/lib/tools/createId.tools";

interface CollapseAbleContext {
    isOpen: boolean;
    toggleOpen: () => void;
    setIsOpen: (isOpen: boolean) => void;
    isControlled?: boolean | undefined;
    collapseAbleId?: string;
    durationMs?: number;
}

const CollapseAbleContext = createContext<CollapseAbleContext | undefined>(
    undefined,
);

interface CollapseAbleProviderProps {
    children: React.ReactNode;
    defaultOpen?: boolean;
    isOpen?: boolean | undefined;
    onOpen?: () => void;
    onClose?: () => void;
    onToggle?: (isOpen: boolean) => void;
    collapseAbleId?: string;
    durationMs?: number;
}

/**
 * Provider component for collapsible state management.
 * Supports both controlled and uncontrolled modes.
 *
 * @param {React.ReactNode} children - Child components
 * @param {boolean} [defaultOpen=false] - Initial open state (uncontrolled mode)
 * @param {boolean} [isControlled=false] - Whether the component is controlled
 * @param {boolean} [isOpen] - Open state in controlled mode
 * @param {() => void} [onOpen] - Callback when component opens (closed -> open transition only)
 * @param {() => void} [onClose] - Callback when component closes (open -> closed transition only)
 * @param {(isOpen: boolean) => void} [onToggle] - Callback when toggle function is attempted (useful for controlled mode)
 * @param {string} [collapseAbleId] - Unique identifier for the collapsible
 */
function CollapseAbleProvider({
    children,
    defaultOpen = false,
    isOpen,
    onOpen,
    onClose,
    onToggle,
    collapseAbleId,
    durationMs = 0,
}: CollapseAbleProviderProps) {
    const [uncontrolled, setUncontrolled] = useState<boolean>(defaultOpen);

    const isControlled = isOpen !== undefined;
    const open = isControlled ? isOpen : uncontrolled;

    const prevOpenRef = useRef(open);

    const collapseAbleIdRef = useRef<string>(
        createId(collapseAbleId, "collapseAble"),
    );

    useEffect(() => {
        if (open !== prevOpenRef.current) {
            open ? onOpen?.() : onClose?.();
            prevOpenRef.current = open;
        }
    }, [open, onOpen, onClose]);

    const toggleOpen = useCallback(() => {
        const next = !open;
        onToggle?.(next);

        if (!isControlled) {
            setUncontrolled(next);
        }
    }, [open, isControlled, onToggle]);

    const value = useMemo(
        () => ({
            isOpen: open,
            toggleOpen,
            setIsOpen: isControlled ? () => {} : setUncontrolled,
            isControlled,
            collapseAbleId: collapseAbleIdRef.current,
            durationMs,
        }),
        [open, toggleOpen, isControlled, durationMs],
    );

    return (
        <CollapseAbleContext.Provider value={value}>
            {children}
        </CollapseAbleContext.Provider>
    );
}
CollapseAbleProvider.displayName = "CollapseAbleProvider";

/**
 * Hook to access collapsible context.
 * Must be used within a CollapseAbleProvider.
 *
 * @throws {Error} If used outside of CollapseAbleProvider
 */
function useCollapseAble(): CollapseAbleContext {
    const context = useContext(CollapseAbleContext);
    if (!context) {
        throw new Error(
            "useCollapseAble must be used within a CollapseAbleProvider",
        );
    }
    return context;
}
useCollapseAble.displayName = "useCollapseAble";

export { CollapseAbleProvider, useCollapseAble };
