import clsx from 'clsx';
import CollapseAbleProvider, {
    useCollapseAble,
} from '../contexts/collapseAble.context';

export interface CollapseAbleProps
    extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    defaultOpen?: boolean;
    isControlled?: boolean | undefined;
    controlledIsOpen?: boolean | undefined;
    onOpen?: () => void;
    key?: React.Key;
}

export function CollapseAble({
    children,
    defaultOpen,
    isControlled,
    controlledIsOpen,
    onOpen,
    key,
    ...props
}: CollapseAbleProps) {
    return (
        <CollapseAbleProvider
            isControlled={isControlled}
            defaultOpen={defaultOpen}
            controlledIsOpen={controlledIsOpen}
            onOpen={onOpen}
        >
            <CollapseAbleMain {...props}>{children}</CollapseAbleMain>
        </CollapseAbleProvider>
    );
}

function CollapseAbleMain({
    children,
    isControlled,
    className,
    ...props
}: CollapseAbleProps) {
    const { isOpen } = useCollapseAble();

    return (
        <div
            className={clsx(
                'w-96 border border-gray-400 rounded-sm p-1',
                className
            )}
            {...props}
            data-open={isOpen}
        >
            {children}
        </div>
    );
}

interface CollapseAbleContentProps
    extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
    maxHeight?: string;
    durationMs?: string;
}

export function CollapseAbleContent({
    children,
    className,
    maxHeight = 'fit',
    durationMs = '300',
    ...props
}: CollapseAbleContentProps) {
    const { isOpen } = useCollapseAble();

    return (
        <div
            className={clsx(
                `w-full transition-all duration-[${durationMs}] ease-in-out`,
                !isOpen ? 'h-0 overflow-hidden' : `h-[${maxHeight}]`,
                className
            )}
            data-open={isOpen}
            {...props}
        >
            {children}
        </div>
    );
}

interface CollapseAbleTitleProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export function CollapseAbleTitle({
    children,
    className,
    ...props
}: CollapseAbleTitleProps) {
    const { toggleOpen, isOpen } = useCollapseAble();
    return (
        <div
            onClick={toggleOpen}
            className={clsx(
                'w-full h-fit select-none border-b',
                !isOpen ? 'border-transparent' : 'border-gray-300',
                className
            )}
            data-open={isOpen}
            {...props}
        >
            {children}
        </div>
    );
}
