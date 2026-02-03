import { Children, cloneElement, ReactElement, ReactNode } from 'react';
import isElement from '@/lib/tools/uiTools/isElement.uiTools';

/**
 * Maps over React children, identifies specific component types, and injects
 * additional props into matching components while leaving other children unchanged.
 *
 * @template T - The props type of the target component
 *
 * @param children - React children to process
 * @param matchComponent - The component type to match and modify (e.g., TabItem)
 * @param displayName - The display name to match as a fallback (e.g., 'TabItem')
 * @param getInjectedProps - Function that receives a matched child and returns props to inject
 * @param onMatch - Optional callback when a child matches the component type
 * @param onFail - Optional callback when a child doesn't match the component type
 * @param onBefore - Optional callback before processing begins
 * @param onAfter - Optional callback after processing completes, but before results return
 * @param filter - Optional filter to exclude certain matched elements (return false to exclude)
 * @param transform - Optional function to transform injected props before cloning
 *
 * @example
 * itemsToRender({
 *  children,
 *  matchComponent: TabItem,
 *  displayName: 'TabItem', 
 *  getInjectedProps: (child) => ({ isActive: child.props.tabId === currentTab }),
 *  onBefore: () => console.log('Processing tabs...'),
 *  onMatch: (child) => console.log('Found tab:', child.props.tabId),
 *  onFail: (child) => console.warn('Non-tab child detected'),
 *  filter: (child) => !child.props.disabled,
 *  transform: (child, props) => ({
 *     ...props,
 *     className: props.isActive ? 'active' : '',
 *  }),
 *  onAfter: (results) => console.log('Done! Rendered', Children.count(results), 'tabs'),
});
 */
export function itemsToRender<T>({
    children,
    matchComponent,
    displayName,
    getInjectedProps,
    onMatch,
    onFail,
    onBefore,
    onAfter,
    filter,
    shouldRender,
    transform,
}: {
    children: ReactNode;
    matchComponent: React.ComponentType<T>;
    displayName: string;
    getInjectedProps: (child: ReactElement<T>) => Partial<T>;
    onMatch?: (child: ReactElement<T>) => void;
    onFail?: (child: ReactNode) => void;
    onBefore?: (children: ReactNode) => void;
    onAfter?: (results: ReactNode) => void;
    filter?: (child: ReactElement<T>) => boolean;
    transform?: (child: ReactElement<T>, props: Partial<T>) => Partial<T>;
}) {
    onBefore?.(children);

    const results = Children.map(children, (child) => {
        if (!isElement<T>(child, matchComponent, displayName)) {
            onFail?.(child);
            return child;
        }
        if (filter && !filter(child)) return null;

        onMatch?.(child);

        let injectedProps = getInjectedProps(child);
        if (transform) {
            injectedProps = transform(child, injectedProps);
        }

        return cloneElement(child, injectedProps);
    });

    onAfter?.(results);
    return results;
}
