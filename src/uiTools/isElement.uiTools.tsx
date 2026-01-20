import { isValidElement } from 'react';

function isElement<T>(
    node: React.ReactNode,
    element: React.ComponentType<T>,
    displayName: string,
): node is React.ReactElement<T> {
    if (!isValidElement(node)) return false;
    const t: any = node.type;
    return (
        t === element ||
        (typeof t === 'function' &&
            (t.displayName.equals(displayName) || t.name.equals(displayName)))
    );
}
isElement.displaName = 'isElement';
export default isElement;
