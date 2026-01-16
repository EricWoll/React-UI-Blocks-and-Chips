import { useState, createContext, useContext, useMemo } from 'react';

interface CollapseAbleContext {
    isOpen: boolean;
    toggleOpen: () => void;
    setIsOpen: (isOpen: boolean) => void;
    isControlled?: boolean | undefined;
}

const CollapseAbleContext = createContext<CollapseAbleContext | undefined>(
    undefined
);

interface CollapseAbleProviderProps {
    children: React.ReactNode;
    defaultOpen?: boolean;
    isControlled?: boolean;
    controlledIsOpen?: boolean | undefined;
    onOpen?: () => void; // user-initiated only
}

function CollapseAbleProvider({
    children,
    defaultOpen = false,
    isControlled = false,
    controlledIsOpen,
    onOpen,
}: CollapseAbleProviderProps) {
    const [uncontrolled, setUncontrolled] = useState<boolean>(defaultOpen);

    const controlled = isControlled && typeof controlledIsOpen === 'boolean';

    // Single source of truth
    const effective = controlled ? (controlledIsOpen as boolean) : uncontrolled;

    const toggleOpen = () => {
        onOpen?.();
        if (controlled) return;

        if (!controlled) {
            setUncontrolled((prev) => !prev);
        }
    };

    const setIsOpen = (next: boolean) => {
        onOpen?.();
        if (!controlled) {
            setUncontrolled(next);
        }
    };

    const value = useMemo(
        () => ({
            isOpen: effective,
            toggleOpen,
            setIsOpen,
            isControlled: controlled,
        }),
        [effective, controlled]
    );

    return (
        <CollapseAbleContext.Provider value={value}>
            {children}
        </CollapseAbleContext.Provider>
    );
}
CollapseAbleProvider.displayName = 'CollapseAbleProvider';

function useCollapseAble() {
    const context = useContext(CollapseAbleContext);
    if (!context) {
        throw new Error(
            'useCollapseAble must be used within a CollapseAbleProvider'
        );
    }
    return context;
}
useCollapseAble.displayName = 'useCollapseAble';

export { CollapseAbleProvider, useCollapseAble };
