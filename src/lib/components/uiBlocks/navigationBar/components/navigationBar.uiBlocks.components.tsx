import clsx from "clsx";
import { useNavBar } from "../contexts/navigationBar.uiBlocks.contexts";
import { useEffect, ButtonHTMLAttributes } from "react";
import { Drawer } from "@/lib/components/uiChips/drawer/components/drawer.uiChips.components";

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  headerHeightPx?: number;
}

function PageContainer({
  className,
  headerHeightPx = 0,
  children,
  ...props
}: PageContainerProps) {
  const { updateHeaderHeightPx } = useNavBar();

  useEffect(() => {
    updateHeaderHeightPx(headerHeightPx);
  }, [headerHeightPx]);

  return (
    <div
      className={clsx(
        `w-full min-h-[calc(100vh - ${headerHeightPx})]`,
        "flex flex-row flex-nowrap",
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}
PageContainer.displayName = "PageContainer";

interface NavBarProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  durationMs?: number;
  zIndexBase?: number;
  navBarWidthLg?: string;
  navBarWidthSm?: string;
}

function NavBar({
  children,
  durationMs = 300,
  zIndexBase = 50,
  navBarWidthLg = "w-72",
  navBarWidthSm = "w-14",
  className,
  style,
  ...props
}: NavBarProps) {
  const { mode, isOpen, toggleOpen, headerHeightPx } = useNavBar();

  if (mode === "mobile") {
    return (
      <>
        <Drawer
          isOpen={isOpen}
          toggleOpen={toggleOpen}
          zIndexBase={zIndexBase}
          durationMs={durationMs}
        >
          {children}
        </Drawer>
      </>
    );
  }

  return (
    <div
      className={clsx(
        `sticky`,
        "bg-gray-100",
        "overflow-y-auto overflow-x-hidden",
        isOpen ? navBarWidthLg : navBarWidthSm,
        className,
      )}
      style={{
        top: `${headerHeightPx}px`,
        height: `calc(100vh - ${headerHeightPx}px)`,
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  );
}
NavBar.displayName = "NavBar";

function PageContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={clsx("w-full", className)} {...props}>
      {children}
    </div>
  );
}
PageContent.displayName = "PageContent";

interface NavToggleProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

function NavToggle({ onClick, children, ...props }: NavToggleProps) {
  const { toggleOpen } = useNavBar();

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    toggleOpen();
  };

  return (
    <button {...props} onClick={handleClick}>
      {children}
    </button>
  );
}
NavToggle.displayName = "NavToggle";

export { PageContainer, NavBar, PageContent, NavToggle };
