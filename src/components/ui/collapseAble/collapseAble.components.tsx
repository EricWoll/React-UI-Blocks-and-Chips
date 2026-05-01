"use client";

import { CollapseAbleProvider, useCollapseAble } from "./collapseAble.contexts";
import { cn } from "@/lib/tools/cn.tools";

interface iCollapseAble {
  collapseAbleId: string;
  defaultOpen?: boolean;
  isOpen?: boolean;
  onOpen?: () => void;
  onClose?: () => void;
  onToggle?: (isOpen: boolean) => void;
  durationMs?: number;
}

type CollapseAbleProps = iCollapseAble & React.HTMLAttributes<HTMLDivElement>;

/**
 * A collapsible container component that manages expandable/collapsible content.
 * Can be used in both controlled and uncontrolled modes.
 *
 * @param {React.ReactNode} children - Child components to render within the collapsible
 * @param {boolean} [defaultOpen] - Initial open state (uncontrolled mode)
 * @param {boolean} [isOpen] - Open state in controlled mode
 * @param {() => void} [onOpen] - Callback when component opens (closed -> open transition only)
 * @param {() => void} [onClose] - Callback when component closes (open -> closed transition only)
 * @param {(isOpen: boolean) => void} [onToggle] - Callback when toggle is attempted (useful for controlled mode)
 * @param {string} collapseAbleId - Unique identifier
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Additional HTML div attributes
 *
 * @example
 * ```tsx
 * <CollapseAble collapseAbleId="my-collapse" defaultOpen={false}>
 *   <CollapseAbleHeader>Click to expand</CollapseAbleHeader>
 *   <CollapseAbleContent>Hidden content here</CollapseAbleContent>
 * </CollapseAble>
 * ```
 */
function CollapseAble({
  children,
  defaultOpen,
  isOpen,
  onOpen,
  onClose,
  onToggle,
  collapseAbleId,
  durationMs,
  ...props
}: CollapseAbleProps) {
  return (
    <CollapseAbleProvider
      defaultOpen={defaultOpen}
      isOpen={isOpen}
      onOpen={onOpen}
      onClose={onClose}
      onToggle={onToggle}
      collapseAbleId={collapseAbleId}
      durationMs={durationMs}
    >
      <CollapseAbleContainer {...props}>{children}</CollapseAbleContainer>
    </CollapseAbleProvider>
  );
}
CollapseAble.displayName = "CollapseAble";

/**
 * Internal container component that wraps collapsible content.
 * Applies default styling and data attributes for state tracking.
 *
 * @internal
 * @param {React.ReactNode} children - Content to render inside the container
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Additional HTML div attributes
 */
function CollapseAbleContainer({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isOpen, isControlled, collapseAbleId } = useCollapseAble();

  return (
    <div
      className={cn("w-96 border border-gray-400 rounded-sm p-1", className)}
      {...props}
      data-open={isOpen}
      data-controlled={isControlled}
      data-collapseable-id={collapseAbleId}
    >
      {children}
    </div>
  );
}
CollapseAbleContainer.displayName = "CollapseAbleContainer";

/**
 * Clickable title/header component that toggles the collapsible state.
 * Must be used as a child of CollapseAble component.
 *
 * @param {React.ReactNode} children - Content to display in the title area
 * @param {string} [className] - Additional CSS classes to apply
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Additional HTML div attributes
 *
 * @example
 * ```tsx
 * <CollapseAbleHeader>
 *   <h3>Section Title</h3>
 * </CollapseAbleHeader>
 * ```
 */
function CollapseAbleHeader({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { toggleOpen, isOpen, isControlled } = useCollapseAble();

  return (
    <div
      onClick={toggleOpen}
      className={cn("w-full h-fit select-none cursor-pointer", className)}
      data-open={isOpen}
      data-controlled={isControlled}
      {...props}
    >
      {children}
    </div>
  );
}
CollapseAbleHeader.displayName = "CollapseAbleHeader";

interface CollapseAbleContentProps
  extends React.HTMLAttributes<HTMLDivElement> {
  maxHeight?: string;
}

/**
 * Content area component that expands and collapses with animation.
 * Must be used as a child of CollapseAble component.
 * Uses max-height transitions for smooth animations.
 *
 * @param {React.ReactNode} children - Content to show/hide
 * @param {string} [className] - Additional CSS classes to apply
 * @param {string} [maxHeight='500px'] - Maximum height when expanded (CSS value like '500px', '100%', etc.)
 * @param {number} [durationMs=300] - Animation duration in milliseconds
 * @param {React.HTMLAttributes<HTMLDivElement>} props - Additional HTML div attributes
 *
 * @example
 * ```tsx
 * <CollapseAbleContent maxHeight="500px" durationMs={500}>
 *   <p>This content will animate in and out</p>
 * </CollapseAbleContent>
 * ```
 */
function CollapseAbleContent({
  children,
  className,
  maxHeight = "500px",
  ...props
}: CollapseAbleContentProps) {
  const { isOpen, isControlled, durationMs } = useCollapseAble();

  return (
    <div
      className={cn(
        "w-full transition-all ease-in-out overflow-hidden",
        className,
      )}
      style={{
        maxHeight: isOpen ? maxHeight : "0",
        transitionDuration: `${durationMs}ms`,
      }}
      data-open={isOpen}
      data-controlled={isControlled}
      aria-hidden={!isOpen}
      {...props}
    >
      {children}
    </div>
  );
}
CollapseAbleContent.displayName = "CollapseAbleContent";

export {
  type CollapseAbleProps,
  CollapseAble,
  CollapseAbleHeader,
  CollapseAbleContent,
};
