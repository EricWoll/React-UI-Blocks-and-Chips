import clsx from "clsx";
import { useEffect } from "react";

interface DrawerProps {
  children: React.ReactNode;
  isOpen: boolean;
  toggleOpen: () => void;
  zIndexBase?: number;
  durationMs?: number;
  backgroundProps?: React.HTMLAttributes<HTMLDivElement>;
  drawerProps?: React.HTMLAttributes<HTMLDivElement>;
  hasBackground?: boolean;
  // direction?: "left" | "right" | "top" | "bottom"; TODO: Implement this
}

function Drawer({
  children,
  isOpen,
  toggleOpen,
  zIndexBase = 50,
  durationMs = 300,
  backgroundProps,
  hasBackground = true,
  drawerProps,
}: DrawerProps) {
  // Prevent background scroll when mobile drawer is open
  useEffect(() => {
    const original = document.body.style.overflow;
    if (isOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original || "";
    };
  }, [isOpen]);

  return (
    <div>
      {hasBackground && (
        <div
          role="presentation"
          aria-hidden={!isOpen}
          onClick={toggleOpen}
          className={clsx(
            "fixed inset-0 transition-opacity",
            isOpen ? "opacity-100" : "opacity-0 pointer-events-none",
          )}
          style={{ zIndex: zIndexBase }}
          {...backgroundProps}
        >
          <div className="absolute inset-0 bg-black/40" />
        </div>
      )}

      <div
        role="dialog"
        aria-modal="true"
        aria-hidden={!isOpen}
        aria-label="Navigation"
        {...drawerProps}
        className={clsx(
          "fixed right-auto w-72 max-w-[85vw]",
          "shadow-lg top-0 bg-white",
          "overflow-y-auto overflow-x-hidden",
          drawerProps?.className,
        )}
        style={{
          height: "100vh",
          transform: isOpen ? "translateX(0)" : "translateX(-100%)",
          transition: `transform ${durationMs}ms ease-in-out`,
          transitionProperty: "transform",
          willChange: "transform",
          zIndex: zIndexBase + 1,
          ...drawerProps?.style,
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape" && isOpen) toggleOpen();
          drawerProps?.onKeyDown?.(e);
        }}
      >
        <div className="h-full overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
Drawer.displayName = "Drawer";

export { Drawer };
