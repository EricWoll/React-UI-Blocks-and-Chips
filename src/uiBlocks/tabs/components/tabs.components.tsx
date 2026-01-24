import { useMemo, HTMLAttributes, ReactNode } from 'react';
import { itemsToRender } from '@/uiTools/itemsToRender.uiTools';

interface TabItemProps extends HTMLAttributes<HTMLDivElement> {
    /** Whether this tab is currently active */
    isActive?: boolean;
    /** Unique identifier for this tab */
    tabId: string;
    children?: ReactNode;
}

/**
 * Individual tab content component.
 * Only renders when isActive is true.
 *
 * @example
 * <TabItem tabId="home" isActive={true}>
 *   Home content
 * </TabItem>
 */
function TabItem({ children, isActive, tabId, ...props }: TabItemProps) {
    if (!isActive) return null;
    return (
        <div data-tab-id={tabId} {...props}>
            {children}
        </div>
    );
}
TabItem.displayName = 'TabItem';

interface TabsProps extends HTMLAttributes<HTMLDivElement> {
    /** The ID of the currently active tab */
    currentTab: string;
    children?: ReactNode;
}

/**
 * Tabs container that manages TabItem children.
 * Only the TabItem matching currentTab will be visible.
 *
 * @example
 * <Tabs currentTab="home">
 *   <TabItem tabId="home">Home content</TabItem>
 *   <TabItem tabId="about">About content</TabItem>
 * </Tabs>
 */
function Tabs({ children, currentTab, ...props }: TabsProps) {
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

    return (
        <div data-active-tab={currentTab} {...props}>
            {tabItems}
        </div>
    );
}
Tabs.displayName = 'Tabs';

export { TabItem, Tabs };
