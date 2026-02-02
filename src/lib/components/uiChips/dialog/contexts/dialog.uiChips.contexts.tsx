import {
    useState,
    createContext,
    useContext,
    useMemo,
    useCallback,
} from 'react';
import createId from '@/lib/tools/uiTools/createId.uiTools';
import {
    CollapseAble,
    CollapseAbleContent,
} from '../../collapseAble/components/collapseAble.uiChips.components';

interface DialogContext {
    isOpen: boolean;
    toggleOpen: () => void;
    setIsOpen: (isOpen: boolean) => void;
    isControlled?: boolean | undefined;
    dialogId?: string;
}

const DialogContext = createContext<DialogContext | undefined>(undefined);

interface DialogContextProps {
    children: React.ReactNode;
    defaultOpen?: boolean;
    isControlled?: boolean;
    controlledIsOpen?: boolean | undefined;
    onOpen?: () => void;
    onClose?: () => void;
    onToggle?: (isOpen: boolean) => void;
    dialogId?: string;
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
    isControlled = false,
    controlledIsOpen,
    onOpen,
    onClose,
    onToggle,
    dialogId,
}: DialogContextProps) {
    const [uncontrolled, setUncontrolled] = useState<boolean>(defaultOpen);
    const [id] = useState<string>(createId(dialogId, 'dialog'));

    const controlled = isControlled && typeof controlledIsOpen === 'boolean';
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
            const nextState = !effective;

            if (next && !nextState) {
                onOpen?.();
            } else if (!next && nextState) {
                onClose?.();
            }

            if (controlled) return;
            setUncontrolled(next);
        },
        [controlled, uncontrolled, onOpen, onClose],
    );

    const value = useMemo(
        () => ({
            isOpen: effective,
            toggleOpen,
            setIsOpen,
            isControlled: controlled,
            dialogId: id,
        }),
        [effective, controlled, id, toggleOpen, setIsOpen],
    );

    return (
        <DialogContext.Provider value={value}>
            {children}
        </DialogContext.Provider>
    );
}
DialogProvider.displayName = 'DialogProvider';

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
        throw new Error('useDialog must be used within a DialogProvider');
    }
    return context;
}
useDialog.displayName = 'useDialog';

export { DialogProvider, useDialog };
