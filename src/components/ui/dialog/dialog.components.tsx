"use client";

import { DialogProvider, useDialog } from "./dialog.contexts";
import { useCallback } from "react";
import { Portal } from "@/components/ui/portal/portal.components";
import { useBodyScrollLock } from "@/hooks/bodyScrollLock/useBodyScrollLock.hooks";
import { useKeyboard } from "@/hooks/useKeyboard.hooks";
import { cn } from "@/lib/tools/cn.tools";

interface DialogProps {
    children: React.ReactNode;
    dialogId: string;
    defaultOpen?: boolean;
    isOpen?: boolean;
    onOpen?: () => void;
    onClose?: () => void;
    onToggle?: (isOpen: boolean) => void;
    isDisabled?: boolean;
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
    isOpen,
    onOpen,
    onClose,
    onToggle,
    dialogId,
    isDisabled,
}: DialogProps) {
    return (
        <DialogProvider
            defaultOpen={defaultOpen}
            isOpen={isOpen}
            onOpen={onOpen}
            onClose={onClose}
            onToggle={onToggle}
            dialogId={dialogId}
            isDisabled={isDisabled}
        >
            {children}
        </DialogProvider>
    );
}
Dialog.displayName = "Dialog";

interface iDialogContent extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    controlledOutsideClick?: () => void;
    windowContainerClasssName?: string;
    captureScroll?: boolean;
    disableEscapeKey?: boolean;
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
    controlledOutsideClick,
    windowContainerClasssName,
    captureScroll = true,
    disableEscapeKey = false,
    className,
    onClick,
    ...props
}: iDialogContent) {
    const { isOpen, isControlled, dialogId, setIsOpen } = useDialog();
    useBodyScrollLock(isOpen && captureScroll);

    const handleInnerClick = useCallback(
        (event: React.MouseEvent<HTMLDivElement>) => {
            event.stopPropagation();
            onClick?.(event);
        },
        [onClick],
    );

    const handleOutsideClick = useCallback(() => {
        if (isControlled) {
            controlledOutsideClick?.();
        } else {
            setIsOpen(false);
        }
    }, [isControlled, controlledOutsideClick, setIsOpen]);

    useKeyboard(
        [
            {
                chord: [{ key: "Escape" }],
                handler: disableEscapeKey ? () => {} : handleOutsideClick,
            },
        ],
        {
            target: document.body ?? undefined,
            when: isOpen,
        },
    );

    if (!isOpen) return null;

    return (
        <Portal layer="Dialog" zIndex={1000}>
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 w-screen h-screen flex justify-center items-center z-100",
                    windowContainerClasssName,
                )}
                aria-hidden={!isOpen}
                onClick={handleOutsideClick}
                style={{ pointerEvents: "auto" }}
            >
                <div
                    className={cn(
                        "w-150 h-120 bg-white z-102 overflow-y-auto",
                        className,
                    )}
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
        </Portal>
    );
}
DialogContent.displayName = "DialogContent";

/**
 * Button for the Dialog Component
 * Can be used in both controlled and uncontrolled modes.
 *
 * @param {React.ReactNode} children - Content to render inside the button
 * @param {string} [trigger] - Trigger for the button (open, close, toggle)
 * @param {boolean} [ignoreDialogDisable] - Ignore the dialog disable state
 * @param {React.HTMLAttributes<HTMLButtonElement>} props - Additional HTML div attributes
 */
interface DialogButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
    trigger?: "open" | "close" | "toggle";
    ignoreDialogDisable?: boolean;
}

function DialogButton({
    children,
    onClick,
    trigger = "toggle",
    className,
    ignoreDialogDisable = true,
    disabled,
    ...props
}: DialogButtonProps) {
    const {
        setIsOpen,
        toggleOpen,
        isOpen,
        isDisabled: dialogIsDisabled,
    } = useDialog();

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            onClick?.(e);
            switch (trigger) {
                case "toggle":
                    toggleOpen();
                    break;
                case "close":
                    setIsOpen(false);
                    break;
                case "open":
                    setIsOpen(true);
                    break;
            }
        },
        [trigger, onClick],
    );

    return (
        <button
            {...props}
            disabled={!ignoreDialogDisable && (disabled || dialogIsDisabled)}
            onClick={handleClick}
            className={cn("select-none cursor-pointer", className)}
            data-variant={trigger}
            data-open={isOpen}
        >
            {children}
        </button>
    );
}
DialogButton.displayName = "DialogButton";

interface DialogHeaderProps {
    children: React.ReactNode;
    closeButton?: React.ReactNode;
    containerProps?: React.HTMLAttributes<HTMLDivElement>;
    headerProps?: React.HTMLAttributes<HTMLDivElement>;
    buttonProps?: DialogButtonProps;
}

function DialogHeader({
    children,
    containerProps,
    headerProps,
    closeButton = "X",
    buttonProps,
}: DialogHeaderProps) {
    return (
        <div
            {...containerProps}
            className={cn(
                "flex flex-nowrap justify-between items-center select-none",
                containerProps?.className,
            )}
        >
            <section {...headerProps}>{children}</section>
            <DialogButton
                {...buttonProps}
                trigger="close"
                className={cn(
                    "hover:bg-gray-200 p-1 rounded",
                    buttonProps?.className,
                )}
            >
                {closeButton}
            </DialogButton>
        </div>
    );
}
DialogHeader.displayName = "DialogHeader";

export { type DialogProps, Dialog, DialogContent, DialogButton, DialogHeader };
