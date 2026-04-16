import {
    CollapseAble,
    CollapseAbleProps,
} from "@/lib/components/collapseAble/collapseAble.components";
import { itemsToRender } from "@/lib/tools/react/itemsToRender.tools.react";
import isElement from "@/lib/tools/react/isElement.tools.react";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { composeEventHandlers } from "@/lib/tools/react/composeEventHandler.tools.react";

type AccordionProps = React.HTMLAttributes<HTMLDivElement> & {
    defaultOpen?: string[];
    isControlled?: boolean;
    controlledOpen?: string[];
    onUpdate?: () => void;
    options?: AccordionOptions;
};

type AccordionOptions = {
    maxOpen?: number;
    keepOneOpen?: boolean;
    collapseDurationMs?: number;
};

const defaultAccordionOptions: AccordionOptions = {
    maxOpen: 0,
    keepOneOpen: false,
    collapseDurationMs: 0,
};

/**
 * Accordion component that manages CollapseAble children.
 *
 * @param {React.ReactNode} children - CollapseAble components to be managed by the Accordion
 * @param {string[]} [defaultOpen] - IDs of CollapseAble items to open by default
 * @param {boolean} [isControlled] - Whether the Accordion is controlled externally
 * @param {string[]} [controlledOpen] - IDs of CollapseAble items to open when controlled
 * @param {() => void} [onUpdate] - Callback when the open state changes
 * @param {AccordionOptions} [options] - Configuration options for the Accordion
 * @param {React.HTMLAttributes<HTMLDivElement>} [props] - Additional HTML div attributes
 * @example
 * <Accordion defaultOpen={['item-1']}>
 *   <CollapseAble collapseAbleId="item-1">{...content...}</CollapseAble>
 *   <CollapseAble collapseAbleId="item-2">{...content...}</CollapseAble>
 * </Accordion>
 */
function Accordion({
    children,
    defaultOpen = [],
    isControlled = false,
    controlledOpen,
    onUpdate,
    options = defaultAccordionOptions,
    ...props
}: AccordionProps) {
    const [opened, setOpened] = useState<string[]>(defaultOpen);
    const effectiveOpen = isControlled ? (controlledOpen ?? []) : opened;

    const { maxOpen, keepOneOpen, collapseDurationMs } = options;

    const childIds = useMemo(() => {
        const ids: string[] = [];
        React.Children.forEach(children, (child) => {
            if (
                isElement<CollapseAbleProps>(
                    child,
                    CollapseAble,
                    "CollapseAble",
                )
            ) {
                const id = child.props.collapseAbleId;
                if (id && id.length > 0) {
                    ids.push(id);
                }
            }
        });
        return ids;
    }, [children]);

    const normalizedMaxOpen = useMemo(
        () => (maxOpen! > 0 ? maxOpen : Number.POSITIVE_INFINITY),
        [maxOpen],
    );

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
            if (prev.length <= normalizedMaxOpen!) return prev;
            return prev.slice(-normalizedMaxOpen!);
        });
    }, [normalizedMaxOpen, isControlled]);

    const toggleOpen = useCallback(
        (id: string) => {
            if (isControlled) return;
            onUpdate?.();

            setOpened((prev) => {
                const isOpen = prev.includes(id);

                if (isOpen) {
                    if (keepOneOpen && prev.length === 1) return prev;
                    return prev.filter((x) => x !== id);
                }

                if (prev.length >= normalizedMaxOpen!) {
                    return [...prev.slice(1), id];
                }

                return [...prev, id];
            });
        },
        [isControlled, onUpdate, normalizedMaxOpen],
    );

    const items = useMemo(
        () =>
            itemsToRender<CollapseAbleProps>({
                children,
                matchComponent: CollapseAble,
                displayName: "CollapseAble",
                getInjectedProps: (child) => {
                    const id = (child as React.ReactElement<CollapseAbleProps>)
                        .props.collapseAbleId;
                    if (!id) return {};

                    return {
                        isOpen: effectiveOpen.includes(id),
                        onClick: composeEventHandlers(child.props.onClick, () =>
                            toggleOpen(id),
                        ),
                        durationMs:
                            collapseDurationMs ?? child.props.durationMs,
                    };
                },
            }),
        [children, effectiveOpen, toggleOpen, defaultOpenSet],
    );

    return <div {...props}>{items}</div>;
}

Accordion.displayName = "Accordion";
export { type AccordionProps, Accordion };
