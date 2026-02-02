import {
    useState,
    createContext,
    useContext,
    useMemo,
    useCallback,
} from "react";
import createId from "@/lib/tools/uiTools/createId.uiTools";

interface CollapseAbleContext {
    isOpen: boolean;
    toggleOpen: () => void;
    setIsOpen: (isOpen: boolean) => void;
    isControlled?: boolean | undefined;
    collapseAbleId?: string;
}

const CollapseAbleContext = createContext<CollapseAbleContext | undefined>(
    undefined,
);

interface CollapseAbleProviderProps {
    children: React.ReactNode;
    defaultOpen?: boolean;
    isControlled?: boolean;
    controlledIsOpen?: boolean | undefined;
    onOpen?: () => void;
    onClose?: () => void;
    onToggle?: (isOpen: boolean) => void;
    collapseAbleId?: string;
}

/**
 * Provider component for collapsible state management.
 * Supports both controlled and uncontrolled modes.
 *
 * @param {React.ReactNode} children - Child components
 * @param {boolean} [defaultOpen=false] - Initial open state (uncontrolled mode)
 * @param {boolean} [isControlled=false] - Whether the component is controlled
 * @param {boolean} [controlledIsOpen] - Open state in controlled mode
 * @param {() => void} [onOpen] - Callback when component opens (closed -> open transition only)
 * @param {() => void} [onClose] - Callback when component closes (open -> closed transition only)
 * @param {(isOpen: boolean) => void} [onToggle] - Callback when toggle function is attempted (useful for controlled mode)
 * @param {string} [collapseAbleId] - Unique identifier for the collapsible
 */
function CollapseAbleProvider({
    children,
    defaultOpen = false,
    isControlled = false,
    controlledIsOpen,
    onOpen,
    onClose,
    onToggle,
    collapseAbleId,
}: CollapseAbleProviderProps) {
    const [uncontrolled, setUncontrolled] = useState<boolean>(defaultOpen);

    const [id] = useState<string>(createId(collapseAbleId, "collapseAble"));

    const controlled = isControlled && typeof controlledIsOpen === "boolean";
    const effective = controlled ? (controlledIsOpen as boolean) : uncontrolled;

    const toggleOpen = useCallback(() => {
        const nextState = !effective;
        onToggle?.(nextState);

        if (nextState && !effective) {
            onOpen?.();
        } else if (!nextState && effective) {
            onClose?.();
        }

        if (controlled) return;
        setUncontrolled(nextState);
    }, [controlled, effective, onOpen, onClose, onToggle]);

    const setIsOpen = useCallback(
        (next: boolean) => {
            if (controlled) return;

            const wasOpen = uncontrolled;
            setUncontrolled(next);

            if (next && !wasOpen) {
                onOpen?.();
            } else if (!next && wasOpen) {
                onClose?.();
            }
        },
        [controlled, uncontrolled, onOpen, onClose],
    );

    const value = useMemo(
        () => ({
            isOpen: effective,
            toggleOpen,
            setIsOpen,
            isControlled: controlled,
            collapseAbleId: id,
        }),
        [effective, controlled, id, toggleOpen, setIsOpen],
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
 * @returns {CollapseAbleContext} The collapsible context value
 */
function useCollapseAble() {
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
