"use client";

import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type HTMLAttributes,
  type KeyboardEvent,
  type MouseEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import {
  useAutoPosition,
  type Align,
  type Placement,
  type PositionStrategy,
} from "@/hooks/useAutoPosition.hooks";
import { Portal } from "@/components/ui/portal/portal.components";
import { cn } from "@/lib/tools/cn.tools";
import { mergeRefs } from "@/lib/tools/react/mergeRefs.tools.react";
import { useDismissableLayer } from "@/lib/contexts/reactContexts/dismissal.contexts";

type ItemRecord = {
  id: string;
  element: HTMLElement;
  disabled: boolean;
  text: () => string;
};
type DropdownContextValue = {
  isOpen: boolean;
  setOpen(next: boolean): void;
  close(): void;
  toggle(): void;
  triggerId: string;
  contentId: string;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  highlightedId: string | null;
  setHighlightedId(id: string | null): void;
  register(item: ItemRecord): () => void;
  items(): ItemRecord[];
  disabled: boolean;
  usePortal: boolean;
  portalLayerName: string;
  portalZIndex: number;
};
const Context = createContext<DropdownContextValue | null>(null);
export function useDropdown() {
  const value = useContext(Context);
  if (!value) throw new Error("Dropdown components must be inside <Dropdown>");
  return value;
}

export type DropdownProps = {
  children: ReactNode;
  open?: boolean;
  onOpenChange?(open: boolean): void;
  defaultOpen?: boolean;
  disabled?: boolean;
  ignoreElementRefs?: React.RefObject<HTMLElement | null>[];
  usePortal?: boolean;
  portalLayerName?: string;
  portalZIndex?: number;
};
function Dropdown({
  children,
  open: controlled,
  onOpenChange,
  defaultOpen = false,
  disabled = false,
  ignoreElementRefs = [],
  usePortal = true,
  portalLayerName = "dropdown",
  portalZIndex = 100,
}: DropdownProps) {
  const triggerId = useId(),
    contentId = useId();

  const triggerRef = useRef<HTMLElement | null>(null),
    contentRef = useRef<HTMLDivElement | null>(null);

  const [internal, setInternal] = useState(defaultOpen),
    isOpen = controlled ?? internal;

  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const registry = useRef(new Map<string, ItemRecord>());

  const ignoreRef = useRef(ignoreElementRefs);
  ignoreRef.current = ignoreElementRefs;

  const onChangeRef = useRef(onOpenChange);
  onChangeRef.current = onOpenChange;

  const setOpen = useCallback(
    (next: boolean) => {
      if (controlled === undefined) setInternal(next);
      onChangeRef.current?.(next);
    },
    [controlled],
  );
  const close = useCallback(() => setOpen(false), [setOpen]);
  const toggle = useCallback(() => setOpen(!isOpen), [isOpen, setOpen]);

  const register = useCallback((item: ItemRecord) => {
    registry.current.set(item.id, item);
    return () => registry.current.delete(item.id);
  }, []);

  const items = useCallback(
    () =>
      [...registry.current.values()]
        .filter((x) => x.element.isConnected && !x.disabled)
        .sort((a, b) =>
          a.element.compareDocumentPosition(b.element) &
          Node.DOCUMENT_POSITION_FOLLOWING
            ? -1
            : 1,
        ),
    [],
  );
  const getRoots = useCallback(
    () => [
      triggerRef.current,
      contentRef.current,
      ...ignoreRef.current.map((x) => x.current),
    ],
    [],
  );
  useDismissableLayer({ enabled: isOpen, getRoots, onDismiss: close });

  useEffect(() => {
    if (!isOpen) setHighlightedId(null);
  }, [isOpen]);

  const value = useMemo(
    () => ({
      isOpen,
      setOpen,
      close,
      toggle,
      triggerId,
      contentId,
      triggerRef,
      contentRef,
      highlightedId,
      setHighlightedId,
      register,
      items,
      disabled,
      usePortal,
      portalLayerName,
      portalZIndex,
    }),
    [
      isOpen,
      setOpen,
      close,
      toggle,
      triggerId,
      contentId,
      highlightedId,
      register,
      items,
      disabled,
      usePortal,
      portalLayerName,
      portalZIndex,
    ],
  );
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export type DropdownTriggerProps = {
  children: ReactNode;
  asChild?: boolean;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

function Trigger({
  children,
  asChild = false,
  onClick,
  onKeyDown,
  disabled,
  ...rest
}: DropdownTriggerProps) {
  const ctx = useDropdown();
  const blocked = disabled ?? ctx.disabled;

  const handleClick = useCallback(
    (event: MouseEvent<HTMLElement>) => {
      (onClick as React.MouseEventHandler<HTMLElement> | undefined)?.(event);

      if (event.defaultPrevented || blocked) return;

      ctx.toggle();
    },
    [blocked, ctx, onClick],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLElement>) => {
      (onKeyDown as React.KeyboardEventHandler<HTMLElement> | undefined)?.(
        event,
      );

      if (event.defaultPrevented || blocked) return;

      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "Enter" ||
        event.key === " "
      ) {
        event.preventDefault();
        ctx.setOpen(true);

        requestAnimationFrame(() => {
          ctx.contentRef.current?.focus();
        });
      }
    },
    [blocked, ctx, onKeyDown],
  );

  const triggerProps = {
    id: ctx.triggerId,
    "aria-haspopup": "menu" as const,
    "aria-expanded": ctx.isOpen,
    "aria-controls": ctx.isOpen ? ctx.contentId : undefined,
    "data-open": ctx.isOpen,
    "data-disabled": blocked || undefined,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
  };

  if (asChild) {
    const child = Children.only(children);

    if (!isValidElement(child)) {
      throw new Error(
        "<Dropdown.Trigger asChild> requires exactly one valid React element.",
      );
    }

    return cloneElement(child as ReactElement<Record<string, unknown>>, {
      ...rest,
      ...triggerProps,
      ref: mergeRefs(
        ctx.triggerRef,
        (child as ReactElement<{ ref?: Ref<HTMLElement> }>).props.ref,
      ),
    });
  }

  return (
    <button
      {...rest}
      {...triggerProps}
      ref={ctx.triggerRef as React.RefObject<HTMLButtonElement>}
      type="button"
      disabled={blocked}
    >
      {children}
    </button>
  );
}

export type DropdownContentProps = {
  children: ReactNode;
  className?: string;
  placement?: Placement | Placement[];
  align?: Align;
  strategy?: PositionStrategy;
  gap?: number;
  viewportPadding?: number;
  role?: "menu" | "listbox" | "dialog";
  matchContentWidth?: boolean;
  style?: React.CSSProperties;
};
function Content({
  children,
  className,
  placement = ["bottom", "top", "right", "left"],
  align = "start",
  strategy = "fixed",
  gap = 8,
  viewportPadding = 8,
  role = "menu",
  matchContentWidth = true,
  style,
}: DropdownContentProps) {
  const ctx = useDropdown();
  const search = useRef("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { updatePosition } = useAutoPosition(ctx.triggerRef, ctx.contentRef, {
    enabled: ctx.isOpen,
    placement,
    align,
    strategy,
    gap,
    viewportPadding,
    onClose: ctx.close,
  });

  useLayoutEffect(() => {
    if (!ctx.isOpen) return;

    let frameId: number | null = null;
    let cancelled = false;

    const initialize = () => {
      if (cancelled) return;

      const trigger = ctx.triggerRef.current;
      const content = ctx.contentRef.current;

      if (!trigger || !content) {
        frameId = requestAnimationFrame(initialize);
        return;
      }

      if (matchContentWidth) {
        content.style.width = `${Math.round(
          trigger.getBoundingClientRect().width,
        )}px`;
      } else {
        content.style.width = "";
      }

      updatePosition();
    };

    initialize();

    return () => {
      cancelled = true;

      if (frameId !== null) {
        cancelAnimationFrame(frameId);
      }

      const content = ctx.contentRef.current;

      if (content && matchContentWidth) {
        content.style.width = "";
      }
    };
  }, [
    ctx.isOpen,
    ctx.triggerRef,
    ctx.contentRef,
    matchContentWidth,
    updatePosition,
  ]);

  const move = (delta: number, edge?: "first" | "last") => {
    const all = ctx.items();
    if (!all.length) return;
    const current = all.findIndex((x) => x.id === ctx.highlightedId);
    const index =
      edge === "first"
        ? 0
        : edge === "last"
          ? all.length - 1
          : (current + delta + all.length) % all.length;
    const item = all[index];
    ctx.setHighlightedId(item.id);
    item.element.focus({ preventScroll: true });
    item.element.scrollIntoView({ block: "nearest" });
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const all = ctx.items();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      move(0, "first");
    } else if (e.key === "End") {
      e.preventDefault();
      move(0, "last");
    } else if (e.key === "Escape") {
      e.preventDefault();
      ctx.close();
      ctx.triggerRef.current?.focus();
    } else if (e.key === "Tab") {
      ctx.close();
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      search.current += e.key.toLocaleLowerCase();
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => (search.current = ""), 500);
      const found = all.find((x) => x.text().startsWith(search.current));
      if (found) {
        e.preventDefault();
        ctx.setHighlightedId(found.id);
        found.element.focus();
      }
    }
  };
  if (!ctx.isOpen) return null;
  const node = (
    <div
      ref={ctx.contentRef}
      id={ctx.contentId}
      role={role}
      aria-labelledby={ctx.triggerId}
      tabIndex={-1}
      onKeyDown={key}
      data-open="true"
      className={cn(
        "pointer-events-auto",
        "min-w-40",
        "max-h-[min(320px,var(--dropdown-available-height,calc(100dvh-16px)))]",
        "overflow-y-auto overflow-x-hidden",
        "rounded-lg border border-zinc-200",
        "bg-white p-1 text-sm text-zinc-800 shadow-md outline-none",
        className,
      )}
      style={{ ...style, position: strategy }}
    >
      {children}
    </div>
  );
  return ctx.usePortal ? (
    <Portal layer={ctx.portalLayerName} zIndex={ctx.portalZIndex}>
      {node}
    </Portal>
  ) : (
    node
  );
}

export type DropdownItemProps = {
  children: ReactNode;
  disabled?: boolean;
  itemId?: string;
  onSelect?(e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>): void;
  asChild?: boolean;
} & Omit<HTMLAttributes<HTMLElement>, "onSelect">;
function Item({
  children,
  disabled = false,
  itemId,
  onSelect,
  asChild = false,
  className,
  onClick,
  onMouseEnter,
  onMouseLeave,
  role = "menuitem",
  ...rest
}: DropdownItemProps) {
  const ctx = useDropdown(),
    auto = useId(),
    id = itemId ?? auto,
    ref = useRef<HTMLElement | null>(null),
    active = ctx.highlightedId === id;
  const register = ctx.register;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    return register({
      id,
      element: el,
      disabled,
      text: () => el.textContent?.trim().toLocaleLowerCase() ?? "",
    });
  }, [register, id, disabled]);
  const select = (e: any) => {
    onClick?.(e);
    if (e.defaultPrevented || disabled) return;
    onSelect?.(e);
    if (!e.defaultPrevented) ctx.close();
  };
  const props = {
    ...rest,
    "data-item-id": id,
    "data-highlighted": active || undefined,
    "data-disabled": disabled || undefined,
    "aria-disabled": disabled || undefined,
    tabIndex: -1,
    onClick: select,
    onMouseEnter: (e: any) => {
      if (!disabled) ctx.setHighlightedId(id);
      onMouseEnter?.(e);
    },
    onMouseLeave: (e: any) => {
      onMouseLeave?.(e);
    },
    onFocus: () => {
      if (!disabled) ctx.setHighlightedId(id);
    },
    className: cn(
      "flex w-full cursor-default select-none items-center gap-2 rounded-md px-2.5 py-1.5 outline-none data-[highlighted]:bg-zinc-100 data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
      className,
    ),
  };
  if (asChild) {
    const child = Children.only(children);
    if (!isValidElement(child))
      throw new Error("Item asChild requires one element");
    return cloneElement(child as ReactElement<any>, {
      ...props,
      ref: mergeRefs(ref, (child as any).ref),
    });
  }
  return (
    <div {...props} ref={ref as React.RefObject<HTMLDivElement>} role={role}>
      {children}
    </div>
  );
}

const RadioContext = createContext<{
  value: string | null;
  change(v: string): void;
} | null>(null);

function CheckboxItem({
  checked: controlled,
  defaultChecked = false,
  onCheckedChange,
  ...props
}: DropdownItemProps & {
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?(v: boolean): void;
}) {
  const [internal, setInternal] = useState(defaultChecked),
    checked = controlled ?? internal;
  return (
    <Item
      {...props}
      role="menuitemcheckbox"
      aria-checked={checked}
      onSelect={(e) => {
        e.preventDefault();
        const next = !checked;
        if (controlled === undefined) setInternal(next);
        onCheckedChange?.(next);
      }}
    />
  );
}

export type DropdownRadioGroupProps = Omit<
  React.HTMLAttributes<HTMLDivElement>,
  "defaultValue" | "onChange"
> & {
  children: ReactNode;
  value?: string | null;
  defaultValue?: string | null;
  onValueChange?: (value: string) => void;
};

function RadioGroup({
  value: controlledValue,
  defaultValue = null,
  onValueChange,
  children,
  ...rest
}: DropdownRadioGroupProps) {
  const isControlled = controlledValue !== undefined;

  const [uncontrolledValue, setUncontrolledValue] = useState<string | null>(
    defaultValue,
  );

  const value = isControlled ? controlledValue : uncontrolledValue;

  const handleValueChange = useCallback(
    (nextValue: string) => {
      if (!isControlled) {
        setUncontrolledValue(nextValue);
      }

      onValueChange?.(nextValue);
    },
    [isControlled, onValueChange],
  );

  const contextValue = useMemo(
    () => ({
      value,
      change: handleValueChange,
    }),
    [value, handleValueChange],
  );

  return (
    <RadioContext.Provider value={contextValue}>
      <div {...rest} role="group">
        {children}
      </div>
    </RadioContext.Provider>
  );
}

function RadioItem({ value, ...props }: DropdownItemProps & { value: string }) {
  const radio = useContext(RadioContext);
  if (!radio) throw new Error("RadioItem requires RadioGroup");
  return (
    <Item
      {...props}
      role="menuitemradio"
      aria-checked={radio.value === value}
      onSelect={() => radio.change(value)}
    />
  );
}

export type DropdownGroupProps = HTMLAttributes<HTMLDivElement> & {
  label?: ReactNode;
  labelClassName?: string;
};

function Group({
  label,
  children,
  className,
  labelClassName,
  ...rest
}: DropdownGroupProps) {
  const id = useId();
  return (
    <div
      {...rest}
      role="group"
      aria-labelledby={label ? id : undefined}
      className={className}
    >
      {label && (
        <div
          id={id}
          className={cn(
            "px-2.5 pb-1 pt-2 text-xs font-medium text-zinc-500",
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
function Close({
  children,
  asChild = false,
  onClick,
  ...rest
}: DropdownTriggerProps) {
  const ctx = useDropdown();
  const click = (e: any) => {
    onClick?.(e);
    if (!e.defaultPrevented) ctx.close();
  };
  if (asChild) {
    const child = Children.only(children);
    return cloneElement(child as ReactElement<any>, { onClick: click });
  }
  return (
    <button {...rest} type="button" onClick={click}>
      {children}
    </button>
  );
}

export type DropdownSeparatorProps = HTMLAttributes<HTMLDivElement>;
function Separator(props: DropdownSeparatorProps) {
  return (
    <div
      {...props}
      role="separator"
      className={cn("my-1 h-px bg-zinc-200", props.className)}
    />
  );
}

export type DropdownLabelProps = HTMLAttributes<HTMLDivElement>;
function Label(props: DropdownLabelProps) {
  return (
    <div
      {...props}
      className={cn(
        "px-2.5 pb-1 pt-2 text-xs font-medium text-zinc-500",
        props.className,
      )}
    />
  );
}
Dropdown.Trigger = Trigger;
Dropdown.Content = Content;
Dropdown.Item = Item;
Dropdown.CheckboxItem = CheckboxItem;
Dropdown.RadioGroup = RadioGroup;
Dropdown.RadioItem = RadioItem;
Dropdown.Group = Group;
Dropdown.Close = Close;
Dropdown.Separator = Separator;
Dropdown.Label = Label;
export { Dropdown };
