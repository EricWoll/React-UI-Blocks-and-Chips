'use client';

import {
    Children,
    cloneElement,
    isValidElement,
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useRef,
    useState,
    type KeyboardEvent,
    type MouseEvent,
    type ReactNode,
    type Ref,
} from 'react';
import {
    useDropdown,
    useRadioGroup,
    DropdownContext,
    RadioGroupContext,
} from './dropdown.contexts';
import { Portal } from '@/components/ui/portal/portal.components';
import { cn } from '@/lib/tools/cn.tools';
import {
    useAutoPosition,
    type Align,
    type Placement,
    type PositionStrategy,
} from '@/hooks/useAutoPosition.hooks';
import { mergeRefs } from '@/lib/tools/react/mergeRefs.tools.react';
import { getItems } from '@/lib/tools/react/getKeyboardNavigateAble.tools.react';
import { useDismissableLayer } from '@/lib/contexts/reactContexts/dismissal.contexts';

// ─── Root ─────────────────────────────────────────────────────────────────────

type DropdownProps = {
    children: ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    defaultOpen?: boolean;
    disabled?: boolean;
};
/**
 * `<Dropdown>`
 *
 * Root context provider. Owns open state and keyboard highlight only.
 * Selection, values, and checked state live in higher-level components
 * (`Select`, `Dropdown.CheckboxItem`, `Dropdown.RadioGroup`).
 *
 * Supports controlled (`open` + `onOpenChange`) and uncontrolled usage.
 *
 * @example Action menu
 * ```tsx
 * <Dropdown>
 *   <Dropdown.Trigger>Actions</Dropdown.Trigger>
 *   <Dropdown.Content>
 *     <Dropdown.Item onSelect={handleEdit}>Edit</Dropdown.Item>
 *     <Dropdown.Item onSelect={handleDelete}>Delete</Dropdown.Item>
 *   </Dropdown.Content>
 * </Dropdown>
 * ```
 *
 * @example Nav menu with links
 * ```tsx
 * <Dropdown>
 *   <Dropdown.Trigger asChild><button>Navigate</button></Dropdown.Trigger>
 *   <Dropdown.Content matchContentWidth>
 *     <Dropdown.Item asChild><a href="/a">Page A</a></Dropdown.Item>
 *     <Dropdown.Item asChild><a href="/b">Page B</a></Dropdown.Item>
 *   </Dropdown.Content>
 * </Dropdown>
 * ```
 *
 * @example Context menu with icon trigger
 * ```tsx
 * <Dropdown>
 *   <Dropdown.Trigger asChild>
 *     <button aria-label="More options"><KebabIcon /></button>
 *   </Dropdown.Trigger>
 *   <Dropdown.Content matchContentWidth align="end">
 *     <Dropdown.Group label="Actions">
 *       <Dropdown.Item onSelect={rename}>Rename</Dropdown.Item>
 *       <Dropdown.CheckboxItem checked={pinned} onCheckedChange={setPin}>
 *         Pinned
 *       </Dropdown.CheckboxItem>
 *     </Dropdown.Group>
 *     <Dropdown.Separator />
 *     <Dropdown.Group label="Size">
 *       <Dropdown.RadioGroup value={size} onValueChange={setSize}>
 *         <Dropdown.RadioItem value="sm">Small</Dropdown.RadioItem>
 *         <Dropdown.RadioItem value="lg">Large</Dropdown.RadioItem>
 *       </Dropdown.RadioGroup>
 *     </Dropdown.Group>
 *     <Dropdown.Separator />
 *     <Dropdown.Item onSelect={handleDelete}>Delete</Dropdown.Item>
 *   </Dropdown.Content>
 * </Dropdown>
 * ```
 */
function Dropdown({
    children,
    open: controlledOpen,
    onOpenChange,
    defaultOpen = false,
    disabled = false,
}: DropdownProps) {
    const triggerId = useId();
    const contentId = useId();

    const triggerRef = useRef<HTMLElement | null>(null);

    const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);
    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : uncontrolledOpen;

    const setOpen = useCallback(
        (next: boolean) => {
            if (!isControlled) setUncontrolledOpen(next);
            onOpenChange?.(next);
        },
        [isControlled, onOpenChange],
    );

    const open = useCallback(() => setOpen(true), [setOpen]);
    const close = useCallback(() => setOpen(false), [setOpen]);
    const toggle = useCallback(() => setOpen(!isOpen), [setOpen, isOpen]);

    // Item registry — maps item id → DOM element for keyboard navigation.
    const itemMapRef = useRef<Map<string, HTMLElement>>(new Map());
    const registerItem = useCallback((id: string, el: HTMLElement) => {
        itemMapRef.current.set(id, el);
    }, []);
    const unregisterItem = useCallback((id: string) => {
        itemMapRef.current.delete(id);
    }, []);

    const [highlightedId, setHighlightedId] = useState<string | null>(null);

    useEffect(() => {
        if (!isOpen) setHighlightedId(null);
    }, [isOpen]);

    return (
        <DropdownContext.Provider
            value={{
                isOpen,
                open,
                close,
                toggle,
                triggerId,
                contentId,
                triggerRef,
                registerItem,
                unregisterItem,
                highlightedId,
                setHighlightedId,
                disabled,
            }}
        >
            {children}
        </DropdownContext.Provider>
    );
}

// ─── Trigger ──────────────────────────────────────────────────────────────────

type DropdownTriggerProps = {
    children: ReactNode;
    className?: string;
    asChild?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;
/**
 * `<Dropdown.Trigger>`
 *
 * By default renders a `<button>`. Pass `asChild` to forward all trigger
 * behaviour onto your own element — useful for icon buttons, avatars, or
 * any element that shouldn't be wrapped in an extra DOM node.
 *
 * Data attributes:
 * - `data-open="true|false"`
 * - `data-disabled="true|false"`
 * - `data-id` — matches the `aria-labelledby` on the content panel
 */
function DropdownTrigger({
    children,
    className,
    asChild = false,
    disabled: propDisabled,
    onClick,
    onKeyDown,
    ...rest
}: DropdownTriggerProps) {
    const {
        isOpen,
        toggle,
        close,
        triggerId,
        contentId,
        triggerRef,
        disabled: ctxDisabled,
    } = useDropdown();

    const isDisabled = propDisabled ?? ctxDisabled;

    const handleClick = useCallback(
        (e: MouseEvent<HTMLElement>) => {
            if (isDisabled) return;
            (onClick as ((e: MouseEvent<HTMLElement>) => void) | undefined)?.(
                e,
            );
            toggle();
        },
        [isDisabled, onClick, toggle],
    );

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLElement>) => {
            (
                onKeyDown as
                    | ((e: KeyboardEvent<HTMLElement>) => void)
                    | undefined
            )?.(e);
            if (isDisabled) return;
            if (e.key === 'Escape') {
                e.preventDefault();
                close();
            }
        },
        [isDisabled, onKeyDown, close],
    );

    const triggerProps = {
        'data-item-id': triggerId,
        'aria-haspopup': 'true' as const,
        'aria-expanded': isOpen,
        'aria-controls': isOpen ? contentId : undefined,
        'data-open': isOpen,
        'data-disabled': isDisabled,
        onClick: handleClick,
        onKeyDown: handleKeyDown,
    };

    if (asChild) {
        const child = Children.only(children);
        if (!isValidElement(child)) {
            throw new Error(
                '<Dropdown.Trigger asChild> requires a single valid element child.',
            );
        }
        return cloneElement(
            child as React.ReactElement<Record<string, unknown>>,
            {
                ...triggerProps,
                ref: mergeRefs(
                    triggerRef,
                    (child as React.ReactElement<{ ref?: Ref<HTMLElement> }>)
                        .props.ref,
                ),
            },
        );
    }

    return (
        <button
            {...rest}
            ref={triggerRef as React.RefObject<HTMLButtonElement>}
            type="button"
            className={cn(
                'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium',
                'border border-zinc-200 bg-white text-zinc-800 transition-colors duration-100',
                'hover:bg-zinc-50 hover:border-zinc-300',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-1',
                'data-[open=true]:bg-zinc-100 data-[open=true]:border-zinc-300',
                'disabled:pointer-events-none disabled:opacity-50',
                className,
            )}
            disabled={isDisabled}
            {...triggerProps}
        >
            {children}
        </button>
    );
}

// ─── Content ──────────────────────────────────────────────────i��───────────────

type DropdownContentProps = {
    children: ReactNode;
    className?: string;
    placement?: Placement | Placement[];
    align?: Align;
    strategy?: PositionStrategy;
    gap?: number;
    viewportPadding?: number;
    /**
     * The ARIA role of the popover panel.
     * - "menu"    — action menus, context menus (items use menuitem/menuitemcheckbox/menuitemradio)
     * - "listbox" — select-style value pickers (items use option)
     * - "dialog"  — free-form content, no item role enforced
     * @default "menu"
     */
    role?: 'menu' | 'listbox' | 'dialog';
    usePortal?: boolean;
    portalLayerName?: string;
    portalZIndex?: number;
    matchContentWidth?: boolean;
    /**
     * Elements that should not trigger an outside-click close even when clicked
     * outside the trigger and content panel.
     */
    ignoreElementRefs?: React.RefObject<HTMLElement | null>[];
    style?: React.CSSProperties;
};
/**
 * `<Dropdown.Content>`
 *
 * The popover panel. Unmounts entirely when closed — no display:none.
 * Portals to a named layer via `<Portal>` by default.
 *
 * Handles:
 * - Arrow key + Home/End navigation across all `[data-item-id]` children
 * - Typeahead: printable characters jump to the first matching item (400ms window)
 * - Escape to close and return focus to trigger
 * - Tab to close
 * - Outside click to close
 *
 * Data attributes:
 * - `data-open="true|false"`
 * - `data-placement="top|bottom|left|right"` (resolved)
 * - `data-item-id="[contentId]" - dropdown content id`
 *
 */
function DropdownContent({
    children,
    className,
    placement = ['bottom', 'top', 'right', 'left'],
    align = 'start',
    strategy = 'fixed',
    gap = 8,
    viewportPadding = 4,
    role = 'menu',
    usePortal = true,
    portalLayerName = 'dropdown',
    portalZIndex,
    matchContentWidth = false,
    ignoreElementRefs,
    style,
}: DropdownContentProps) {
    const {
        isOpen,
        close,
        triggerId,
        contentId,
        triggerRef,
        highlightedId,
        setHighlightedId,
    } = useDropdown();

    const contentRef = useRef<HTMLDivElement | null>(null);
    // SSR guard — portal and position APIs are client-only.
    const [isMounted, setIsMounted] = useState(false);
    // Typeahead accumulator — cleared after 400ms of inactivity.
    const typeaheadRef = useRef('');
    const typeaheadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
        null,
    );

    useEffect(() => {
        setIsMounted(true);
    }, []);

    const { updatePosition } = useAutoPosition(triggerRef, contentRef, {
        placement,
        align,
        strategy,
        onClose: close,
        gap,
        viewportPadding,
    });

    // Re-position synchronously when panel opens.
    useLayoutEffect(() => {
        if (isOpen) {
            updatePosition();
            contentRef.current?.focus();
        }
    }, [isOpen, updatePosition]);

    // Match panel width to trigger synchronously — no layout flash.
    useLayoutEffect(() => {
        if (!isOpen || matchContentWidth) return;
        const trigger = triggerRef.current;
        const content = contentRef.current;
        if (!trigger || !content) return;
        content.style.width = `${trigger.getBoundingClientRect().width}px`;
        return () => {
            if (content) content.style.width = '';
        };
    }, [isOpen, matchContentWidth, triggerRef]);

    const ignoreElementRefsRef = useRef(ignoreElementRefs);
    useEffect(() => {
        ignoreElementRefsRef.current = ignoreElementRefs;
    }, [ignoreElementRefs]);

    const getRoots = useCallback(
        () => [
            triggerRef.current,
            contentRef.current,
            ...(ignoreElementRefsRef.current?.map((r) => r.current) ?? []),
        ],
        [],
    );

    useDismissableLayer({
        enabled: isOpen,
        getRoots,
        onDismiss: close,
    });

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLDivElement>) => {
            if (!isOpen) return;
            const items = getItems(contentRef.current);
            const currentIndex = items.findIndex(
                (el) => el.dataset.itemId === highlightedId,
            );

            const highlight = (el: HTMLElement | undefined) => {
                if (!el) return;
                setHighlightedId(el.dataset.itemId ?? null);
                el.scrollIntoView({ block: 'nearest' });
            };

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    highlight(items[(currentIndex + 1) % items.length]);
                    break;

                case 'ArrowUp':
                    e.preventDefault();
                    highlight(
                        items[(currentIndex - 1 + items.length) % items.length],
                    );
                    break;

                case 'Home':
                    e.preventDefault();
                    highlight(items[0]);
                    break;

                case 'End':
                    e.preventDefault();
                    highlight(items[items.length - 1]);
                    break;

                case 'Enter':
                case ' ':
                    e.preventDefault();
                    items
                        .find((el) => el.dataset.itemId === highlightedId)
                        ?.click();
                    break;

                case 'Escape':
                    e.preventDefault();
                    close();
                    triggerRef.current?.focus();
                    break;

                case 'Tab':
                    close();
                    break;

                default: {
                    // Typeahead — printable characters only, no modifier keys.
                    if (
                        e.key.length !== 1 ||
                        e.ctrlKey ||
                        e.metaKey ||
                        e.altKey
                    )
                        break;
                    e.preventDefault();
                    if (typeaheadTimerRef.current)
                        clearTimeout(typeaheadTimerRef.current);
                    typeaheadRef.current += e.key.toLowerCase();
                    typeaheadTimerRef.current = setTimeout(() => {
                        typeaheadRef.current = '';
                    }, 400);

                    // Rotate list to start searching after the current item.
                    const startIndex =
                        currentIndex === -1 ? 0 : currentIndex + 1;
                    const rotated = [
                        ...items.slice(startIndex),
                        ...items.slice(0, startIndex),
                    ];
                    const match = rotated.find((el) =>
                        (el.textContent ?? '')
                            .trim()
                            .toLowerCase()
                            .startsWith(typeaheadRef.current),
                    );
                    highlight(match);
                    break;
                }
            }
        },
        [isOpen, highlightedId, setHighlightedId, close, triggerRef],
    );

    if (!isMounted || !isOpen) return null;

    const resolvedPlacement = Array.isArray(placement)
        ? placement[0]
        : placement;

    const node = (
        <div
            ref={contentRef}
            data-item-id={contentId}
            role={role}
            aria-labelledby={triggerId}
            className={cn(
                'min-w-40 rounded-lg p-1 pointer-events-auto',
                'border border-zinc-200 bg-white shadow-md shadow-zinc-200/60',
                'text-sm text-zinc-800',
                'max-h-[min(var(--dropdown-max-h,320px),calc(100vh-2rem))] overflow-y-auto',
                'outline-none',
                className,
            )}
            style={{ position: strategy, ...style }}
            data-open={isOpen}
            data-placement={resolvedPlacement}
            onKeyDown={handleKeyDown}
            tabIndex={-1}
        >
            {children}
        </div>
    );

    return usePortal ? (
        <Portal layer={portalLayerName} zIndex={portalZIndex}>
            {node}
        </Portal>
    ) : (
        node
    );
}

// ─── Item ────────────────────────────────────ns�al�───────────────────────────────

type DropdownItemProps = {
    children: ReactNode;
    disabled?: boolean;
    itemId?: string;
    /**
     * Called when the item is selected (click or Enter/Space).
     * The dropdown closes after this unless you call `e.preventDefault()`.
     */
    onSelect?: (
        e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
    ) => void;
    asChild?: boolean;
} & Omit<React.HTMLAttributes<HTMLElement>, 'onSelect'>;
/**
 * `<Dropdown.Item>`
 *
 * A single interactive row. Closes the dropdown on select unless you call
 * `e.preventDefault()` inside `onSelect` — useful for async operations where
 * you want to wait before closing.
 *
 * Pass `asChild` to render as any element — `<a>`, Next.js `<Link>`, etc.
 * The child must accept `ref`, `onClick`, `onMouseEnter`, `onMouseLeave`.
 *
 * Data attributes:
 * - `data-highlighted="true|false"`
 * - `data-disabled="true|false"`
 * - `data-selected` — not set here; pass it in via props or use Select/RadioItem
 */
function DropdownItem({
    children,
    className,
    itemId: propId,
    disabled = false,
    onSelect,
    onClick,
    asChild = false,
    onMouseEnter,
    onMouseLeave,
    ...rest
}: DropdownItemProps) {
    const autoId = useId();
    const dropItemId = propId ?? autoId;

    const {
        close,
        highlightedId,
        setHighlightedId,
        registerItem,
        unregisterItem,
    } = useDropdown();
    const itemRef = useRef<HTMLElement | null>(null);
    const isHighlighted = highlightedId === dropItemId;

    useLayoutEffect(() => {
        const el = itemRef.current;
        if (!el) return;
        registerItem(dropItemId, el);
        return () => unregisterItem(dropItemId);
    }, [dropItemId, registerItem, unregisterItem]);

    const handleSelect = useCallback(
        (e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
            if (disabled) return;
            onClick?.(e as React.MouseEvent<HTMLElement>);
            onSelect?.(e);
            if (!e.defaultPrevented) close();
        },
        [disabled, onSelect, close],
    );

    const handleMouseEnter = useCallback(
        (e: MouseEvent<HTMLElement>) => {
            if (!disabled) setHighlightedId(dropItemId);
            (
                onMouseEnter as
                    | ((e: MouseEvent<HTMLElement>) => void)
                    | undefined
            )?.(e);
        },
        [disabled, dropItemId, setHighlightedId, onMouseEnter],
    );

    const handleMouseLeave = useCallback(
        (e: MouseEvent<HTMLElement>) => {
            setHighlightedId(null);
            (
                onMouseLeave as
                    | ((e: MouseEvent<HTMLElement>) => void)
                    | undefined
            )?.(e);
        },
        [setHighlightedId, onMouseLeave],
    );

    const itemProps = {
        'data-item-id': dropItemId,
        'data-highlighted': isHighlighted,
        'data-disabled': disabled,
        'aria-disabled': disabled,
        tabIndex: disabled ? -1 : 0,
        onClick: handleSelect,
        onMouseEnter: handleMouseEnter,
        onMouseLeave: handleMouseLeave,
    };

    const itemClassName = cn(
        'flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5',
        'text-sm text-zinc-700 outline-none transition-colors duration-75',
        'data-[highlighted=true]:bg-zinc-100 data-[highlighted=true]:text-zinc-900',
        'data-[selected=true]:font-medium',
        'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40 data-[disabled=true]:cursor-not-allowed',
        className,
    );

    if (asChild) {
        const child = Children.only(children);
        if (!isValidElement(child)) {
            throw new Error(
                '<Dropdown.Item asChild> requires a single valid element child.',
            );
        }
        return cloneElement(
            child as React.ReactElement<Record<string, unknown>>,
            {
                ...itemProps,
                className: itemClassName,
                ref: mergeRefs(
                    itemRef,
                    (child as React.ReactElement<{ ref?: Ref<HTMLElement> }>)
                        .props.ref,
                ),
            },
        );
    }

    return (
        <div
            {...rest}
            ref={itemRef as React.RefObject<HTMLDivElement>}
            role="menuitem"
            className={itemClassName}
            {...itemProps}
        >
            {children}
        </div>
    );
}

// ─── CheckboxItem ─────────────────────────────────────────────────────────────

type DropdownCheckboxItemProps = {
    children: ReactNode;
    itemId?: string;
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    disabled?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;
/**
 * `<Dropdown.CheckboxItem>`
 *
 * An item with its own boolean checked state. Does not close the dropdown
 * on select by default — toggling a setting and closing are separate concerns.
 * Call `close()` from `useDropdown()` inside `onCheckedChange` if needed.
 *
 * Supports controlled (`checked` + `onCheckedChange`) and uncontrolled
 * (`defaultChecked`) usage.
 *
 * Data attributes:
 * - `data-highlighted="true|false"`
 * - `data-checked="true|false"`
 * - `data-disabled="true|false"`
 *
 * @example
 * ```tsx
 * <Dropdown.CheckboxItem checked={showGrid} onCheckedChange={setShowGrid}>
 *   <CheckIcon data-visible="[data-checked=true]" />
 *   Show grid
 * </Dropdown.CheckboxItem>
 * ```
 */
function DropdownCheckboxItem({
    children,
    className,
    itemId: propId,
    checked: controlledChecked,
    defaultChecked = false,
    onCheckedChange,
    disabled = false,
    onMouseEnter,
    onMouseLeave,
    ...rest
}: DropdownCheckboxItemProps) {
    const autoId = useId();
    const checkItemId = propId ?? autoId;

    const { highlightedId, setHighlightedId, registerItem, unregisterItem } =
        useDropdown();
    const itemRef = useRef<HTMLDivElement | null>(null);
    const isHighlighted = highlightedId === checkItemId;

    const isControlled = controlledChecked !== undefined;
    const [uncontrolledChecked, setUncontrolledChecked] =
        useState(defaultChecked);
    const checked = isControlled ? controlledChecked : uncontrolledChecked;

    useLayoutEffect(() => {
        const el = itemRef.current;
        if (!el) return;
        registerItem(checkItemId, el);
        return () => unregisterItem(checkItemId);
    }, [checkItemId, registerItem, unregisterItem]);

    const handleClick = useCallback(() => {
        if (disabled) return;
        const next = !checked;
        if (!isControlled) setUncontrolledChecked(next);
        onCheckedChange?.(next);
    }, [disabled, checked, isControlled, onCheckedChange]);

    return (
        <div
            {...rest}
            ref={itemRef}
            role="menuitemcheckbox"
            aria-checked={checked}
            aria-disabled={disabled}
            className={cn(
                'flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5',
                'text-sm text-zinc-700 outline-none transition-colors duration-75',
                'data-[highlighted=true]:bg-zinc-100 data-[highlighted=true]:text-zinc-900',
                'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40',
                'dark:text-zinc-300 dark:data-[highlighted=true]:bg-zinc-800 dark:data-[highlighted=true]:text-zinc-100',
                className,
            )}
            data-item-id={checkItemId}
            data-highlighted={isHighlighted}
            data-checked={checked}
            data-disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            onClick={handleClick}
            onMouseEnter={(e) => {
                if (!disabled) setHighlightedId(checkItemId);
                onMouseEnter?.(e);
            }}
            onMouseLeave={(e) => {
                setHighlightedId(null);
                onMouseLeave?.(e);
            }}
        >
            {children}
        </div>
    );
}

// ─── RadioGroup ───────────────────────────────────────────────────────────────

type DropdownRadioGroupProps = {
    children: ReactNode;
    value?: string | null;
    defaultValue?: string | null;
    onValueChange?: (value: string) => void;
} & Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue'>;
/**
 * `<Dropdown.RadioGroup>`
 *
 * Groups `<Dropdown.RadioItem>` components and tracks which one is checked.
 * Supports controlled (`value` + `onValueChange`) and uncontrolled
 * (`defaultValue`) usage.
 *
 * @example
 * ```tsx
 * <Dropdown.RadioGroup value={density} onValueChange={setDensity}>
 *   <Dropdown.RadioItem value="compact">Compact</Dropdown.RadioItem>
 *   <Dropdown.RadioItem value="default">Default</Dropdown.RadioItem>
 *   <Dropdown.RadioItem value="spacious">Spacious</Dropdown.RadioItem>
 * </Dropdown.RadioGroup>
 * ```
 */
function DropdownRadioGroup({
    children,
    value: controlledValue,
    defaultValue = null,
    onValueChange,
    ...rest
}: DropdownRadioGroupProps) {
    const isControlled = controlledValue !== undefined;
    const [uncontrolledValue, setUncontrolledValue] = useState<string | null>(
        defaultValue,
    );
    const value = isControlled ? (controlledValue ?? null) : uncontrolledValue;

    const handleValueChange = useCallback(
        (next: string) => {
            if (!isControlled) setUncontrolledValue(next);
            onValueChange?.(next);
        },
        [isControlled, onValueChange],
    );

    return (
        <RadioGroupContext.Provider
            value={{ value, onValueChange: handleValueChange }}
        >
            <div {...rest} role="group">
                {children}
            </div>
        </RadioGroupContext.Provider>
    );
}

// ─── RadioItem ────────────────────────────────────────────────────────────────

type DropdownRadioItemProps = {
    children: ReactNode;
    value: string;
    itemId?: string;
    disabled?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;
/**
 * `<Dropdown.RadioItem>`
 *
 * Must be used inside `<Dropdown.RadioGroup>`. Closes the dropdown on select.
 *
 * Data attributes:
 * - `data-highlighted="true|false"`
 * - `data-checked="true|false"`
 * - `data-disabled="true|false"`
 */
function DropdownRadioItem({
    children,
    value,
    className,
    id: propId,
    disabled = false,
    onMouseEnter,
    onMouseLeave,
    ...rest
}: DropdownRadioItemProps) {
    const autoId = useId();
    const radioItemId = propId ?? autoId;

    const {
        close,
        highlightedId,
        setHighlightedId,
        registerItem,
        unregisterItem,
    } = useDropdown();
    const radioCtx = useRadioGroup();
    if (!radioCtx)
        throw new Error(
            '<Dropdown.RadioItem> must be inside <Dropdown.RadioGroup>',
        );

    const itemRef = useRef<HTMLDivElement | null>(null);
    const isHighlighted = highlightedId === radioItemId;
    const isChecked = radioCtx.value === value;

    useLayoutEffect(() => {
        const el = itemRef.current;
        if (!el) return;
        registerItem(radioItemId, el);
        return () => unregisterItem(radioItemId);
    }, [radioItemId, registerItem, unregisterItem]);

    const handleClick = useCallback(() => {
        if (disabled) return;
        radioCtx.onValueChange(value);
        close();
    }, [disabled, value, radioCtx, close]);

    return (
        <div
            {...rest}
            ref={itemRef}
            role="menuitemradio"
            aria-checked={isChecked}
            aria-disabled={disabled}
            className={cn(
                'flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2.5 py-1.5',
                'text-sm text-zinc-700 outline-none transition-colors duration-75',
                'data-[highlighted=true]:bg-zinc-100 data-[highlighted=true]:text-zinc-900',
                'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-40',
                className,
            )}
            data-item-id={radioItemId}
            data-highlighted={isHighlighted}
            data-checked={isChecked}
            data-disabled={disabled}
            tabIndex={disabled ? -1 : 0}
            onClick={handleClick}
            onMouseEnter={(e) => {
                if (!disabled) setHighlightedId(radioItemId);
                onMouseEnter?.(e);
            }}
            onMouseLeave={(e) => {
                setHighlightedId(null);
                onMouseLeave?.(e);
            }}
        >
            {children}
        </div>
    );
}

// ─── Group ────────────────────────────────────────────────────────────────────

type DropdownGroupProps = {
    children: ReactNode;
    /** Rendered as the group's accessible label. */
    label?: ReactNode;
    className?: string;
    labelClassName?: string;
    style?: React.CSSProperties;
};
/**
 * `<Dropdown.Group>`
 *
 * Semantically groups related items under an accessible label.
 * Prefer this over `<Dropdown.Label>` when the label describes a set of items —
 * it uses `role="group"` + `aria-labelledby` so screen readers announce the
 * group name before reading its items.
 *
 * @example
 * ```tsx
 * <Dropdown.Group label="Danger zone">
 *   <Dropdown.Item onSelect={handleDelete}>Delete</Dropdown.Item>
 * </Dropdown.Group>
 * ```
 */
function DropdownGroup({
    children,
    label,
    className,
    labelClassName,
    style,
}: DropdownGroupProps) {
    const labelId = useId();
    return (
        <div
            role="group"
            aria-labelledby={label ? labelId : undefined}
            className={className}
            style={style}
        >
            {label && (
                <div
                    id={labelId}
                    role="presentation"
                    className={cn(
                        'px-2.5 pb-1 pt-2 text-xs font-medium text-zinc-400',
                        labelClassName,
                    )}
                >
                    {label}
                </div>
            )}
            {children}
        </div>
    );
}

// ─── Close ────────────────────────────────────────────────────────────────────

type DropdownCloseProps = {
    children: ReactNode;
    asChild?: boolean;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'children'>;
/**
 * `<Dropdown.Close>`
 *
 * Closes the dropdown when clicked. Use inside `<Dropdown.Content>` for a
 * close affordance that isn't a selectable item — e.g. an ✕ button in a
 * dialog-style panel, or a "Cancel" footer button.
 *
 * Pass `asChild` to render as any element.
 *
 * @example
 * ```tsx
 * <Dropdown.Close asChild>
 *   <button aria-label="Close menu">✕</button>
 * </Dropdown.Close>
 * ```
 */
function DropdownClose({
    children,
    asChild = false,
    onClick,
    ...rest
}: DropdownCloseProps) {
    const { close } = useDropdown();

    const handleClick = useCallback(
        (e: MouseEvent<HTMLElement>) => {
            (onClick as ((e: MouseEvent<HTMLElement>) => void) | undefined)?.(
                e,
            );
            close();
        },
        [onClick, close],
    );

    if (asChild) {
        const child = Children.only(children);
        if (!isValidElement(child)) {
            throw new Error(
                '<Dropdown.Close asChild> requires a single valid element child.',
            );
        }
        return cloneElement(
            child as React.ReactElement<Record<string, unknown>>,
            {
                onClick: handleClick,
            },
        );
    }

    return (
        <button
            {...rest}
            type="button"
            onClick={handleClick as React.MouseEventHandler<HTMLButtonElement>}
        >
            {children}
        </button>
    );
}

// ─── Separator ────────────────────────────────────────────────────────────────

type DropdownSeparatorProps = {
    className?: string;
    style?: React.CSSProperties;
};
/**
 * `<Dropdown.Separator>`
 *
 * A visual and semantic divider between groups of items.
 */
function DropdownSeparator({ className, style }: DropdownSeparatorProps) {
    return (
        <div
            role="separator"
            aria-orientation="horizontal"
            className={cn('my-1 h-px bg-zinc-200 dark:bg-zinc-700', className)}
            style={style}
        />
    );
}

// ─── Label ────────────────────────────────────────────────────────────────────

type DropdownLabelProps = {
    children: ReactNode;
} & React.HTMLAttributes<HTMLDivElement>;
/**
 * `<Dropdown.Label>`
 *
 * A standalone non-interactive label. For grouping with semantics, prefer
 * `<Dropdown.Group label="...">` which wires up `aria-labelledby` correctly.
 * Use this for decorative section headings only.
 */
function DropdownLabel({ children, className, ...rest }: DropdownLabelProps) {
    return (
        <div
            {...rest}
            role="presentation"
            className={cn(
                'px-2.5 pb-1 pt-2 text-xs font-medium text-zinc-400 dark:text-zinc-500',
                className,
            )}
        >
            {children}
        </div>
    );
}

// ─── Compound export ──────────────────────────────────────────────────────────

Dropdown.Trigger = DropdownTrigger;
Dropdown.Content = DropdownContent;
Dropdown.Item = DropdownItem;
Dropdown.CheckboxItem = DropdownCheckboxItem;
Dropdown.RadioGroup = DropdownRadioGroup;
Dropdown.RadioItem = DropdownRadioItem;
Dropdown.Group = DropdownGroup;
Dropdown.Close = DropdownClose;
Dropdown.Separator = DropdownSeparator;
Dropdown.Label = DropdownLabel;

export { Dropdown, useDropdown };
export type {
    DropdownProps,
    DropdownTriggerProps,
    DropdownContentProps,
    DropdownItemProps,
    DropdownCheckboxItemProps,
    DropdownRadioGroupProps,
    DropdownRadioItemProps,
    DropdownGroupProps,
    DropdownCloseProps,
    DropdownSeparatorProps,
    DropdownLabelProps,
};
