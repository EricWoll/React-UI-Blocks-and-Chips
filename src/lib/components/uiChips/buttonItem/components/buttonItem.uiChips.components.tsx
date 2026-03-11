import clsx from "clsx";

interface ButtonItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children?: React.ReactNode;
  isActive?: boolean;
  tabId: string;
}

function ButtonItem({
  children,
  isActive,
  tabId,
  className,
  ...props
}: ButtonItemProps) {
  return (
    <button
      data-is-Active={isActive}
      data-tab-id={tabId}
      {...props}
      className={clsx("select-none cursor-pointer", className)}
    >
      {children}
    </button>
  );
}
ButtonItem.displayName = "ButtonItem";

export default ButtonItem;
