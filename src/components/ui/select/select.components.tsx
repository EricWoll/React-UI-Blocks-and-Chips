"use client";

import {
  useCallback,
  useEffect,
  useId,
  useMemo,
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
import {
  SelectContext,
  useSelect,
  type SelectEvent,
  type SelectOption,
  type SelectValue,
} from "./select.contexts";

// ─── Types ────────────────────────────────────────────────────────────────────

type SelectBaseProps = {
  children: ReactNode;

  /**
   * The authoritative option metadata.
   *
   * Labels live here instead of being discovered from mounted Select.Item DOM.
   * That makes labels available during the first render, while the popup is
   * closed, during SSR, and when the option list is virtualized.
   */
  options: readonly SelectOption[];

  disabled?: boolean;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
};

type SingleSelectProps = SelectBaseProps & {
  multiple?: false;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

type MultipleSelectProps = SelectBaseProps & {
  multiple: true;
  value?: string[];
  defaultValue?: string[];
  onValueChange?: (value: string[]) => void;
};

export type SelectProps = SingleSelectProps | MultipleSelectProps;

export type SelectTriggerRenderProps = {
  value: SelectValue;
  selectedValues: readonly string[];
  labels: readonly string[];
  isOpen: boolean;
};

export type SelectTriggerProps = Omit<DropdownTriggerProps, "children"> & {
  children: ReactNode | ((props: SelectTriggerRenderProps) => ReactNode);
};

export type SelectContentProps = Omit<DropdownContentProps, "role">;

export type SelectItemProps = Omit<
  DropdownItemProps,
  "onSelect" | "asChild" | "role" | "aria-selected"
> & {
  value: string;
  onSelect?: (value: string, event: SelectEvent) => void;
};

export type SelectGroupProps = DropdownGroupProps;
export type SelectSeparatorProps = DropdownSeparatorProps;
export type SelectLabelProps = DropdownLabelProps;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function normalizeValue(value: SelectValue | undefined, multiple: boolean) {
  if (multiple) {
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
  }

  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function selectionArray(value: SelectValue, multiple: boolean): string[] {
  if (multiple) return value as string[];
  return value ? [value as string] : [];
}

// ─── Root ─────────────────────────────────────────────────────────────────────

function Select(props: SelectProps) {
  const {
    children,
    options,
    multiple = false,
    disabled = false,
    open: controlledOpen,
    defaultOpen = false,
    onOpenChange,
  } = props;

  const controlledValue = props.value;
  const defaultValue = props.defaultValue;
  const onValueChange = props.onValueChange;

  const isValueControlled = controlledValue !== undefined;
  const isOpenControlled = controlledOpen !== undefined;

  const [uncontrolledValue, setUncontrolledValue] = useState<SelectValue>(() =>
    normalizeValue(defaultValue, multiple),
  );
  const [uncontrolledOpen, setUncontrolledOpen] = useState(defaultOpen);

  const value = isValueControlled
    ? normalizeValue(controlledValue, multiple)
    : normalizeValue(uncontrolledValue, multiple);
  const selectedValues = selectionArray(value, multiple);
  const isOpen = isOpenControlled ? controlledOpen : uncontrolledOpen;

  const optionMap = useMemo(() => {
    const map = new Map<string, SelectOption>();

    for (const option of options) {
      if (process.env.NODE_ENV !== "production" && map.has(option.value)) {
        console.warn(
          `Select received duplicate option value "${option.value}". ` +
            "Option values must be unique.",
        );
      }

      map.set(option.value, option);
    }

    return map;
  }, [options]);

  const labels = useMemo(
    () =>
      selectedValues.map(
        (selectedValue) => optionMap.get(selectedValue)?.label ?? selectedValue,
      ),
    [optionMap, selectedValues],
  );

  const valueRef = useRef(value);
  valueRef.current = value;

  const onValueChangeRef = useRef(onValueChange);
  onValueChangeRef.current = onValueChange;

  const onOpenChangeRef = useRef(onOpenChange);
  onOpenChangeRef.current = onOpenChange;

  const initialValueControlRef = useRef(isValueControlled);
  const initialOpenControlRef = useRef(isOpenControlled);
  const initialMultipleRef = useRef(multiple);

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    if (initialValueControlRef.current !== isValueControlled) {
      console.warn(
        "Select changed between controlled and uncontrolled value mode. " +
          "Use either value or defaultValue for the component lifetime.",
      );
    }

    if (initialOpenControlRef.current !== isOpenControlled) {
      console.warn(
        "Select changed between controlled and uncontrolled open mode. " +
          "Use either open or defaultOpen for the component lifetime.",
      );
    }

    if (initialMultipleRef.current !== multiple) {
      console.warn(
        "Select changed its multiple mode after mounting. " +
          "Keep multiple stable for the component lifetime.",
      );
    }
  }, [isOpenControlled, isValueControlled, multiple]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!isOpenControlled) setUncontrolledOpen(nextOpen);
      onOpenChangeRef.current?.(nextOpen);
    },
    [isOpenControlled],
  );

  const getOption = useCallback(
    (optionValue: string) => optionMap.get(optionValue),
    [optionMap],
  );

  const isSelected = useCallback(
    (optionValue: string) => {
      const current = valueRef.current;
      return multiple
        ? (current as string[]).includes(optionValue)
        : current === optionValue;
    },
    [multiple],
  );

  const select = useCallback(
    (optionValue: string) => {
      const option = optionMap.get(optionValue);
      if (option?.disabled) return;

      const current = valueRef.current;
      let nextValue: SelectValue;

      if (multiple) {
        const currentValues = current as string[];
        nextValue = currentValues.includes(optionValue)
          ? currentValues.filter((value) => value !== optionValue)
          : [...currentValues, optionValue];
      } else {
        nextValue = optionValue;
      }

      // Avoid stale calculations if more than one selection occurs before the
      // parent or React state has committed the previous update.
      valueRef.current = nextValue;

      if (!isValueControlled) setUncontrolledValue(nextValue);

      if (multiple) {
        (onValueChangeRef.current as ((value: string[]) => void) | undefined)?.(
          nextValue as string[],
        );
      } else {
        (onValueChangeRef.current as ((value: string) => void) | undefined)?.(
          nextValue as string,
        );
      }
    },
    [isValueControlled, multiple, optionMap],
  );

  const contextValue = useMemo(
    () => ({
      multiple,
      value,
      selectedValues,
      labels,
      isOpen,
      getOption,
      isSelected,
      select,
    }),
    [
      multiple,
      value,
      selectedValues,
      labels,
      isOpen,
      getOption,
      isSelected,
      select,
    ],
  );

  return (
    <SelectContext.Provider value={contextValue}>
      <Dropdown
        open={isOpen}
        onOpenChange={handleOpenChange}
        disabled={disabled}
      >
        {children}
      </Dropdown>
    </SelectContext.Provider>
  );
}

// ─── Trigger ──────────────────────────────────────────────────────────────────

function SelectTrigger({ children, ...props }: SelectTriggerProps) {
  const { value, selectedValues, labels, isOpen } = useSelect();

  const renderedChildren =
    typeof children === "function"
      ? children({ value, selectedValues, labels, isOpen })
      : children;

  return <Dropdown.Trigger {...props}>{renderedChildren}</Dropdown.Trigger>;
}

// ─── Content ──────────────────────────────────────────────────────────────────

function SelectContent(props: SelectContentProps) {
  return <Dropdown.Content {...props} role="listbox" />;
}

// ─── Item ─────────────────────────────────────────────────────────────────────

function SelectItem({
  children,
  value,
  disabled: disabledProp,
  onSelect,
  className,
  itemId,
  ...props
}: SelectItemProps) {
  const generatedId = useId();
  const resolvedItemId = itemId ?? generatedId;
  const { multiple, getOption, isSelected, select } = useSelect();

  const option = getOption(value);
  const disabled = disabledProp ?? option?.disabled ?? false;
  const selected = isSelected(value);

  if (process.env.NODE_ENV !== "production" && !option) {
    console.warn(
      `Select.Item value "${value}" is missing from the Select options prop.`,
    );
  }

  const handleSelect = useCallback(
    (event: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>) => {
      if (disabled) return;

      onSelect?.(value, event);
      if (event.defaultPrevented) return;

      select(value);

      // Dropdown.Item closes by default. Multi-select keeps the panel open so
      // the user can continue toggling options.
      if (multiple) event.preventDefault();
    },
    [disabled, multiple, onSelect, select, value],
  );

  return (
    <Dropdown.Item
      {...props}
      itemId={resolvedItemId}
      role="option"
      disabled={disabled}
      aria-selected={selected}
      data-selected={selected}
      className={cn("data-[selected=true]:font-medium", className)}
      onSelect={handleSelect}
    >
      {children}
    </Dropdown.Item>
  );
}

// ─── Pass-throughs ────────────────────────────────────────────────────────────

function SelectGroup(props: SelectGroupProps) {
  return <Dropdown.Group {...props} />;
}

function SelectSeparator(props: SelectSeparatorProps) {
  return <Dropdown.Separator {...props} />;
}

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

export { Select, useSelect };
