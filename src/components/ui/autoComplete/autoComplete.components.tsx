"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import {
  Dropdown,
  useDropdown,
  type DropdownContentProps,
  type DropdownGroupProps,
  type DropdownItemProps,
  type DropdownLabelProps,
  type DropdownSeparatorProps,
} from "@/components/ui/dropdown/dropdown.components";
import { AutocompleteContext, useAutocomplete } from "./autocomplete.contexts";
import { cn } from "@/lib/tools/cn.tools";

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
  keepCursorOnSelect?: boolean;
  /** Keep the selected label in the input after selection. */
  keepInputOnSelect?: boolean;
};

function Autocomplete({
  children,
  onQueryChange,
  onValueChange,
  value: controlledValue,
  valueLabel,
  disabled = false,
  keepCursorOnSelect = false,
  keepInputOnSelect = false,
}: AutocompleteProps) {
  const [query, setQueryState] = useState("");
  const [selectedLabel, setSelectedLabel] = useState<string | null>(
    controlledValue && valueLabel ? valueLabel : null,
  );
  const [isOpen, setIsOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

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
      if (!keepInputOnSelect) {
        setQuery("");
        setSelectedLabel("");
      } else {
        setSelectedLabel(label);
      }

      onValueChange?.(value);
      setIsOpen(false);
    },
    [onValueChange, keepInputOnSelect],
  );

  const clearSelection = useCallback(() => {
    setSelectedLabel(null);
    setQuery("");
    onValueChange?.("");
  }, [setQuery, onValueChange]);

  const contextValue = useMemo(
    () => ({
      query,
      setQuery,
      selectedLabel,
      selectItem,
      clearSelection,
      inputRef,
      contentRef,
      keepCursorOnSelect,
      keepInputOnSelect,
    }),
    [
      query,
      setQuery,
      selectedLabel,
      selectItem,
      clearSelection,
      keepCursorOnSelect,
      keepInputOnSelect,
    ],
  );

  return (
    <AutocompleteContext.Provider value={contextValue}>
      <Dropdown
        open={isOpen}
        onOpenChange={setIsOpen}
        disabled={disabled}
        ignoreElementRefs={[inputRef, contentRef]}
        portalLayerName="autocomplete"
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
  icon?: ReactNode;
  clearIcon?: ReactNode;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">;

function AutocompleteInput({
  placeholder = "Search…",
  className,
  icon,
  clearIcon,
  onFocus,
  onKeyDown,
  ...rest
}: AutocompleteInputProps) {
  const {
    query,
    setQuery,
    selectedLabel,
    clearSelection,
    inputRef,
    contentRef,
    keepInputOnSelect,
  } = useAutocomplete();
  const { isOpen, open, close, triggerRef, contentId } = useDropdown();

  const setRefs = useCallback(
    (el: HTMLInputElement | null) => {
      (inputRef as React.RefObject<HTMLInputElement | null>).current = el;
      (triggerRef as React.RefObject<HTMLElement | null>).current = el;
    },
    [inputRef, triggerRef],
  );

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;

      setQuery(val);
      if (val && !isOpen) open();
      if (!val && selectedLabel) clearSelection();
    },
    [setQuery, isOpen, open, selectedLabel, clearSelection],
  );

  const handleFocus = useCallback(
    (e: React.FocusEvent<HTMLInputElement>) => {
      onFocus?.(e);
      if (!isOpen) open();
    },
    [onFocus, open, isOpen],
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      onKeyDown?.(e);
      if (e.key === "Escape") {
        close();
        inputRef.current?.blur();
      }
      if (e.key === "Tab" && isOpen) {
        e.preventDefault();
        contentRef.current?.focus();
      }
    },
    [onKeyDown, close, inputRef, isOpen, contentRef],
  );

  const handleClearMouseDown = useCallback(
    (e: React.MouseEvent) => {
      inputRef.current?.focus();
      e.preventDefault();
      clearSelection();
    },
    [clearSelection, inputRef],
  );

  const onContainerClick = useCallback(() => {
    inputRef.current?.focus();
  }, [inputRef]);

  const displayValue = useMemo(
    () =>
      keepInputOnSelect
        ? query
        : !selectedLabel || selectedLabel?.trim() == ""
          ? query
          : selectedLabel,
    [query, selectedLabel, keepInputOnSelect],
  );

  return (
    <div
      className={cn("relative flex items-center", className)}
      onClick={onContainerClick}
    >
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
        aria-controls={isOpen ? contentId : undefined}
        className={cn(
          "w-full rounded-md border border-zinc-200 bg-white py-1.5 text-sm text-zinc-800",
          "placeholder:text-zinc-400",
          "transition-colors duration-100",
          "hover:border-zinc-300",
          "focus:border-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300/50",
          "data-[open=true]:border-zinc-400",
          icon ? "pl-8 pr-8" : "px-3 pr-8",
        )}
        data-open={isOpen}
      />
      {displayValue !== "" && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Clear selection"
          onMouseDown={handleClearMouseDown}
          className={cn(
            "absolute right-2.5 flex items-center justify-center",
            "rounded text-zinc-400 transition-colors duration-75 cursor-pointer",
            "hover:text-zinc-600",
            "focus:outline-none focus:ring-1 focus:ring-zinc-300",
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

type AutocompleteContentProps = Omit<
  DropdownContentProps,
  "role" | "matchContentWidth"
> & {
  emptyState?: ReactNode;
  isEmpty?: boolean;
  disableOnEmpty?: boolean;
};

function AutocompleteContent({
  children,
  emptyState,
  isEmpty = false,
  disableOnEmpty = true,
  ...rest
}: AutocompleteContentProps) {
  const { contentRef, query } = useAutocomplete();

  const effectiveIsEmpty = useMemo(() => {
    if (isEmpty && disableOnEmpty && query.trim() === "") return isEmpty;
    return false;
  }, [isEmpty, emptyState, query]);

  if (effectiveIsEmpty) {
    return null;
  }

  return (
    <Dropdown.Content {...rest} role="listbox" matchContentWidth>
      <div ref={contentRef}>
        {isEmpty
          ? (emptyState ?? (
              <p
                tabIndex={0}
                className="px-2.5 py-4 text-center text-sm text-zinc-400"
              >
                No results found
              </p>
            ))
          : children}
      </div>
    </Dropdown.Content>
  );
}

// ─── Item ─────────────────────────────────────────────────────────────────────

type AutocompleteItemProps = Omit<DropdownItemProps, "onSelect" | "asChild"> & {
  value: string;
  label?: string;
  onSelect?: (value: string) => void;
};

function AutocompleteItem({
  children,
  value,
  label,
  disabled = false,
  onSelect,
  className,
  ...rest
}: AutocompleteItemProps) {
  const { selectItem, keepCursorOnSelect, inputRef } = useAutocomplete();
  const itemRef = useRef<HTMLDivElement | null>(null);

  const handleSelect = useCallback(() => {
    if (disabled) return;
    const effectiveLabel =
      label !== undefined && label !== "" ? label : undefined;
    const resolvedLabel =
      effectiveLabel ??
      (itemRef.current
        ? Array.from(itemRef.current.childNodes)
            .filter((n) => n.nodeType === Node.TEXT_NODE)
            .map((n) => n.textContent?.trim())
            .filter(Boolean)
            .join(" ") || itemRef.current.textContent?.trim()
        : null) ??
      value;
    selectItem(value, resolvedLabel);
    onSelect?.(value);

    if (keepCursorOnSelect) {
      inputRef.current?.focus();
    }
  }, [
    disabled,
    label,
    value,
    selectItem,
    onSelect,
    keepCursorOnSelect,
    inputRef,
  ]);

  return (
    <div ref={itemRef} style={{ display: "contents" }}>
      <Dropdown.Item
        {...rest}
        disabled={disabled}
        className={cn("aria-selected:font-medium", className)}
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
