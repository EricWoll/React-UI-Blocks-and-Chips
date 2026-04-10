import React, {
    useState,
    createContext,
    useContext,
    useMemo,
    useCallback,
    useEffect,
    useRef,
} from "react";

import useWindowSize from "@/lib/hooks/useWindowSize.hooks";

type NavBarMode = "mobile" | "desktop";

interface iNavBarContext {
    isOpen: boolean;
    toggleOpen: () => void;
    setIsOpen: (isOpen: boolean) => void;

    mode: NavBarMode;
    updateMode: (mode: NavBarMode) => void;

    headerElementRef: React.RefObject<HTMLElement>;
    headerHeightPx: number;

    activeNavItemId: string;
    registerNavItem: (item: iNavItemRegistration) => () => void;
}

interface iNavItemRegistration {
    id: string;
    href: string;
    requireQuery?: boolean;
    requireHash?: boolean;
}

const NavBarContext = createContext<iNavBarContext | undefined>(undefined);

interface NavBarProviderProps {
    children: React.ReactNode;

    currentPath: string;

    widthSmBreakpointPx?: number;
    widthMdBreakpointPx?: number;
}

function NavBarProvider({
    children,
    currentPath,
    widthSmBreakpointPx = 768,
    widthMdBreakpointPx = 1024,
}: NavBarProviderProps) {
    const { wSize: width } = useWindowSize({
        selector: (s) => s.width,
    });

    const [isOpen, setIsOpen] = useState<boolean>(false);
    const [mode, setMode] = useState<NavBarMode>("mobile");
    const [headerHeightPx, setHeaderHeightPx] = useState<number>(0);
    const [activeNavItemId, setActiveNavItemId] = useState<string>("");

    const headerElementRef = useRef<HTMLElement>(null);
    const headerObserverRef = useRef<ResizeObserver | null>(null);
    const navItemsRef = useRef<Map<string, iNavItemRegistration>>(new Map());

    const toggleOpen = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    const updateMode = useCallback((newMode: NavBarMode) => {
        setMode(newMode);
    }, []);

    const updateActiveItem = useCallback((path: string) => {
        const { pathname, query, hash } = parsePath(path);

        let bestMatch: { id: string; length: number } | null = null;

        for (const item of navItemsRef.current.values()) {
            const {
                pathname: itemPathname,
                query: itemQuery,
                hash: itemHash,
            } = parsePath(item.href);

            const pathnameMatches =
                pathname === itemPathname ||
                pathname.startsWith(itemPathname + "/");

            if (!pathnameMatches) continue;
            if (item.requireQuery === true && query !== itemQuery) continue;
            if (item.requireHash === true && hash !== itemHash) continue;

            const length = itemPathname.length;

            if (!bestMatch || length > bestMatch.length) {
                bestMatch = { id: item.id, length };
            }
        }

        setActiveNavItemId(bestMatch?.id ?? "");
    }, []);

    const registerNavItem = useCallback((item: iNavItemRegistration) => {
        navItemsRef.current.set(item.id, item);

        return () => {
            navItemsRef.current.delete(item.id);
        };
    }, []);

    useEffect(() => {
        updateActiveItem(currentPath);
    }, [currentPath, updateActiveItem]);

    useEffect(() => {
        const el = headerElementRef.current;
        if (!el) return;

        if (headerObserverRef.current) {
            headerObserverRef.current.disconnect();
            headerObserverRef.current = null;
        }

        const measure = () => {
            setHeaderHeightPx(el.getBoundingClientRect().height);
        };
        const observer = new ResizeObserver(measure);
        observer.observe(el);

        requestAnimationFrame(measure);
        headerObserverRef.current = observer;

        return () => {
            observer.disconnect();
            headerObserverRef.current = null;
        };
    }, []);

    const modifyWindowMode = useCallback(() => {
        if (width === 0) return;

        if (width < widthSmBreakpointPx) {
            setMode("mobile");
            setIsOpen(false);
        } else if (widthSmBreakpointPx < width && width < widthMdBreakpointPx) {
            setMode("desktop");
            setIsOpen(false);
        } else {
            setMode("desktop");
        }
    }, [width, widthSmBreakpointPx, widthMdBreakpointPx]);

    // Set initial mode on mount
    useEffect(() => {
        modifyWindowMode();
    }, []);

    // Update mode when window size changes
    useEffect(() => {
        modifyWindowMode();
    }, [width]);

    const value = useMemo(
        () => ({
            isOpen,
            toggleOpen,
            setIsOpen,
            mode,
            updateMode,
            headerHeightPx,
            headerElementRef,
            activeNavItemId,
            registerNavItem,
        }),
        [
            isOpen,
            mode,
            headerHeightPx,
            headerElementRef,
            activeNavItemId,
            registerNavItem,
        ],
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

const parsePath = (path: string) => {
    const [pathnameAndQuery, hash = ""] = path.split("#");
    const [pathname, query = ""] = pathnameAndQuery.split("?");

    return {
        pathname,
        query: query ? `?${query}` : "",
        hash: hash ? `#${hash}` : "",
    };
};

export { NavBarProvider, useNavBar };
