import clsx from "clsx";
import { useNavBar } from "@/lib/components/navigationBar/navigationBar.contexts";
import {
  ButtonHTMLAttributes,
  HTMLAttributes,
  useCallback,
  forwardRef,
  useId,
  useEffect,
} from "react";
import {
  Drawer,
  DrawerOptions,
} from "@/lib/components/drawer/drawer.components";

interface Path {
  pathname: string;
  search: string;
  hash: string;
}

export type To = string | Partial<Path>;

/**
 * Page Container component is used to wrap the page content AND NavBar component.
 * @param {React.ReactNode} children - Content to render inside the page container
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Additional HTML div attributes
 *
 * @example
 * ```tsx
 * <PageContainer>
 *   <NavBar>
 *     <h1>Something</h1>
 *   </NavBar>
 *   <PageContent>
 *     <p>Content</p>
 *   </PageContent>
 * </PageContainer>
 * ```
 */
function PageContainer({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={clsx("w-full flex flex-row", className)}>
      {children}
    </div>
  );
}
PageContainer.displayName = "PageContainer";

interface NavBarProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "className"> {
  children: React.ReactNode;
  navBarWidths?: NavBarWidth;
  drawerClassName?: string;
  barClassName?: string;
  drawerOptions?: DrawerOptions;
  drawerStyle?: React.CSSProperties;
  innerClassName?: string;
  floating?: boolean;
}

type NavBarWidth = {
  lg: string;
  sm: string;
};

const defaultNavBarWidths: NavBarWidth = {
  lg: "12em",
  sm: "3.75em",
};

/**
 * Navigation Bar component is used to render the navigation bar.
 * @param {React.ReactNode} children - Content to render inside the navigation bar
 * @param {string} [navBarWidthLg] - Width of the navigation bar when open
 * @param {string} [navBarWidthSm] - Width of the navigation bar when closed
 * @param {string} [drawerClassName] - Classname for the drawer
 * @param {string} [barClassName] - Classname for the navigation bar
 * @param {DrawerOptions} [drawerOptions] - Options for the drawer
 * @param {React.CSSProperties} [drawerStyle] - Style for the drawer
 * @param {string} [innerClassName] - Classname for the inner div
 * @param {boolean} [floating] - Whether the navigation bar is floating
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Additional HTML div attributes
 */
function NavBar({
  children,
  drawerOptions,
  drawerClassName,
  drawerStyle,
  navBarWidths = defaultNavBarWidths,
  style,
  barClassName,
  innerClassName,
  floating = false,
  ...props
}: NavBarProps) {
  const { mode, isOpen, toggleOpen, headerHeightPx } = useNavBar();

  const topOffset = floating ? 0 : headerHeightPx;

  if (mode === "mobile") {
    return (
      <>
        <Drawer
          isOpen={isOpen}
          toggleOpen={toggleOpen}
          options={drawerOptions}
          drawerProps={{ className: drawerClassName, style: drawerStyle }}
        >
          {children}
        </Drawer>
      </>
    );
  }

  return (
    <div
      className={clsx(
        floating ? "fixed" : `sticky`,
        "flex-none",
        "bg-gray-100",
        "overflow-y-auto overflow-x-hidden",
        barClassName,
      )}
      style={{
        top: `${topOffset}px`,
        height: floating ? "auto" : `calc(100vh - ${headerHeightPx}px)`,
        width: isOpen ? navBarWidths.lg : navBarWidths.sm,
        ...style,
      }}
      {...props}
    >
      <div className={clsx("flex flex-col gap-2 p-3", innerClassName)}>
        {children}
      </div>
    </div>
  );
}
NavBar.displayName = "NavBar";

/**
 * Page Content component is used to render the page content.
 * @param {React.ReactNode} children - Content to render inside the page content
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Additional HTML div attributes
 */
function PageContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div {...props} className={clsx("w-full", className)}>
      {children}
    </div>
  );
}
PageContent.displayName = "PageContent";

interface NavBarHeaderProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  modeRendered?: "mobile" | "desktop" | "both";
}

/**
 * Nav Header component is used to render the header of the navigation bar.
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Additional HTML div attributes
 */
function NavBarHeader({
  modeRendered = "both",
  children,
  ...props
}: NavBarHeaderProps) {
  const { mode, isOpen } = useNavBar();
  if (modeRendered !== "both" && mode !== modeRendered) return null;

  return (
    <div {...props} data-view-mode={mode} data-open={isOpen}>
      {children}
    </div>
  );
}
NavBarHeader.displayName = "NavBarHeader";

interface NavButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  trigger?: "open" | "close" | "toggle";
}

/**
 * Nav Button component is used to render the button for the navigation bar.
 * @param {string} variant - Variant of the button (open, close, toggle)
 * @param {React.ButtonHTMLAttributes<HTMLButtonElement>} props - Additional HTML button attributes
 */
function NavButton({
  trigger = "toggle",
  className,
  onClick,
  children,
  ...props
}: NavButtonProps) {
  const { toggleOpen, setIsOpen, mode, isOpen } = useNavBar();

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      onClick?.(e);
      switch (trigger) {
        case "toggle":
          toggleOpen();
          break;
        case "close":
          setIsOpen(false);
          break;
        case "open":
          setIsOpen(true);
          break;
      }
    },
    [trigger, isOpen, onClick],
  );

  return (
    <button
      {...props}
      onClick={handleClick}
      className={clsx("cursor-pointer select-none", className)}
      data-variant={trigger}
      data-view-mode={mode}
      data-open={isOpen}
    >
      {children}
    </button>
  );
}
NavButton.displayName = "NavButton";

interface NavItemProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  navId: string;
  to: To;
}

const NavItem = forwardRef<HTMLDivElement, NavItemProps>(
  ({ children, onClick, to, navId, ...props }, ref) => {
    const { setIsOpen, isOpen, mode, activeNavItemId, registerNavItem } =
      useNavBar();
    const id = useId();

    const handleClick = useCallback(
      (e: React.MouseEvent<HTMLDivElement>) => {
        onClick?.(e);
        if (mode === "mobile") setIsOpen(false);
      },
      [mode, onClick],
    );

    useEffect(() => {
      const href =
        typeof to === "string"
          ? to
          : `${to.pathname ?? ""}${to.search ?? ""}${to.hash ?? ""}`;

      const unregister = registerNavItem({
        id: navId,
        href: href,
      });
      return () => unregister();
    }, [navId, to, registerNavItem]);

    return (
      <div
        {...props}
        onClick={handleClick}
        ref={ref}
        data-active={activeNavItemId === id}
        data-open={isOpen}
        data-view-mode={mode}
      >
        {children}
      </div>
    );
  },
);

export { PageContainer, NavBar, PageContent, NavBarHeader, NavButton, NavItem };
