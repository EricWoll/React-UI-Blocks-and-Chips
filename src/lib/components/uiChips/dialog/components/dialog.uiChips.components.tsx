import clsx from 'clsx';
import { DialogProvider, useDialog } from '../contexts/dialog.uiChips.contexts';
import { useCallback } from 'react';

interface DialogProps {
    dialogId: string;
    defaultOpen?: boolean;
    isControlled?: boolean | undefined;
    controlledIsOpen?: boolean | undefined;
    onOpen?: () => void;
    onClose?: () => void;
    onToggle?: (isOpen: boolean) => void;
    windowContainerClasssName: string;
}

type iDialog = DialogProps & React.HTMLAttributes<HTMLDivElement>;

/**
 * A dialog container component that manages expandable/collapsible content.
 * Can be used in both controlled and uncontrolled modes.
 *
 * @param {React.ReactNode} children - Child components to render within the dialog
 * @param {boolean} [defaultOpen] - Initial open state (uncontrolled mode)
 * @param {boolean} [isControlled] - Enable controlled mode
 * @param {boolean} [controlledIsOpen] - Open state in controlled mode
 * @param {() => void} [onOpen] - Callback when component opens (closed -> open transition only)
 * @param {() => void} [onClose] - Callback when component closes (open -> closed transition only)
 * @param {(isOpen: boolean) => void} [onToggle] - Callback when toggle is attempted (useful for controlled mode)
 * @param {string} dialogId - Unique identifier
 * @param {string} [windowContainerClasssName] - Classname for the background of the Dialog
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Additional HTML div attributes
 *
 * @example
 * ```tsx
 * <Dialog dialogId="my-dialog" defaultOpen={false}>
 *   <DialogHeader>Click to expand</DialogHeader>
 *   <DialogContent>Hidden content here</DialogContent>
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
    windowContainerClasssName,
    ...props
}: iDialog) {
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
            <DialogContainer
                windowContainerClasssName={windowContainerClasssName}
                {...props}
            >
                {children}
            </DialogContainer>
        </DialogProvider>
    );
}
Dialog.displayName = 'Dialog';

interface DialogContainer extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    windowContainerClasssName: string;
}

/**
 * Internal container component that wraps dialog content.
 * Applies default styling and data attributes for state tracking.
 *
 * @internal
 * @param {React.ReactNode} children - Content to render inside the container
 * @param {string} [className] - Additional CSS classes to apply
 * @param {string} [windowContainerClasssName] - Classname for the background of the Dialog
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Additional HTML div attributes
 */
function DialogContainer({
    children,
    className,
    windowContainerClasssName,
    ...props
}: DialogContainer) {
    const { isOpen, isControlled, dialogId } = useDialog();

    if (!isOpen) return null;

    return (
        <div
            className={clsx(
                'absolute bg-black/50 w-screen h-screen flex justify-center items-center',
            )}
            aria-hidden={!isOpen}
        >
            <div
                className={clsx('w-90 h-90', className)}
                {...props}
                data-open={isOpen}
                data-controlled={isControlled}
                data-dialog-id={dialogId}
                aria-hidden={!isOpen}
            >
                {children}
            </div>
        </div>
    );
}
DialogContainer.displayName = 'DialogContainer';

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
}: React.HtmlHTMLAttributes<HTMLButtonElement>) {
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
            {...props}
            data-dialog-toggle-to={!isOpen}
        >
            {children}
        </button>
    );
}
DialogTrigger.displayName = 'DialogTrigger';

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
DialogClose.displayName = 'DialogClose';

export { type iDialog, Dialog, DialogTrigger, DialogClose };
