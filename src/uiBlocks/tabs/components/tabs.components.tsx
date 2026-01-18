import React, {
    Children,
    useMemo,
    isValidElement,
    cloneElement,
    HTMLAttributes,
    ReactNode,
} from 'react';

interface TabItemProps extends HTMLAttributes<HTMLDivElement> {
    isActive?: boolean;
    id: string;
}

function TabItem({ children, isActive, id, ...props }: TabItemProps) {
    if (!isActive) return null;
    return (
        <div id={id} {...props}>
            {children}
        </div>
    );
}
TabItem.displayName = 'TabItem';

interface TabsProps extends HTMLAttributes<HTMLDivElement> {
    currentTab: string;
}

function isTabElement(
    node: ReactNode,
): node is React.ReactElement<TabItemProps> {
    if (!isValidElement(node)) return false;
    const t: any = node.type;
    return (
        t === TabItem ||
        (typeof t === 'function' &&
            (t.displayName === 'TabItem' || t.name === 'TabItem'))
    );
}

function Tabs({ children, currentTab, className, ...props }: TabsProps) {
    const items = useMemo(() => {
        return Children.toArray(children).map((child) => {
            if (!isTabElement(child)) {
                return child;
            }

            const id = child.props.id;

            return cloneElement(child, {
                isActive: id === currentTab,
                id,
                className: child.props.className,
            } as Partial<React.ComponentProps<typeof TabItem>>);
        });
    }, [children, currentTab]);

    return (
        <div className={className} {...props} data-active-tab={currentTab}>
            {items}
        </div>
    );
}
Tabs.displayName = 'Tabs';

export { TabItem, Tabs };
