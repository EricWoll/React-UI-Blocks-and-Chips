import { useMemo, HTMLAttributes, ReactNode, useEffect } from 'react';
import { itemsToRender } from '@/lib/tools/react/itemsToRender.tools.react';

interface TabItemProps extends HTMLAttributes<HTMLDivElement> {
    isActive?: boolean;
    tabId: string;
    children?: ReactNode;
    unmountOnHide?: boolean;
}

/**
 * Individual tab content component that renders conditionally based on active state.
 * NOTE: Must be used as a child of the Tabs component.
 *
 * @param {ReactNode} [children] - Content to display when the tab is active
 * @param {boolean} [isActive] - Whether this tab is currently active (managed by parent Tabs component)
 * @param {string} tabId - Unique identifier for this tab
 * @param {boolean} [unmountOnHide=false] - If true, unmounts content when inactive. If false, hides with CSS (preserves state)
 * @param {HTMLAttributes<HTMLDivElement>} props - Additional HTML div attributes
 *
 * @example
 * ```tsx
 * <TabItem tabId="home">
 *   <h2>Home</h2>
 *   <p>Welcome to the home tab</p>
 * </TabItem>
 * ```
 */
function TabItem({
    children,
    isActive,
    tabId,
    unmountOnHide = true,
    style,
    ...props
}: TabItemProps) {
    if (!isActive && unmountOnHide) return null;

    return (
        <div
            role="tabpanel"
            id={`tabpanel-${tabId}`}
            aria-labelledby={`tab-${tabId}`}
            data-tab-id={tabId}
            hidden={!isActive}
            tabIndex={isActive ? 0 : -1}
            style={{
                display: isActive ? undefined : 'none',
                ...style,
            }}
            {...props}
        >
            {children}
        </div>
    );
}
TabItem.displayName = 'TabItem';

interface TabsProps extends HTMLAttributes<HTMLDivElement> {
    currentTab: string;
    children?: ReactNode;
    onTabChange?: (tabId: string) => void;
}

/**
 * Tabs container that manages TabItem children and controls which tab is visible.
 *
 * @param {ReactNode} [children] - TabItem components to manage
 * @param {string} currentTab - The tabId of the currently active tab
 * @param {(tabId: string) => void} [onTabChange] - Callback when the active tab changes
 * @param {HTMLAttributes<HTMLDivElement>} props - Additional HTML div attributes
 *
 * @example
 * ```tsx
 * const [activeTab, setActiveTab] = useState('home');
 *
 * <Tabs currentTab={activeTab} onTabChange={setActiveTab}>
 *   <TabItem tabId="home">
 *     <h2>Home</h2>
 *   </TabItem>
 *   <TabItem tabId="about">
 *     <h2>About</h2>
 *   </TabItem>
 *   <TabItem tabId="contact">
 *     <h2>Contact</h2>
 *   </TabItem>
 * </Tabs>
 * ```
 */
function Tabs({ children, currentTab, onTabChange, ...props }: TabsProps) {
    const tabItems = useMemo(
        () =>
            itemsToRender<TabItemProps>({
                children,
                matchComponent: TabItem,
                displayName: 'TabItem',
                getInjectedProps: (child) => ({
                    isActive: child.props.tabId === currentTab,
                }),
            }),
        [children, currentTab],
    );

    useEffect(() => {
        onTabChange?.(currentTab);
    }, [currentTab, onTabChange]);

    return (
        <div data-active-tab={currentTab} {...props}>
            {tabItems}
        </div>
    );
}
Tabs.displayName = 'Tabs';

export { TabItem, Tabs };
