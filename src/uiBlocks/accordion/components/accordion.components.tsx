import { CollapseAble } from '@/uiChips/collapseAble/components/collapseAble.component';
import { itemsToRender } from '@/uiTools/itemsToRender.uiTools';

import React, {
    useState,
    useMemo,
    useCallback,
    useRef,
    useEffect,
} from 'react';

/* Requires Function "isElement" from uiTools folder */

type AccordionMode = 'single' | 'multiple';

interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
    defaultOpen?: string[];
    isControlled?: boolean;
    controlledOpen?: string[] | undefined;
    onUpdate?: () => void;
    /**
     * 'single' = at most one OPEN,
     * 'multiple' = multiple allowed.
     * Note: maxOpen can implicitly enforce single if set to 1.
     */
    mode?: AccordionMode;
    /** Maximum number of simultaneously OPEN items (<=0 means unlimited) */
    maxOpen?: number;
}

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
    const childrenArray = useMemo(
        () => React.Children.toArray(children) as React.ReactElement[],
        [children],
    );
    const childKeys = useMemo(
        () => childrenArray.map((c) => (c?.key != null ? String(c.key) : '')),
        [childrenArray],
    );

    const [opened, setOpened] = useState<string[]>(defaultOpen);

    const effectiveOpen = controlledOpen ?? opened;

    const initialDefaultSetRef = useRef<Set<string>>(new Set(defaultOpen));

    const normalizedMaxOpen =
        maxOpen != null && maxOpen > 0 ? maxOpen : Number.POSITIVE_INFINITY;

    const isSingleMode = mode === 'single' || normalizedMaxOpen === 1;

    useEffect(() => {
        if (isControlled) return;
        if (childKeys.length === 0) return;

        setOpened((prev) => prev.filter((k) => childKeys.includes(k)));
    }, [childKeys, isControlled]);

    useEffect(() => {
        if (isControlled) return;

        setOpened((prev) => {
            if (prev.length <= normalizedMaxOpen) return prev;
            return prev.slice(prev.length - normalizedMaxOpen);
        });
    }, [normalizedMaxOpen, isControlled]);

    const toggleOpen = useCallback(
        (id: string) => {
            if (isControlled) return;
            onUpdate?.();

            setOpened((prev) => {
                const isOpen = prev.includes(id);

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

    const accordionItems = useMemo(
        () =>
            itemsToRender({
                children,
                matchComponent: CollapseAble,
                displayName: 'CollapseAble',
                getInjectedProps: (child) => ({
                    isControlled: true,
                    controlledIsOpen: child.key
                        ? effectiveOpen.includes(child.key as string)
                        : false,
                    onOpen: () => toggleOpen(child.key as string),
                    defaultOpen: child.key
                        ? initialDefaultSetRef.current.has(child.key as string)
                        : false,
                }),
            }),
        [children, effectiveOpen, toggleOpen],
    );

    return <div {...props}>{accordionItems}</div>;
}
Accordion.displayName = 'Accordion';

export default Accordion;
