import clsx from 'clsx';
import { useNavBar } from './navigationBar.contexts';
import { useEffect, ButtonHTMLAttributes } from 'react';
import {
    Drawer,
    DrawerDirection,
} from '@/lib/components/drawer/drawer.components';

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    headerHeightPx?: number;
}

/**
 * Page Container component is used to wrap the page content AND NavBar component.
 * @param {React.ReactNode} children - Content to render inside the page container
 * @param {number} [headerHeightPx] - Height of the header in pixels
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
    headerHeightPx = 0,
    className,
    children,
    ...props
}: PageContainerProps) {
    const { updateHeaderHeightPx } = useNavBar();

    useEffect(() => {
        updateHeaderHeightPx(headerHeightPx);
    }, [headerHeightPx]);

    return (
        <div
            className={clsx(
                `w-full min-h-[calc(100vh - ${headerHeightPx})]`,
                'flex flex-row flex-nowrap',
                className,
            )}
            {...props}
        >
            {children}
        </div>
    );
}
PageContainer.displayName = 'PageContainer';

interface NavBarProps extends Omit<
    React.HTMLAttributes<HTMLDivElement>,
    'className'
> {
    children: React.ReactNode;
    durationMs?: number;
    zIndexBase?: number;
    navBarWidthLg?: string;
    navBarWidthSm?: string;
    openDirection?: DrawerDirection;
    drawerClassName?: string;
    barClassName?: string;
}

/**
 * Navigation Bar component is used to render the navigation bar.
 * @param {React.ReactNode} children - Content to render inside the navigation bar
 * @param {number} [durationMs] - Duration of the animation in milliseconds
 * @param {number} [zIndexBase] - Base z-index for the navigation bar
 * @param {string} [navBarWidthLg] - Width of the navigation bar when open
 * @param {string} [navBarWidthSm] - Width of the navigation bar when closed
 * @param {DrawerDirection} [openDirection] - Direction the drawer opens from
 * @param {string} [drawerClassName] - Classname for the drawer
 * @param {string} [barClassName] - Classname for the navigation bar
 */
function NavBar({
    children,
    durationMs = 300,
    zIndexBase = 50,
    navBarWidthLg = 'w-72',
    navBarWidthSm = 'w-14',
    openDirection,
    barClassName,
    drawerClassName,
    style,
    ...props
}: NavBarProps) {
    const { mode, isOpen, toggleOpen, headerHeightPx } = useNavBar();

    if (mode === 'mobile') {
        return (
            <>
                <Drawer
                    isOpen={isOpen}
                    toggleOpen={toggleOpen}
                    zIndexBase={zIndexBase}
                    durationMs={durationMs}
                    direction={openDirection}
                    drawerProps={{ className: drawerClassName }}
                >
                    {children}
                </Drawer>
            </>
        );
    }

    return (
        <div
            className={clsx(
                `sticky`,
                'bg-gray-100',
                'overflow-y-auto overflow-x-hidden',
                isOpen ? navBarWidthLg : navBarWidthSm,
                barClassName,
            )}
            style={{
                top: `${headerHeightPx}px`,
                height: `calc(100vh - ${headerHeightPx}px)`,
                ...style,
            }}
            {...props}
        >
            {children}
        </div>
    );
}
NavBar.displayName = 'NavBar';

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
        <div className={clsx('w-full', className)} {...props}>
            {children}
        </div>
    );
}
PageContent.displayName = 'PageContent';

interface NavToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}

/**
 * Nav Toggle component is used to toggle the navigation bar.
 * @param {React.ReactNode} children - Content to render inside the button
 * @param {React.ButtonHTMLAttributes<HTMLButtonElement>} props - Additional HTML button attributes
 */
function NavToggle({ onClick, children, ...props }: NavToggleProps) {
    const { toggleOpen } = useNavBar();

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        toggleOpen();
    };

    return (
        <button {...props} onClick={handleClick}>
            {children}
        </button>
    );
}
NavToggle.displayName = 'NavToggle';

export { PageContainer, NavBar, PageContent, NavToggle };
