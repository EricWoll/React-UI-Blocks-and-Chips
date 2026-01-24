import {
    CollapseAble,
    iCollapseAble,
} from '@/uiChips/collapseAble/components/collapseAble.component';
import { itemsToRender } from '@/uiTools/itemsToRender.uiTools';
import isElement from '@/uiTools/isElement.uiTools';
import React, { useState, useMemo, useCallback, useEffect } from 'react';

type AccordionMode = 'single' | 'multiple';

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
    /** IDs of items that should be open by default */
    defaultOpen?: string[];
    /** Whether the open state is controlled externally */
    isControlled?: boolean;
    /** Controlled open state (only used when isControlled is true) */
    controlledOpen?: string[];
    /** Callback fired when accordion state updates */
    onUpdate?: () => void;
    /** 'single' = at most one open, 'multiple' = multiple allowed */
    mode?: AccordionMode;
    /** Maximum number of simultaneously open items (<=0 means unlimited) */
    maxOpen?: number;
}

/**
 * Accordion component that manages CollapseAble children.
 *
 * Uses collapseAbleId prop to track which items are open.
 * Can operate in controlled or uncontrolled mode with single or multiple selection.
 *
 * @example
 * <Accordion mode="single" defaultOpen={['item-1']}>
 *   <CollapseAble collapseAbleId="item-1">Content 1</CollapseAble>
 *   <CollapseAble collapseAbleId="item-2">Content 2</CollapseAble>
 * </Accordion>
 */
function Accordion({
    children,
    defaultOpen = [],
    isControlled = false,
    controlledOpen,
    onUpdate,
    mode = 'single',
    maxOpen = -1,
    ...props
}: AccordionProps) {
    const [opened, setOpened] = useState<string[]>(defaultOpen);
    const effectiveOpen = isControlled ? (controlledOpen ?? []) : opened;

    // Extract child IDs from CollapseAble children only
    const childIds = useMemo(() => {
        const ids: string[] = [];
        React.Children.forEach(children, (child) => {
            if (isElement<iCollapseAble>(child, CollapseAble, 'CollapseAble')) {
                const id = child.props.collapseAbleId;
                if (id && id.length > 0) {
                    ids.push(id);
                }
            }
        });
        return ids;
    }, [children]);

    const normalizedMaxOpen = useMemo(
        () => (maxOpen > 0 ? maxOpen : Number.POSITIVE_INFINITY),
        [maxOpen],
    );

    const isSingleMode = mode === 'single' || normalizedMaxOpen === 1;

    const defaultOpenSet = useMemo(() => new Set(defaultOpen), [defaultOpen]);

    // Cleanup: remove opened items that no longer exist in children
    useEffect(() => {
        if (isControlled || childIds.length === 0) return;
        setOpened((prev) => prev.filter((id) => childIds.includes(id)));
    }, [childIds, isControlled]);

    // Enforce maxOpen limit
    useEffect(() => {
        if (isControlled || normalizedMaxOpen === Number.POSITIVE_INFINITY)
            return;
        setOpened((prev) => {
            if (prev.length <= normalizedMaxOpen) return prev;
            return prev.slice(-normalizedMaxOpen);
        });
    }, [normalizedMaxOpen, isControlled]);

    const toggleOpen = useCallback(
        (id: string) => {
            if (isControlled) return;
            onUpdate?.();

            setOpened((prev) => {
                const isOpen = prev.includes(id);

                // Single mode: only one item open at a time
                if (isSingleMode) {
                    return isOpen ? [] : [id];
                }

                // Multiple mode
                if (isOpen) {
                    return prev.filter((x) => x !== id);
                }

                if (prev.length >= normalizedMaxOpen) {
                    return [...prev.slice(1), id];
                }

                return [...prev, id];
            });
        },
        [isControlled, onUpdate, isSingleMode, normalizedMaxOpen],
    );

    const items = useMemo(
        () =>
            itemsToRender<iCollapseAble>({
                children,
                matchComponent: CollapseAble,
                displayName: 'CollapseAble',
                getInjectedProps: (child) => {
                    const id = child.props.collapseAbleId;
                    if (!id) return {};

                    return {
                        isControlled: true,
                        controlledIsOpen: effectiveOpen.includes(id),
                        onOpen: () => toggleOpen(id),
                        defaultOpen: defaultOpenSet.has(id),
                    };
                },
            }),
        [children, effectiveOpen, toggleOpen, defaultOpenSet],
    );

    return <div {...props}>{items}</div>;
}

Accordion.displayName = 'Accordion';
export default Accordion;
