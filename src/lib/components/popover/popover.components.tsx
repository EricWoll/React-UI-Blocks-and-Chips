import { useRef, useEffect, HTMLAttributes } from "react";
import {
  Align,
  Placement,
  useAutoPosition,
} from "@/lib/hooks/useAutoPosition.hooks";
import { Portal } from "@/lib/components/portal/portal.components";
import clsx from "clsx";
import { useKeyboardScoped } from "@/lib/hooks/useKeyboardScoped.hooks";

interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  placement?: Placement;
  align?: Align;
  layer?: string;
  zIndex?: number;
}

export function Popover({
  anchorRef,
  open,
  setOpen,
  placement = "bottom",
  align = "center",
  className,
  children,
  layer = "popovers",
  zIndex = 300,
  style,
  ...rest
}: PopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);

  const { updatePosition } = useAutoPosition(
    anchorRef,
    popoverRef,
    placement,
    align,
    () => setOpen?.(false),
  );

  useKeyboardScoped(
    [
      {
        keys: ["Escape"],
        handler: () => {
          setOpen?.(false);
        },
      },
    ],
    { target: document.body, when: open },
  );

  useEffect(() => {
    if (open) updatePosition();
  }, [open, updatePosition]);

  const handleClickOutside = (e: MouseEvent) => {
    if (!popoverRef.current?.contains(e.target as Node)) {
      if (anchorRef.current?.contains(e.target as Node)) return;
      setOpen?.(false);
    }
  };

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [popoverRef]);

  if (!open) return null;

  return (
    <Portal layer={layer} zIndex={zIndex}>
      <div
        className="w-screen h-screen fixed inset-0"
        style={{ pointerEvents: "none" }}
      >
        <div
          ref={popoverRef}
          className={clsx("bg-white border rounded-lg shadow-lg", className)}
          style={{
            ...style,
            position: "fixed",
            pointerEvents: "auto",
          }}
          onClick={(e) => {}}
          data-align={align}
          {...rest}
        >
          {children}
        </div>
      </div>
    </Portal>
  );
}
Popover.displayName = "Popover";
