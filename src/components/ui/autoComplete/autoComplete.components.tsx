"use client";

import {
  createContext,
  useCallback,
  useContext,
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
  type DropdownItemProps,
} from "@/components/ui/dropdown/dropdown.components";
import { cn } from "@/lib/tools/cn.tools";

type ACContext = {
  query: string;
  setQuery(q: string): void;
  selectedLabel: string | null;
  select(value: string, label: string): void;
  clear(): void;
  inputRef: React.RefObject<HTMLInputElement | null>;
  keepCursorOnSelect: boolean;
  keepInputOnSelect: boolean;
};
const Context = createContext<ACContext | null>(null);
export function useAutocomplete() {
  const x = useContext(Context);
  if (!x)
    throw new Error("Autocomplete components must be inside <Autocomplete>");
  return x;
}
export type AutocompleteProps = {
  children: ReactNode;
  onQueryChange?(q: string): void;
  onValueChange?(v: string): void;
  value?: string;
  valueLabel?: string;
  disabled?: boolean;
  keepCursorOnSelect?: boolean;
  keepInputOnSelect?: boolean;
};
function Autocomplete({
  children,
  onQueryChange,
  onValueChange,
  value,
  valueLabel,
  disabled = false,
  keepCursorOnSelect = false,
  keepInputOnSelect = false,
}: AutocompleteProps) {
  const [query, setQueryState] = useState(""),
    [label, setLabel] = useState<string | null>(
      value ? (valueLabel ?? null) : null,
    ),
    [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const queryChange = useRef(onQueryChange),
    valueChange = useRef(onValueChange);
  queryChange.current = onQueryChange;
  valueChange.current = onValueChange;
  useEffect(
    () => setLabel(value ? (valueLabel ?? null) : null),
    [value, valueLabel],
  );
  const setQuery = useCallback((q: string) => {
    setQueryState(q);
    queryChange.current?.(q);
  }, []);
  const select = useCallback(
    (v: string, l: string) => {
      setLabel(keepInputOnSelect ? l : null);
      setQueryState(keepInputOnSelect ? l : "");
      queryChange.current?.(keepInputOnSelect ? l : "");
      valueChange.current?.(v);
      setOpen(false);
    },
    [keepInputOnSelect],
  );
  const clear = useCallback(() => {
    setLabel(null);
    setQueryState("");
    queryChange.current?.("");
    valueChange.current?.("");
  }, []);
  const ctx = useMemo(
    () => ({
      query,
      setQuery,
      selectedLabel: label,
      select,
      clear,
      inputRef,
      keepCursorOnSelect,
      keepInputOnSelect,
    }),
    [
      query,
      setQuery,
      label,
      select,
      clear,
      keepCursorOnSelect,
      keepInputOnSelect,
    ],
  );
  return (
    <Context.Provider value={ctx}>
      <Dropdown
        open={open}
        onOpenChange={setOpen}
        disabled={disabled}
        ignoreElementRefs={[inputRef]}
        portalLayerName="autocomplete"
      >
        {children}
      </Dropdown>
    </Context.Provider>
  );
}
export type AutocompleteInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
> & { icon?: ReactNode; clearIcon?: ReactNode };
function Input({
  icon,
  clearIcon,
  className,
  onFocus,
  onKeyDown,
  ...rest
}: AutocompleteInputProps) {
  const ac = useAutocomplete(),
    dd = useDropdown();
  const display = ac.keepInputOnSelect
    ? ac.query
    : ac.selectedLabel || ac.query;
  const change = (e: ChangeEvent<HTMLInputElement>) => {
    if (ac.selectedLabel) ac.clear();
    ac.setQuery(e.target.value);
    if (!dd.isOpen) dd.setOpen(true);
  };
  const key = (e: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(e);
    if (e.defaultPrevented) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      dd.setOpen(true);
      requestAnimationFrame(() => dd.contentRef.current?.focus());
    } else if (e.key === "Escape") {
      dd.close();
    } else if (e.key === "Enter" && dd.highlightedId) {
      e.preventDefault();
      dd.items()
        .find((x) => x.id === dd.highlightedId)
        ?.element.click();
    }
  };
  return (
    <div
      ref={dd.triggerRef as React.RefObject<HTMLDivElement>}
      className={cn("relative flex items-center", className)}
      onMouseDown={() => ac.inputRef.current?.focus()}
    >
      {icon}
      <input
        {...rest}
        ref={ac.inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={dd.isOpen}
        aria-controls={dd.isOpen ? dd.contentId : undefined}
        value={display}
        onChange={change}
        onFocus={(e) => {
          onFocus?.(e);
          dd.setOpen(true);
        }}
        onKeyDown={key}
        autoComplete="off"
        className="w-full rounded-md border px-3 py-1.5 pr-8"
      />
      {display && (
        <button
          type="button"
          tabIndex={-1}
          aria-label="Clear selection"
          onMouseDown={(e) => {
            e.preventDefault();
            ac.clear();
            ac.inputRef.current?.focus();
          }}
          className="absolute right-2.5"
        >
          {clearIcon ?? "×"}
        </button>
      )}
    </div>
  );
}
export type AutocompleteContentProps = Omit<
  DropdownContentProps,
  "role" | "matchContentWidth"
> & { emptyState?: ReactNode; isEmpty?: boolean; disableOnEmpty?: boolean };
function Content({
  children,
  emptyState,
  isEmpty = false,
  disableOnEmpty = true,
  ...rest
}: AutocompleteContentProps) {
  const ac = useAutocomplete();
  if (isEmpty && disableOnEmpty && !ac.query.trim()) return null;
  return (
    <Dropdown.Content {...rest} role="listbox" matchContentWidth>
      {isEmpty
        ? (emptyState ?? (
            <p className="px-2.5 py-4 text-center text-zinc-500">
              No results found
            </p>
          ))
        : children}
    </Dropdown.Content>
  );
}
export type AutocompleteItemProps = Omit<
  DropdownItemProps,
  "onSelect" | "asChild"
> & { value: string; label?: string; onSelect?(value: string): void };
function Item({
  value,
  label,
  onSelect,
  children,
  ...props
}: AutocompleteItemProps) {
  const ac = useAutocomplete();
  return (
    <Dropdown.Item
      {...props}
      role="option"
      onSelect={(e) => {
        const text = label ?? (e.currentTarget.textContent?.trim() || value);
        e.preventDefault();
        ac.select(value, text);
        onSelect?.(value);
        if (ac.keepCursorOnSelect)
          requestAnimationFrame(() => ac.inputRef.current?.focus());
      }}
    >
      {children}
    </Dropdown.Item>
  );
}
Autocomplete.Input = Input;
Autocomplete.Content = Content;
Autocomplete.Item = Item;
Autocomplete.Group = Dropdown.Group;
Autocomplete.Separator = Dropdown.Separator;
Autocomplete.Label = Dropdown.Label;
export { Autocomplete };
