import { Children, cloneElement, ReactElement, ReactNode } from 'react';
import isElement from '@/uiTools/isElement.uiTools';

export function itemsToRender<T extends object>({
    children,
    matchComponent,
    displayName,
    getInjectedProps,
}: {
    children: ReactNode;
    matchComponent: React.ComponentType<any>;
    displayName: string;
    getInjectedProps: (child: ReactElement & { props: T }) => Partial<T>;
}) {
    return Children.map(children, (child) => {
        if (!isElement(child, matchComponent, displayName)) return child;

        const element = child as ReactElement & { props: T };

        const injected = getInjectedProps(element);
        return cloneElement(element, injected);
    });
}
