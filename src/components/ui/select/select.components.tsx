"use client";

import {
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  Dropdown,
  type DropdownContentProps,
  type DropdownGroupProps,
  type DropdownItemProps,
  type DropdownLabelProps,
  type DropdownSeparatorProps,
  type DropdownTriggerProps,
} from "@/components/ui/dropdown/dropdown.components";
import { cn } from "@/lib/tools/cn.tools";
import { SelectContext, useSelect } from "./select.contexts";

// ─── Helper ──────────────────────────────────────────────────────────────────

function normalise(
  v: string | string[] | undefined,
  multiple: boolean,
): string | string[] {
  if (multiple) return Array.isArray(v) ? v : v ? [v] : [];
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

// ─── Root ─────────────────────────────────────────────────────────────────────

type SelectProps = {
  children: ReactNode;
  /**
   * Controlled value. string for single, string[] for multi.
   * Pair with onValueChange.
   */
  value?: string | string[];
  onValueChange?: (value: string | string[]) => void;
  /** Uncontrolled default value. */
  defaultValue?: string | string[];
  /** Allow multiple items to be selected. Defaults to false. */
  multiple?: boolean;
  disabled?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
};
/**
 * `<Select>`
 *
 * Layered on top of `<Dropdown>`. Owns value state and exposes it to
 * `Select.Trigger` via a render prop and to `Select.Item` via context.
 * `Dropdown` is never touched — Select is purely additive.
 *
 * @example Single (uncontrolled)
 * ```tsx
 * <Select defaultValue="apple">
 *   <Select.Trigger>
 *     {({ labels }) => <span>{labels[0] ?? "Pick a fruit"}</span>}
 *   </Select.Trigger>
 *   <Select.Content>
 *     <Select.Item value="apple">Apple</Select.Item>
 *     <Select.Item value="banana">Banana</Select.Item>
 *   </Select.Content>
 * </Select>
 * ```
 *
 * @example Multi (controlled)
 * ```tsx
 * <Select multiple value={selected} onValueChange={setSelected}>
 *   <Select.Trigger>
 *     {({ labels }) => <span>{labels.join(", ") || "Pick fruits"}</span>}
 *   </Select.Trigger>
 *   <Select.Content>
 *     <Select.Item value="apple">Apple</Select.Item>
 *     <Select.Item value="banana">Banana</Select.Item>
 *   </Select.Content>
 * </Select>
 * ```
 *
 * @example Grouped with separator
 * ```tsx
 * <Select>
 *   <Select.Trigger>{({ labels }) => labels[0] ?? "Select"}</Select.Trigger>
 *   <Select.Content>
 *     <Select.Group label="Fruits">
 *       <Select.Item value="apple">Apple</Select.Item>
 *       <Select.Item value="banana">Banana</Select.Item>
 *     </Select.Group>
 *     <Select.Separator />
 *     <Select.Group label="Veggies">
 *       <Select.Item value="carrot">Carrot</Select.Item>
 *     </Select.Group>
 *   </Select.Content>
 * </Select>
 * ```
 */
function Select({
  children,
  value: controlledValue,
  onValueChange,
  defaultValue,
  multiple = false,
  disabled,
  open,
  onOpenChange,
  defaultOpen,
}: SelectProps) {
  const isValueControlled = controlledValue !== undefined;

  const [uncontrolledValue, setUncontrolledValue] = useState<string | string[]>(
    () => normalise(defaultValue, multiple),
  );

  const value = isValueControlled
    ? normalise(controlledValue, multiple)
    : uncontrolledValue;

  // Open state is delegated to Dropdown — we just pass it through.
  const [internalOpen, setInternalOpen] = useState(defaultOpen ?? false);
  const isOpen = open !== undefined ? open : internalOpen;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setInternalOpen(next);
      onOpenChange?.(next);
    },
    [onOpenChange],
  );

  // Label registry — Select.Item registers its textContent label on mount
  // so Trigger can surface it without the developer wiring it up manually.
  const labelMapRef = useRef<Map<string, string>>(new Map());

  const registerLabel = useCallback((v: string, label: string) => {
    labelMapRef.current.set(v, label);
  }, []);

  const unregisterLabel = useCallback((v: string) => {
    labelMapRef.current.delete(v);
  }, []);

  const isSelected = useCallback(
    (v: string) =>
      multiple ? (value as string[]).includes(v) : (value as string) === v,
    [value, multiple],
  );

  const select = useCallback(
    (v: string, _e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
      let next: string | string[];

      if (multiple) {
        const current = value as string[];
        next = current.includes(v)
          ? current.filter((x) => x !== v)
          : [...current, v];
      } else {
        next = v;
      }

      if (!isValueControlled) setUncontrolledValue(next);
      onValueChange?.(next);
    },
    [multiple, value, isValueControlled, onValueChange],
  );

  // Derive ordered display labels from the current value.
  const labels = (
    multiple ? (value as string[]) : value ? [value as string] : []
  )
    .map((v) => labelMapRef.current.get(v))
    .filter((l): l is string => l !== undefined);

  return (
    <SelectContext.Provider
      value={{
        multiple,
        value,
        isSelected,
        select,
        registerLabel,
        unregisterLabel,
        labels,
        isOpen,
      }}
    >
      <Dropdown
        open={isOpen}
        onOpenChange={handleOpenChange}
        disabled={disabled}
        defaultOpen={defaultOpen}
      >
        {children}
      </Dropdown>
    </SelectContext.Provider>
  );
}

// ─── Trigger ──────────────────────────────────────────────────────────────────

type SelectTriggerRenderProps = {
  /** Current raw value(s). string in single mode, string[] in multi mode. */
  value: string | string[];
  /** Display labels of the selected item(s) in selection order. */
  labels: string[];
  isOpen: boolean;
};
type SelectTriggerProps = Omit<DropdownTriggerProps, "children"> & {
  children: ReactNode | ((props: SelectTriggerRenderProps) => ReactNode);
};

/**
 * `<Select.Trigger>`
 *
 * Pass a render prop as children to access current selection state.
 * Plain children work too — the render prop is optional.
 * All other props forward to `Dropdown.Trigger`.
 *
 * Data attributes (from Dropdown.Trigger):
 * - `data-open="true|false"`
 * - `data-disabled="true|false"`
 *
 * @example
 * ```tsx
 * <Select.Trigger>
 *   {({ labels, isOpen }) => (
 *     <>
 *       <span>{labels[0] ?? "Select…"}</span>
 *       <ChevronDownIcon className={cn("transition-transform", isOpen && "rotate-180")} />
 *     </>
 *   )}
 * </Select.Trigger>
 * ```
 */
function SelectTrigger({ children, ...rest }: SelectTriggerProps) {
  const { value, labels, isOpen, multiple } = useSelect();

  const rendered =
    typeof children === "function"
      ? children({ value, labels, isOpen })
      : children;

  return <Dropdown.Trigger {...rest}>{rendered}</Dropdown.Trigger>;
}

// ─── Content ──────────────────────────────────────────────────────────────────

type SelectContentProps = Omit<DropdownContentProps, "role">;
/**
 * `<Select.Content>`
 *
 * Thin wrapper around `Dropdown.Content` that fixes `role="listbox"` —
 * the correct ARIA role for a value picker. All other props are forwarded.
 *
 */
function SelectContent({ ...rest }: SelectContentProps) {
  return <Dropdown.Content {...rest} role="listbox" />;
}

// ─── Item ─────────────────────────────────────────────────────────────────────

type SelectItemProps = Omit<DropdownItemProps, "onSelect" | "asChild"> & {
  value: string;
  onSelect?: (
    value: string,
    e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  ) => void;
};
/**
 * `<Select.Item>`
 *
 * Wraps `Dropdown.Item`. Takes a `value` prop — everything else is the same.
 * Registers its `textContent` as the display label on mount so `Select.Trigger`
 * can render the selected label without extra wiring.
 *
 * In multi mode the panel stays open after selection.
 * In single mode it closes as normal.
 *
 * Data attributes:
 * - `data-highlighted="true|false"` — from Dropdown.Item
 * - `data-disabled="true|false"`   — from Dropdown.Item
 * - `data-selected="true|false"`   — set by Select, reflects actual value state
 *
 * @example
 * ```tsx
 * <Select.Item value="apple">
 *   <AppleIcon />
 *   Apple
 * </Select.Item>
 * ```
 */
function SelectItem({
  children,
  value,
  disabled = false,
  onSelect,
  className,
  itemId: propId,
  ...rest
}: SelectItemProps) {
  const autoId = useId();
  const selectItemId = propId ?? autoId;

  const { isSelected, select, multiple, registerLabel, unregisterLabel } =
    useSelect();
  const selected = isSelected(value);

  // Capture the item's text label on mount via a layout effect so the trigger
  // can render it. We use a ref to the wrapper div rather than cloneElement
  // so we don't interfere with Dropdown.Item's own ref handling.
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const el = wrapperRef.current;
    if (!el) return;
    registerLabel(value, el.textContent?.trim() ?? value);
    return () => unregisterLabel(value);
  }, [value, registerLabel, unregisterLabel]);

  const handleSelect = useCallback(
    (e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
      if (disabled) return;
      select(value, e);
      onSelect?.(value, e);
      // In multi mode, prevent Dropdown.Item from closing the panel so the
      // user can continue picking items.
      if (multiple) e.preventDefault();
    },
    [disabled, multiple, select, value, onSelect],
  );

  return (
    // Wrapper div is solely for label capture — zero visual impact.
    <div ref={wrapperRef} style={{ display: "contents" }}>
      <Dropdown.Item
        {...rest}
        data-item-id={selectItemId}
        disabled={disabled}
        data-selected={selected}
        aria-selected={selected}
        className={cn("data-[selected=true]:font-medium", className)}
        onSelect={handleSelect}
      >
        {children}
      </Dropdown.Item>
    </div>
  );
}

// ─── Pass-throughs ────────────────────────────────────────────────────────────

type SelectGroupProps = DropdownGroupProps;
/**
 * `<Select.Group>`
 *
 * Pass-through to `Dropdown.Group`. Use for labelled groups of options.
 */
function SelectGroup(props: SelectGroupProps) {
  return <Dropdown.Group {...props} />;
}

type SelectSeparatorProps = DropdownSeparatorProps;
/**
 * `<Select.Separator>`
 *
 * Pass-through to `Dropdown.Separator`.
 */
function SelectSeparator(props: SelectSeparatorProps) {
  return <Dropdown.Separator {...props} />;
}

type SelectLabelProps = DropdownLabelProps;
/**
 * `<Select.Label>`
 *
 * Pass-through to `Dropdown.Label`. Prefer `Select.Group` for grouped options.
 */
function SelectLabel(props: SelectLabelProps) {
  return <Dropdown.Label {...props} />;
}

// ─── Compound export ──────────────────────────────────────────────────────────

Select.Trigger = SelectTrigger;
Select.Content = SelectContent;
Select.Item = SelectItem;
Select.Group = SelectGroup;
Select.Separator = SelectSeparator;
Select.Label = SelectLabel;

export { Select };
export type {
  SelectProps,
  SelectTriggerProps,
  SelectTriggerRenderProps,
  SelectContentProps,
  SelectItemProps,
  SelectGroupProps,
  SelectSeparatorProps,
  SelectLabelProps,
};
