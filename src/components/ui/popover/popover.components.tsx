'use client';
import {
    useRef,
    useEffect,
    useCallback,
    useState,
    HTMLAttributes,
    useLayoutEffect,
} from 'react';
import {
    Align,
    Placement,
    useAutoPosition,
} from '@/hooks/useAutoPosition.hooks';
import { Portal } from '@/components/ui/portal/portal.components';
import { useKeyboard } from '@/hooks/useKeyboard.hooks';
import { cn } from '@/lib/tools/cn.tools';
import { useDismissableLayer } from '@/lib/contexts/reactContexts/dismissal.contexts';

interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    anchorRef: React.RefObject<HTMLElement | null>;
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    placement?: Placement[] | Placement;
    align?: Align;
    layer?: string;
    zIndex?: number;
    ignoreElementRefs?: React.RefObject<HTMLElement | null>[];
}

export function Popover({
    anchorRef,
    isOpen,
    onOpenChange,
    placement = 'bottom',
    align = 'center',
    className,
    children,
    layer = 'popovers',
    zIndex = 300,
    style,
    ignoreElementRefs,
    ...rest
}: PopoverProps) {
    const popoverRef = useRef<HTMLDivElement>(null);

    const dismiss = useCallback(() => onOpenChange?.(false), [onOpenChange]);

    const { updatePosition } = useAutoPosition(anchorRef, popoverRef, {
        placement,
        align,
        strategy: 'fixed',
        onClose: dismiss,
    });

    useKeyboard([{ chord: [{ key: 'Escape' }], handler: dismiss }], {
        target: 'global',
        when: isOpen,
    });

    const ignoreElementRefsRef = useRef(ignoreElementRefs);
    useEffect(() => {
        ignoreElementRefsRef.current = ignoreElementRefs;
    }, [ignoreElementRefs]);

    const getRoots = useCallback(
        () => [
            popoverRef.current,
            anchorRef.current,
            ...(ignoreElementRefsRef.current?.map((r) => r.current) ?? []),
        ],
        [],
    );

    useDismissableLayer({
        enabled: isOpen ?? false,
        getRoots,
        onDismiss: dismiss,
    });

    useLayoutEffect(() => {
        if (isOpen) updatePosition();
    }, [isOpen, updatePosition]);

    if (!isOpen) return null;

    return (
        <Portal layer={layer} zIndex={zIndex}>
            <div
                ref={popoverRef}
                className={cn(
                    'bg-white border rounded-lg shadow-lg',
                    className,
                )}
                style={{ ...style, position: 'fixed', pointerEvents: 'auto' }}
                data-align={align}
                {...rest}
            >
                {children}
            </div>
        </Portal>
    );
}

Popover.displayName = 'Popover';
