import {
    useState,
    createContext,
    useContext,
    useMemo,
    useCallback,
} from 'react';

interface CollapseAbleContext {
    isOpen: boolean;
    toggleOpen: () => void;
    setIsOpen: (isOpen: boolean) => void;
    isControlled?: boolean | undefined;
    collapseAbleId?: string;
}

const CollapseAbleContext = createContext<CollapseAbleContext | undefined>(
    undefined,
);

interface CollapseAbleProviderProps {
    children: React.ReactNode;
    defaultOpen?: boolean;
    isControlled?: boolean;
    controlledIsOpen?: boolean | undefined;
    onOpen?: () => void; // user-initiated only
    collapseAbleId?: string;
}

function CollapseAbleProvider({
    children,
    defaultOpen = false,
    isControlled = false,
    controlledIsOpen,
    onOpen,
    collapseAbleId,
}: CollapseAbleProviderProps) {
    const [uncontrolled, setUncontrolled] = useState<boolean>(defaultOpen);

    const [id] = useState<string>(() => {
        if (!isControlled && !collapseAbleId) {
            if (
                typeof window !== 'undefined' &&
                'crypto' in window &&
                'randomUUID' in crypto
            ) {
                return crypto.randomUUID();
            }
            return `collapse-${Math.random().toString(36).slice(2)}`;
        }
        return collapseAbleId ?? '';
    });

    const controlled = isControlled && typeof controlledIsOpen === 'boolean';
    const effective = controlled ? (controlledIsOpen as boolean) : uncontrolled;

    const toggleOpen = useCallback(() => {
        onOpen?.();

        if (controlled) return;
        setUncontrolled((prev) => !prev);
    }, [controlled, onOpen]);

    const setIsOpen = useCallback(
        (next: boolean) => {
            onOpen?.();
            if (!controlled) setUncontrolled(next);
        },
        [controlled, onOpen],
    );

    const value = useMemo(
        () => ({
            isOpen: effective,
            toggleOpen,
            setIsOpen,
            isControlled: controlled,
            collapseAbleId: id,
        }),
        [effective, controlled, id, toggleOpen, setIsOpen],
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
            'useCollapseAble must be used within a CollapseAbleProvider',
        );
    }
    return context;
}
useCollapseAble.displayName = 'useCollapseAble';

export { CollapseAbleProvider, useCollapseAble };
