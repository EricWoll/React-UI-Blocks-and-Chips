import clsx from 'clsx';
import {
    CollapseAbleProvider,
    useCollapseAble,
} from '../contexts/collapseAble.context';

interface iCollapseAble {
    collapseAbleId: string;
    defaultOpen?: boolean;
    isControlled?: boolean | undefined;
    controlledIsOpen?: boolean | undefined;
    onOpen?: () => void;
}

type CollapseAbleProps = iCollapseAble & React.HTMLAttributes<HTMLDivElement>;

function CollapseAble({
    children,
    defaultOpen,
    isControlled,
    controlledIsOpen,
    onOpen,
    collapseAbleId,
    ...props
}: CollapseAbleProps) {
    return (
        <CollapseAbleProvider
            isControlled={isControlled}
            defaultOpen={defaultOpen}
            controlledIsOpen={controlledIsOpen}
            onOpen={onOpen}
            collapseAbleId={collapseAbleId}
        >
            <CollapseAbleContainer {...props}>{children}</CollapseAbleContainer>
        </CollapseAbleProvider>
    );
}
CollapseAble.displayName = 'CollapseAble';

function CollapseAbleContainer({
    children,
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    const { isOpen, isControlled, collapseAbleId } = useCollapseAble();

    return (
        <div
            className={clsx(
                'w-96 border border-gray-400 rounded-sm p-1',
                className,
            )}
            {...props}
            data-open={isOpen}
            data-controlled={isControlled}
            data-collapseable-id={collapseAbleId}
        >
            {children}
        </div>
    );
}
CollapseAbleContainer.displayName = 'CollapseAbleContainer';

function CollapseAbleTitle({
    children,
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    const { toggleOpen, isOpen, isControlled } = useCollapseAble();
    return (
        <div
            onClick={toggleOpen}
            className={clsx('w-full h-fit select-none', className)}
            data-open={isOpen}
            data-controlled={isControlled}
            {...props}
        >
            {children}
        </div>
    );
}
CollapseAbleTitle.displayName = 'CollapseAbleTitle';

interface CollapseAbleContentProps extends React.HTMLAttributes<HTMLDivElement> {
    maxHeight?: string;
    durationMs?: string;
}

function CollapseAbleContent({
    children,
    className,
    maxHeight = 'fit',
    durationMs = '300',
    ...props
}: CollapseAbleContentProps) {
    const { isOpen, isControlled } = useCollapseAble();

    return (
        <div
            className={clsx(
                `w-full transition-all duration-[${durationMs}] ease-in-out`,
                !isOpen ? 'h-0 overflow-hidden' : `h-[${maxHeight}]`,
                className,
            )}
            data-open={isOpen}
            data-controlled={isControlled}
            {...props}
        >
            {children}
        </div>
    );
}
CollapseAbleContent.displayName = 'CollapseAbleContent';

export {
    type iCollapseAble,
    CollapseAble,
    CollapseAbleTitle,
    CollapseAbleContent,
};
