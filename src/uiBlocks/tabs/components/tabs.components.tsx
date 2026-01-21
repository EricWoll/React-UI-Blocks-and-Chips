import isElement from '@/uiTools/isElement.uiTools';
import React, {
    Children,
    useMemo,
    isValidElement,
    cloneElement,
    HTMLAttributes,
    ReactNode,
} from 'react';
import { itemsToRender } from '@/uiTools/itemsToRender.uiTools';

/* Requires Function "itemsToRender" from Tools folder */

interface TabItemProps extends HTMLAttributes<HTMLDivElement> {
    isActive?: boolean;
    tabId: string;
}

function TabItem({ children, isActive, tabId, ...props }: TabItemProps) {
    if (!isActive) return null;
    return (
        <div data-tab-id={tabId} key={tabId} {...props}>
            {children}
        </div>
    );
}
TabItem.displayName = 'TabItem';

interface TabsProps extends HTMLAttributes<HTMLDivElement> {
    currentTab: string;
}

function Tabs({ children, currentTab, className, ...props }: TabsProps) {
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
        <div className={className} {...props} data-active-tab={currentTab}>
            {tabItems}
        </div>
    );
}
Tabs.displayName = 'Tabs';

export { TabItem, Tabs };
