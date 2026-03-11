import clsx from "clsx";
import { DialogProvider, useDialog } from "../contexts/dialog.uiChips.contexts";
import { useCallback } from "react";

interface DialogProps {
    children: React.ReactNode;
    dialogId: string;
    defaultOpen?: boolean;
    isControlled?: boolean | undefined;
    controlledIsOpen?: boolean | undefined;
    onOpen?: () => void;
    onClose?: () => void;
    onToggle?: (isOpen: boolean) => void;
}

/**
 * A dialog container component that manages expandable/collapsible content.
 * Can be used in both controlled and uncontrolled modes.
 *
 * @param {React.ReactNode} children - Child components to render within the dialog
 * @param {string} dialogId - Unique identifier
 * @param {boolean} [defaultOpen] - Initial open state (uncontrolled mode)
 * @param {boolean} [isControlled] - Enable controlled mode
 * @param {boolean} [controlledIsOpen] - Open state in controlled mode
 * @param {() => void} [onOpen] - Callback when component opens (closed -> open transition only)
 * @param {() => void} [onClose] - Callback when component closes (open -> closed transition only)
 * @param {(isOpen: boolean) => void} [onToggle] - Callback when toggle is attempted (useful for controlled mode)
 *
 * @example
 * ```tsx
 * <Dialog dialogId="my-dialog">
 *   <DialogTrigger>Click to expand</DialogTrigger>
 *   <DialogContent>
 *     <h2>Dialog Content</h2>
 *     <DialogClose>Close</DialogClose>
 *   </DialogContent>
 * </Dialog>
 * ```
 */
function Dialog({
    children,
    defaultOpen,
    isControlled,
    controlledIsOpen,
    onOpen,
    onClose,
    onToggle,
    dialogId,
}: DialogProps) {
    return (
        <DialogProvider
            isControlled={isControlled}
            defaultOpen={defaultOpen}
            controlledIsOpen={controlledIsOpen}
            onOpen={onOpen}
            onClose={onClose}
            onToggle={onToggle}
            dialogId={dialogId}
        >
            {children}
        </DialogProvider>
    );
}
Dialog.displayName = "Dialog";

interface iDialogContent extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    windowContainerClasssName?: string;
}

/**
 * Internal container component that wraps dialog content.
 * Applies default styling and data attributes for state tracking.
 *
 * @internal
 * @param {React.ReactNode} children - Content to render inside the container
 * @param {string} [windowContainerClasssName] - Classname for the background of the Dialog
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Additional HTML div attributes
 */
function DialogContent({
    children,
    windowContainerClasssName,
    className,
    onClick,
    ...props
}: iDialogContent) {
    const { isOpen, isControlled, dialogId, setIsOpen } = useDialog();

    const handleInnerClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            event.stopPropagation();
            onClick?.(event);
        },
        [onClick],
    );

    if (!isOpen) return null;

    return (
        <div
            className={clsx(
                "fixed inset-0 bg-black/50 w-screen h-screen flex justify-center items-center",
                windowContainerClasssName,
            )}
            aria-hidden={!isOpen}
            onClick={() => setIsOpen(false)}
        >
            <div
                className={clsx("w-90 h-90 bg-white", className)}
                {...props}
                data-open={isOpen}
                data-controlled={isControlled}
                data-dialog-id={dialogId}
                aria-hidden={!isOpen}
                onClick={handleInnerClick}
            >
                {children}
            </div>
        </div>
    );
}
DialogContent.displayName = "DialogContent";

/**
 * Toggle Button for the Dialog Component
 * Can be used in both controlled and uncontrolled modes.
 *
 * @param {React.ReactNode} children - Content to render inside the button
 * @param {React.HTMLAttributes<HTMLButtonElement>} props - Additional HTML div attributes
 */
function DialogTrigger({
    children,
    onClick,
    ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
    const { toggleOpen, isOpen } = useDialog();

    const handleButtonClick = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            onClick?.(event);
            toggleOpen();
        },
        [onClick, toggleOpen],
    );

    return (
        <button
            onClick={handleButtonClick}
            data-dialog-toggle-to={!isOpen}
            {...props}
        >
            {children}
        </button>
    );
}
DialogTrigger.displayName = "DialogTrigger";

/**
 * Close Button for the Dialog Component
 * Can be used in both controlled and uncontrolled modes.
 *
 * @param {React.ReactNode} children - Content to render inside the button
 * @param {React.HTMLAttributes<HTMLButtonElement>} props - Additional HTML div attributes
 */
function DialogClose({
    children,
    onClick,
    ...props
}: React.HTMLAttributes<HTMLButtonElement>) {
    const { setIsOpen } = useDialog();

    const handleButtonClick = useCallback(
        (event: React.MouseEvent<HTMLButtonElement>) => {
            onClick?.(event);
            setIsOpen(false);
        },
        [onClick, setIsOpen],
    );

    return (
        <button onClick={handleButtonClick} {...props}>
            {children}
        </button>
    );
}
DialogClose.displayName = "DialogClose";

export { type DialogProps, Dialog, DialogContent, DialogTrigger, DialogClose };
