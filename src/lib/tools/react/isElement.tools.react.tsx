import { isValidElement } from 'react';

/**
 * Type guard that checks if a React node is a specific component type.
 *
 * This function safely narrows a `React.ReactNode` to a `React.ReactElement<T>`
 * by checking if the node matches the provided component. It performs two levels
 * of matching:
 * 1. Direct reference comparison (most reliable)
 * 2. Name-based comparison using `displayName` or function `name` (fallback)
 *
 * @template T - The props type of the component being checked
 *
 * @param node - The React node to check (can be element, string, number, null, etc.)
 * @param element - The component type to match against (e.g., TabItem, CollapseAble)
 * @param displayName - The display name to match as a fallback (e.g., 'TabItem')
 *
 * @returns `true` if the node is a React element of the specified component type,
 *          `false` otherwise. When `true`, TypeScript narrows the type to
 *          `React.ReactElement<T>`.
 *
 * @example
 * // Check if a child is a TabItem component
 * const child = <TabItem tabId="tab1">Content</TabItem>;
 * if (isElement(child, TabItem, 'TabItem')) {
 *   // TypeScript now knows child is React.ReactElement<TabItemProps>
 *   console.log(child.props.tabId); // Type-safe access
 * }
 *
 * @example
 * // Filter children to only TabItem components
 * const tabItems = Children.toArray(children).filter(
 *   (child) => isElement(child, TabItem, 'TabItem')
 * );
 */
function isElement<T>(
    node: React.ReactNode,
    element: React.ComponentType<T>,
    displayName: string,
): node is React.ReactElement<T> {
    if (!isValidElement(node)) return false;

    const nodeType = node.type;

    // Direct component match
    if (nodeType === element) return true;

    // Function component with displayName or name match
    if (typeof nodeType === 'function') {
        const functionType = nodeType as {
            displayName?: string;
            name?: string;
        };
        return (
            functionType.displayName === displayName ||
            functionType.name === displayName
        );
    }

    return false;
}

isElement.displayName = 'isElement';
export default isElement;
