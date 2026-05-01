"use client";

import { cn } from "@/lib/tools/cn.tools";
import { useNavBar } from "@/components/ui/navigationBar/navigationBar.contexts";
import React, {
    ButtonHTMLAttributes,
    HTMLAttributes,
    useCallback,
    forwardRef,
    useEffect,
    useRef,
} from "react";
import {
    Drawer,
    DrawerOptions,
} from "@/components/ui/drawer/drawer.components";

interface Path {
    pathname: string;
    search: string;
    hash: string;
}

export type To = string | Partial<Path>;

/**
 * Wraps the page content AND the NavBar component side-by-side.
 *
 * @example
 * ```tsx
 * <PageContainer>
 *   <NavBar>…</NavBar>
 *   <PageContent>…</PageContent>
 * </PageContainer>
 * ```
 */
function PageContainer({
    className,
    children,
    ...props
}: HTMLAttributes<HTMLDivElement>) {
    return (
        <div {...props} className={cn("w-full flex flex-row", className)}>
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
    /** Accessible label for the drawer in mobile mode. Defaults to "Navigation". */
    drawerLabel?: string;
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
 * Renders a collapsible sidebar nav bar. On mobile it renders inside a Drawer.
 * On desktop it renders as a sticky/fixed sidebar whose width animates between
 * the open (lg) and closed (sm) sizes defined in `navBarWidths`.
 */
function NavBar({
    children,
    drawerOptions,
    drawerClassName,
    drawerStyle,
    drawerLabel = "Navigation",
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
            <Drawer
                isOpen={isOpen}
                toggleOpen={toggleOpen}
                label={drawerLabel}
                options={drawerOptions}
                drawerProps={{ className: drawerClassName, style: drawerStyle }}
            >
                {children}
            </Drawer>
        );
    }

    return (
        <div
            className={cn(
                floating ? "fixed" : "sticky",
                "flex-none",
                "bg-gray-100",
                "overflow-y-auto overflow-x-hidden",
                "transition-[width] duration-300 ease-in-out",
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
            <div className={cn("flex flex-col gap-2 p-3", innerClassName)}>
                {children}
            </div>
        </div>
    );
}
NavBar.displayName = "NavBar";

/**
 * Full-width content area that sits beside the NavBar inside a PageContainer.
 */
function PageContent({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div {...props} className={cn("w-full min-w-0", className)}>
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
 * Renders children only when the current NavBar mode matches `modeRendered`.
 * Defaults to "both" (always rendered).
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
 * A button wired up to open/close/toggle the NavBar.
 */
function NavButton({
    trigger = "toggle",
    className,
    onClick,
    children,
    ...props
}: NavButtonProps) {
    const { toggleOpen, setIsOpen, mode, isOpen } = useNavBar();
    const ref = useRef<HTMLButtonElement>(null);

    const handleClick = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            onClick?.(e);
            switch (trigger) {
                case "toggle":
                    ref.current?.blur();
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
        [trigger, onClick, toggleOpen, setIsOpen],
    );

    return (
        <button
            {...props}
            ref={ref}
            onClick={handleClick}
            className={cn("cursor-pointer select-none", className)}
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
    /** Must be unique across the nav tree. Used for active-item tracking. */
    navId: string;
    to: To;
}

/**
 * A nav item that registers itself with the NavBar context for active-item
 * detection and closes the mobile drawer when clicked.
 */
const NavItem = forwardRef<HTMLDivElement, NavItemProps>(
    ({ children, onClick, to, navId, ...props }, ref) => {
        const { setIsOpen, isOpen, mode, activeNavItemId, registerNavItem } =
            useNavBar();

        const handleClick = useCallback(
            (e: React.MouseEvent<HTMLDivElement>) => {
                onClick?.(e);
                if (mode === "mobile") setIsOpen(false);
            },
            [mode, onClick, setIsOpen],
        );

        useEffect(() => {
            const href =
                typeof to === "string"
                    ? to
                    : `${to.pathname ?? ""}${to.search ?? ""}${to.hash ?? ""}`;

            const unregister = registerNavItem({ id: navId, href });
            return () => unregister();
        }, [navId, to, registerNavItem]);

        return (
            <div
                {...props}
                onClick={handleClick}
                ref={ref}
                data-active={activeNavItemId === navId}
                data-open={isOpen}
                data-view-mode={mode}
            >
                {children}
            </div>
        );
    },
);
NavItem.displayName = "NavItem";

export { PageContainer, NavBar, PageContent, NavBarHeader, NavButton, NavItem };
