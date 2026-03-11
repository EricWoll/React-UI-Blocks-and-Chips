import React, {
    useState,
    createContext,
    useContext,
    useMemo,
    useCallback,
    useEffect,
} from "react";

import useWindowSize from "@/lib/hooks/useWindowSize.hooks";

type NavBarMode = "mobile" | "desktop";

interface NavBarContext {
    isOpen: boolean;
    toggleOpen: () => void;
    setIsOpen: (isOpen: boolean) => void;
    mode: NavBarMode;
    updateMode: (mode: NavBarMode) => void;
    headerHeightPx: number;
    updateHeaderHeightPx: (headerHeightPx: number) => void;
}

const NavBarContext = createContext<NavBarContext | undefined>(undefined);

interface NavBarProviderProps {
    children: React.ReactNode;
    widthSmBreakpointPx?: number;
    widthMdBreakpointPx?: number;
}

function NavBarProvider({
    children,
    widthSmBreakpointPx = 768,
    widthMdBreakpointPx = 1024,
}: NavBarProviderProps) {
    const [isOpen, setIsOpen] = useState<boolean>(true);
    const [mode, setMode] = useState<NavBarMode>("mobile");
    const [headerHeightPx, setHeaderHeightPx] = useState<number>(0);

    const { width } = useWindowSize();

    const toggleOpen = useCallback(() => {
        setIsOpen((prev) => !prev);
        console.log("toggleOpen");
    }, []);

    const updateMode = useCallback((newMode: NavBarMode) => {
        setMode(newMode);
    }, []);

    const updateHeaderHeightPx = useCallback((newHeaderHeightPx: number) => {
        setHeaderHeightPx(newHeaderHeightPx);
    }, []);

    useEffect(() => {
        if (width === 0) return;

        if (width < widthSmBreakpointPx) {
            setMode("mobile");
        } else if (widthSmBreakpointPx < width && width < widthMdBreakpointPx) {
            setMode("desktop");
            setIsOpen(false);
        } else {
            setMode("desktop");
        }
    }, [width]);

    const value = useMemo(
        () => ({
            isOpen,
            toggleOpen,
            setIsOpen,
            mode,
            updateMode,
            headerHeightPx,
            updateHeaderHeightPx,
            windowWidth: width,
        }),
        [isOpen, toggleOpen, setIsOpen, mode, updateMode, headerHeightPx],
    );
    return (
        <NavBarContext.Provider value={value}>
            {children}
        </NavBarContext.Provider>
    );
}
NavBarProvider.displayName = "NavBarProvider";

function useNavBar() {
    const context = useContext(NavBarContext);
    if (!context) {
        throw new Error("useNavBar must be used within a NavBarProvider");
    }
    return context;
}
useNavBar.displayName = "useNavBar";

export { NavBarProvider, useNavBar };
