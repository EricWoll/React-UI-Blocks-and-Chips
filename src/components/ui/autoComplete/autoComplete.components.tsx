'use client';

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ChangeEvent,
    type KeyboardEvent,
    type ReactNode,
} from 'react';
import {
    Dropdown,
    useDropdown,
    type DropdownContentProps,
    type DropdownGroupProps,
    type DropdownItemProps,
    type DropdownLabelProps,
    type DropdownSeparatorProps,
} from '@/components/ui/dropdown/dropdown.components';
import { AutocompleteContext, useAutocomplete } from './autocomplete.contexts';
import { cn } from '@/lib/tools/cn.tools';

// ─── Root ─────────────────────────────────────────────────────────────────────

type AutocompleteProps = {
    children: ReactNode;
    /** Fires when the user types — use this to filter your options list. */
    onQueryChange?: (query: string) => void;
    /** Fires when the user selects an item. */
    onValueChange?: (value: string) => void;
    /** Controlled selected value. */
    value?: string;
    /** The display label for a controlled value — required when `value` is set. */
    valueLabel?: string;
    disabled?: boolean;
};

/**
 * `<Autocomplete>`
 *
 * Root provider. Built directly on `<Dropdown>` — owns the query string,
 * the selected value, and wires them together. Filtering is the consumer's
 * responsibility: update your options list in response to `onQueryChange`.
 *
 * @example
 * ```tsx
 * const [query, setQuery] = useState("");
 * const filtered = options.filter(o =>
 *   o.label.toLowerCase().includes(query.toLowerCase())
 * );
 *
 * <Autocomplete onQueryChange={setQuery} onValueChange={setValue}>
 *   <Autocomplete.Input placeholder="Search…" />
 *   <Autocomplete.Content>
 *     {filtered.map(o => (
 *       <Autocomplete.Item key={o.value} value={o.value} label={o.label}>
 *         {o.label}
 *       </Autocomplete.Item>
 *     ))}
 *   </Autocomplete.Content>
 * </Autocomplete>
 * ```
 */
function Autocomplete({
    children,
    onQueryChange,
    onValueChange,
    value: controlledValue,
    valueLabel,
    disabled = false,
}: AutocompleteProps) {
    const [query, setQueryState] = useState('');
    const [selectedLabel, setSelectedLabel] = useState<string | null>(
        controlledValue && valueLabel ? valueLabel : null,
    );
    const [isOpen, setIsOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);

    // FIX 1 — Sync selectedLabel when controlled value/label changes externally.
    // useState initialiser only runs once on mount so controlled updates were silently dropped.
    useEffect(() => {
        if (controlledValue && valueLabel) {
            setSelectedLabel(valueLabel);
        } else if (!controlledValue) {
            setSelectedLabel(null);
        }
    }, [controlledValue, valueLabel]);

    const setQuery = useCallback(
        (q: string) => {
            setQueryState(q);
            onQueryChange?.(q);
        },
        [onQueryChange],
    );

    const selectItem = useCallback(
        (value: string, label: string) => {
            setSelectedLabel(label);
            // FIX 4 — Bypass setQuery (and therefore onQueryChange) on selection.
            // The dropdown is closing; triggering a consumer filter reset here is
            // unnecessary work and can cause a visible flash of all options.
            setQueryState('');
            onValueChange?.(value);
            setIsOpen(false);
        },
        [onValueChange],
    );

    const clearSelection = useCallback(() => {
        setSelectedLabel(null);
        // clearSelection IS user-initiated — fire onQueryChange so the consumer
        // resets their filtered list ready for the next search.
        setQuery('');
        onValueChange?.('');
    }, [setQuery, onValueChange]);

    // FIX 5 — Memoize context value. Without this every render of Autocomplete
    // creates a new object reference, re-rendering all context consumers even
    // when nothing they care about has changed. Callbacks are stable via
    // useCallback; only query and selectedLabel are volatile.
    const contextValue = useMemo(
        () => ({
            query,
            setQuery,
            selectedLabel,
            selectItem,
            clearSelection,
            inputRef,
        }),
        [query, setQuery, selectedLabel, selectItem, clearSelection],
    );

    return (
        <AutocompleteContext.Provider value={contextValue}>
            <Dropdown
                open={isOpen}
                onOpenChange={setIsOpen}
                disabled={disabled}
            >
                {children}
            </Dropdown>
        </AutocompleteContext.Provider>
    );
}

// ─── Input ────────────────────────────────────────────────────────────────────

type AutocompleteInputProps = {
    placeholder?: string;
    className?: string;
    /** Icon rendered on the left side of the input. */
    icon?: ReactNode;
    /** Override the default clear button. */
    clearIcon?: ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>;

/**
 * `<Autocomplete.Input>`
 *
 * The text field. Replaces `Dropdown.Trigger` — do not use both.
 * Opens the dropdown on focus and on any keystroke.
 * Shows the selected label when closed and no query is active.
 * Renders a clear button when a value is selected.
 */
function AutocompleteInput({
    placeholder = 'Search…',
    className,
    icon,
    clearIcon,
    onFocus,
    onKeyDown,
    ...rest
}: AutocompleteInputProps) {
    const { query, setQuery, selectedLabel, clearSelection, inputRef } =
        useAutocomplete();
    const { isOpen, open, close, triggerRef, contentId } = useDropdown();

    // Merge the Dropdown triggerRef with our inputRef so positioning still works.
    const setRefs = useCallback(
        (el: HTMLInputElement | null) => {
            (
                inputRef as React.MutableRefObject<HTMLInputElement | null>
            ).current = el;
            (triggerRef as React.MutableRefObject<HTMLElement | null>).current =
                el;
        },
        [inputRef, triggerRef],
    );

    const handleChange = useCallback(
        (e: ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value;
            setQuery(val);
            if (val && !isOpen) open();
            // If user manually clears the input, reset the selection too.
            if (!val && selectedLabel) clearSelection();
        },
        [setQuery, isOpen, open, selectedLabel, clearSelection],
    );

    const handleFocus = useCallback(
        (e: React.FocusEvent<HTMLInputElement>) => {
            onFocus?.(e);
            open();
        },
        [onFocus, open],
    );

    const handleKeyDown = useCallback(
        (e: KeyboardEvent<HTMLInputElement>) => {
            onKeyDown?.(e);
            if (e.key === 'Escape') {
                e.preventDefault();
                close();
                inputRef.current?.blur();
            }
        },
        [onKeyDown, close, inputRef],
    );

    // FIX 3 — Use onMouseDown + preventDefault instead of onClick.
    // onClick fires after the input's blur event, which can trigger
    // useDismissableLayer's outside-click handler and close the dropdown
    // before the clear registers. preventDefault on mousedown stops the blur.
    const handleClearMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault(); // prevents input blur — keeps dropdown open
            clearSelection();
            inputRef.current?.focus();
        },
        [clearSelection, inputRef],
    );

    // FIX 2 — Correct display value logic.
    // Priority: active query > selected label when closed > empty (show placeholder).
    // Previous logic collapsed to empty string whenever isOpen=true and query="",
    // making the selected label disappear the moment the dropdown opened.
    const displayValue =
        query !== ''
            ? query
            : selectedLabel !== null && !isOpen
              ? selectedLabel
              : '';

    const hasValue = Boolean(selectedLabel);

    return (
        <div className={cn('relative flex items-center', className)}>
            {icon && (
                <span className="pointer-events-none absolute left-2.5 flex items-center text-zinc-400">
                    {icon}
                </span>
            )}
            <input
                {...rest}
                ref={setRefs}
                type="text"
                role="combobox"
                value={displayValue}
                placeholder={placeholder}
                onChange={handleChange}
                onFocus={handleFocus}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                aria-autocomplete="list"
                aria-expanded={isOpen}
                aria-haspopup="listbox"
                // FIX 7 — Wire aria-controls to the listbox panel id so screen readers
                // correctly associate the input with the options list.
                aria-controls={isOpen ? contentId : undefined}
                className={cn(
                    'w-full rounded-md border border-zinc-200 bg-white py-1.5 text-sm text-zinc-800',
                    'placeholder:text-zinc-400',
                    'transition-colors duration-100',
                    'hover:border-zinc-300',
                    'focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300/50',
                    'data-[open=true]:border-zinc-400',
                    icon ? 'pl-8 pr-8' : 'px-3 pr-8',
                )}
                data-open={isOpen}
            />
            {hasValue && (
                <button
                    type="button"
                    tabIndex={-1}
                    aria-label="Clear selection"
                    onMouseDown={handleClearMouseDown}
                    className={cn(
                        'absolute right-2.5 flex items-center justify-center',
                        'rounded text-zinc-400 transition-colors duration-75',
                        'hover:text-zinc-600',
                        'focus:outline-none focus:ring-1 focus:ring-zinc-300',
                    )}
                >
                    {clearIcon ?? (
                        <svg
                            width="14"
                            height="14"
                            viewBox="0 0 14 14"
                            fill="none"
                            aria-hidden="true"
                        >
                            <path
                                d="M10.5 3.5L3.5 10.5M3.5 3.5L10.5 10.5"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                            />
                        </svg>
                    )}
                </button>
            )}
        </div>
    );
}

// ─── Content ──────────────────────────────────────────────────────────────────

type AutocompleteContentProps = Omit<DropdownContentProps, 'role'> & {
    /** Rendered when the filtered list is empty. */
    emptyState?: ReactNode;
    /** Whether to show the empty state. Consumer drives this based on their filtered list. */
    isEmpty?: boolean;
};

/**
 * `<Autocomplete.Content>`
 *
 * Thin wrapper around `Dropdown.Content` with `role="listbox"`.
 * Pass `isEmpty` + `emptyState` to show a no-results message.
 */
function AutocompleteContent({
    children,
    emptyState,
    isEmpty = false,
    ...rest
}: AutocompleteContentProps) {
    return (
        <Dropdown.Content {...rest} role="listbox" matchContentWidth>
            {isEmpty
                ? (emptyState ?? (
                      <div className="px-2.5 py-4 text-center text-sm text-zinc-400">
                          No results found
                      </div>
                  ))
                : children}
        </Dropdown.Content>
    );
}

// ─── Item ─────────────────────────────────────────────────────────────────────

type AutocompleteItemProps = Omit<DropdownItemProps, 'onSelect' | 'asChild'> & {
    /** The value emitted to `onValueChange` on selection. */
    value: string;
    /**
     * The display label shown in the input on selection.
     * Defaults to the item's text content if omitted.
     */
    label?: string;
    onSelect?: (value: string) => void;
};

/**
 * `<Autocomplete.Item>`
 *
 * Wraps `Dropdown.Item`. On select, writes the label back into the input
 * and fires `onValueChange` on the root.
 *
 * Data attributes:
 * - `data-highlighted="true|false"` — from Dropdown.Item
 * - `data-disabled="true|false"`   — from Dropdown.Item
 */
function AutocompleteItem({
    children,
    value,
    label,
    disabled = false,
    onSelect,
    className,
    ...rest
}: AutocompleteItemProps) {
    const { selectItem } = useAutocomplete();
    const itemRef = useRef<HTMLDivElement | null>(null);

    // FIX 6 — Warn in dev if no explicit label is provided. textContent is a
    // fragile fallback: it pulls in icon aria-labels, title elements, and any
    // other hidden text nodes in the subtree, producing labels like "fruit Apple"
    // instead of "Apple". Always pass label when your items contain non-text nodes.
    if (process.env.NODE_ENV !== 'production' && !label) {
        console.warn(
            `<Autocomplete.Item value="${value}"> is missing a \`label\` prop. ` +
                'The component will fall back to reading textContent from the DOM, ' +
                'which is unreliable when items contain icons or other non-text nodes. ' +
                'Pass an explicit label to avoid incorrect display values in the input.',
        );
    }

    const handleSelect = useCallback(() => {
        if (disabled) return;
        // Prefer explicit label prop. Fall back to textContent only as a last
        // resort — and only read text nodes directly to avoid pulling in icon text.
        // Guard: treat label="" the same as label=undefined — ?? does not fall
        // through on empty string, which would silently set an empty input value.
        const effectiveLabel =
            label !== undefined && label !== '' ? label : undefined;
        const resolvedLabel =
            effectiveLabel ??
            (itemRef.current
                ? Array.from(itemRef.current.childNodes)
                      .filter((n) => n.nodeType === Node.TEXT_NODE)
                      .map((n) => n.textContent?.trim())
                      .filter(Boolean)
                      .join(' ') || itemRef.current.textContent?.trim()
                : null) ??
            value;
        selectItem(value, resolvedLabel);
        onSelect?.(value);
    }, [disabled, label, value, selectItem, onSelect]);

    return (
        <div ref={itemRef} style={{ display: 'contents' }}>
            <Dropdown.Item
                {...rest}
                disabled={disabled}
                className={cn('aria-selected:font-medium', className)}
                onSelect={handleSelect}
            >
                {children}
            </Dropdown.Item>
        </div>
    );
}

// ─── Pass-throughs ────────────────────────────────────────────────────────────

type AutocompleteGroupProps = DropdownGroupProps;
function AutocompleteGroup(props: AutocompleteGroupProps) {
    return <Dropdown.Group {...props} />;
}

type AutocompleteSeparatorProps = DropdownSeparatorProps;
function AutocompleteSeparator(props: AutocompleteSeparatorProps) {
    return <Dropdown.Separator {...props} />;
}

type AutocompleteLabelProps = DropdownLabelProps;
function AutocompleteLabel(props: AutocompleteLabelProps) {
    return <Dropdown.Label {...props} />;
}

// ─── Compound export ──────────────────────────────────────────────────────────

Autocomplete.Input = AutocompleteInput;
Autocomplete.Content = AutocompleteContent;
Autocomplete.Item = AutocompleteItem;
Autocomplete.Group = AutocompleteGroup;
Autocomplete.Separator = AutocompleteSeparator;
Autocomplete.Label = AutocompleteLabel;

export { Autocomplete, useAutocomplete };
export type {
    AutocompleteProps,
    AutocompleteInputProps,
    AutocompleteContentProps,
    AutocompleteItemProps,
    AutocompleteGroupProps,
    AutocompleteSeparatorProps,
    AutocompleteLabelProps,
};
