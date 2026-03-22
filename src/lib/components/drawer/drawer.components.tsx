import clsx from "clsx";
import { useEffect } from "react";

type DrawerDirection = "left" | "right" | "top" | "bottom";

interface DrawerProps {
  children: React.ReactNode;
  isOpen: boolean;
  toggleOpen: () => void;
  zIndexBase?: number;
  durationMs?: number;
  backgroundProps?: React.HTMLAttributes<HTMLDivElement>;
  drawerProps?: React.HTMLAttributes<HTMLDivElement>;
  hasBackground?: boolean;
  direction?: DrawerDirection;
  sizePx?: number;
}

/**
 * Drawer component is used to render a drawer that slides in from the left, right, top, or bottom.
 * @param {React.ReactNode} children - Content to render inside the drawer
 * @param {boolean} isOpen - Whether the drawer is open or not
 * @param {() => void} toggleOpen - Function to toggle the drawer open or closed
 * @param {number} [zIndexBase] - Base z-index for the drawer
 * @param {number} [durationMs] - Duration of the animation in milliseconds
 * @param {boolean} [hasBackground] - Whether the drawer has a background or not
 * @param {DrawerDirection} [direction] - Direction the drawer opens from
 * @param {number} [sizePx] - Size of the drawer in pixels
 * @param {React.HTMLAttributes<HTMLDivElement>} [backgroundProps] - Additional HTML div attributes for the background
 * @param {React.HTMLAttributes<HTMLDivElement>} [drawerProps] - Additional HTML div attributes for the drawer
 */
function Drawer({
  children,
  isOpen,
  toggleOpen,
  zIndexBase = 50,
  durationMs = 300,
  hasBackground = true,
  direction = "left",
  sizePx = 288,
  backgroundProps,
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

  // --- Layout per direction --------------------------------------
  const isHorizontal = direction === "left" || direction === "right";

  const defaultSizePx = isHorizontal
    ? 288 /* w-72 */
    : Math.round(window.innerHeight * 0.8); // ~80vh
  const resolvedSize = sizePx ?? defaultSizePx;

  const positionClasses = clsx("fixed overflow-y-auto overflow-x-hidden", {
    // Horizontal
    "top-0 bottom-0": isHorizontal,
    "left-0": direction === "left",
    "right-0": direction === "right",
    // Vertical
    "left-0 right-0": !isHorizontal,
    "top-0": direction === "top",
    "bottom-0": direction === "bottom",
  });

  const sizeStyle: React.CSSProperties = isHorizontal
    ? { width: resolvedSize, maxWidth: "85vw", height: "100vh" }
    : { height: resolvedSize, maxHeight: "85vh" };

  const closedTransformByDirection: Record<DrawerDirection, string> = {
    left: "translateX(-100%)",
    right: "translateX(100%)",
    top: "translateY(-100%)",
    bottom: "translateY(100%)",
  };

  const transformPosition = isOpen
    ? "translate(0, 0)"
    : closedTransformByDirection[direction];

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
          positionClasses,
          isHorizontal && "w-72 max-w-[85vw]",
          !isHorizontal && "w-full",
          "shadow-lg bg-white",
          "overflow-y-auto overflow-x-hidden",
          drawerProps?.className,
        )}
        style={{
          ...sizeStyle,
          transform: transformPosition,
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
        <div
          className={clsx("h-full overflow-y-auto", !isHorizontal && "w-full")}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
Drawer.displayName = "Drawer";

export { type DrawerDirection, Drawer };
