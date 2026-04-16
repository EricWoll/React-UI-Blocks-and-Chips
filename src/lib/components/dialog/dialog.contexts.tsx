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

interface DialogContext {
    isOpen: boolean;
    toggleOpen: () => void;
    setIsOpen: (isOpen: boolean) => void;
    isControlled?: boolean | undefined;
    dialogId?: string;
    isDisabled?: boolean;
}

const DialogContext = createContext<DialogContext | undefined>(undefined);

interface DialogContextProps {
    children: React.ReactNode;
    defaultOpen?: boolean;
    isOpen?: boolean;
    onOpen?: () => void;
    onClose?: () => void;
    onToggle?: (isOpen: boolean) => void;
    dialogId?: string;
    isDisabled?: boolean;
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
 * @param {string} [dialogId] - Unique identifier for the collapsible
 */
function DialogProvider({
    children,
    defaultOpen = false,
    isOpen,
    onOpen,
    onClose,
    onToggle,
    dialogId,
    isDisabled,
}: DialogContextProps) {
    const [uncontrolled, setUncontrolled] = useState<boolean>(defaultOpen);

    const isControlled = isOpen !== undefined;
    const open = isControlled ? isOpen : uncontrolled;

    const prevOpenRef = useRef(open);
    const dialogIdRef = useRef<string>(createId(dialogId, "dialog"));

    useEffect(() => {
        if (isDisabled) return;

        if (open !== prevOpenRef.current) {
            open ? onOpen?.() : onClose?.();
            prevOpenRef.current = open;
        }
    }, [open, onOpen, onClose, isDisabled]);

    const toggleOpen = useCallback(() => {
        if (isDisabled) return;

        const next = !open;
        onToggle?.(next);

        if (!isControlled) {
            setUncontrolled(next);
        }
    }, [open, isControlled, onToggle, isDisabled]);

    const setIsOpen = useCallback(
        (isOpen: boolean) => {
            if (isDisabled) return;

            setUncontrolled(isOpen);
        },
        [isControlled, isDisabled],
    );

    const value = useMemo(
        () => ({
            isOpen: open,
            toggleOpen,
            setIsOpen: isControlled ? () => {} : setIsOpen,
            isControlled,
            dialogId: dialogIdRef.current,
            isDisabled,
        }),
        [open, toggleOpen, isControlled, isDisabled],
    );

    return (
        <DialogContext.Provider value={value}>
            {children}
        </DialogContext.Provider>
    );
}
DialogProvider.displayName = "DialogProvider";

/**
 * Hook to access collapsible context.
 * Must be used within a CollapseAbleProvider.
 *
 * @throws {Error} If used outside of CollapseAbleProvider
 * @returns {CollapseAbleContext} The collapsible context value
 */
function useDialog() {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error("useDialog must be used within a DialogProvider");
    }
    return context;
}
useDialog.displayName = "useDialog";

export { DialogProvider, useDialog };
