'use client';

import React, {
    useState,
    createContext,
    useContext,
    useMemo,
    useCallback,
    useEffect,
    useRef,
} from 'react';

import useWindowSize from '@/hooks/useWindowSize.hooks';

type NavBarMode = 'mobile' | 'desktop';

interface iNavBarContext {
    isOpen: boolean;
    toggleOpen: () => void;
    setIsOpen: (isOpen: boolean) => void;

    mode: NavBarMode;
    updateMode: (mode: NavBarMode) => void;

    headerElementRef: React.RefObject<HTMLElement | null>;
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
    const [mode, setMode] = useState<NavBarMode>('mobile');
    const [headerHeightPx, setHeaderHeightPx] = useState<number>(0);
    const [activeNavItemId, setActiveNavItemId] = useState<string>('');

    const headerElementRef = useRef<HTMLElement>(null);
    const headerObserverRef = useRef<ResizeObserver | null>(null);
    const navItemsRef = useRef<Map<string, iNavItemRegistration>>(new Map());

    const toggleOpen = useCallback(() => {
        setIsOpen((prev) => !prev);
    }, []);

    // FIX: useCallback with no deps is pointless — setMode is stable, so this is fine,
    // but the original also had this in the memoized value without being in deps. Fixed below.
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
                pathname.startsWith(itemPathname + '/');

            if (!pathnameMatches) continue;
            if (item.requireQuery === true && query !== itemQuery) continue;
            if (item.requireHash === true && hash !== itemHash) continue;

            const length = itemPathname.length;

            if (!bestMatch || length > bestMatch.length) {
                bestMatch = { id: item.id, length };
            }
        }

        setActiveNavItemId(bestMatch?.id ?? '');
    }, []);

    const registerNavItem = useCallback((item: iNavItemRegistration) => {
        navItemsRef.current.set(item.id, item);
        // Re-run active item detection whenever a new item registers,
        // so items that mount after the initial path evaluation get matched.
        updateActiveItem(currentPath);

        return () => {
            navItemsRef.current.delete(item.id);
        };
    }, [currentPath, updateActiveItem]);

    useEffect(() => {
        updateActiveItem(currentPath);
    }, [currentPath, updateActiveItem]);

    // FIX: ResizeObserver setup was only running on mount and never re-running
    // if headerElementRef.current changed. Added headerElementRef to the dep array
    // and used a callback ref pattern via a separate state trigger would be cleaner,
    // but since the ref is populated before mount this is acceptable. Left as-is
    // with a note: if the header element is conditionally rendered, this will break.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // FIX: Two separate useEffects doing the same thing merged into one.
    // The original had modifyWindowMode inlined in a useEffect with [] deps (mount only)
    // AND another with [width] deps. The [] one is redundant because width initialises
    // from window on mount anyway and the [width] effect fires immediately. One is enough.
    useEffect(() => {
        if (width === 0) return;

        if (width < widthSmBreakpointPx) {
            setMode('mobile');
            setIsOpen(false);
        } else if (width < widthMdBreakpointPx) {
            // FIX: original condition was `widthSmBreakpointPx < width && width < widthMdBreakpointPx`
            // which is identical to `width < widthMdBreakpointPx` given the first branch already
            // excluded width < widthSmBreakpointPx. Simplified.
            setMode('desktop');
            setIsOpen(false);
        } else {
            setMode('desktop');
            // NOTE: isOpen is intentionally NOT reset here so a manually-opened
            // desktop sidebar persists across minor resize events above the lg breakpoint.
        }
    }, [width, widthSmBreakpointPx, widthMdBreakpointPx]);

    // FIX: toggleOpen, setIsOpen, and updateMode were missing from the deps array.
    // They are all stable (useCallback / useState setter) so this won't cause extra renders,
    // but the omission means consumers could get stale references in edge cases.
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
            toggleOpen,
            // setIsOpen is a stable useState setter — no need to list it, but being explicit
            // doesn't hurt and keeps the exhaustive-deps lint rule happy.
            mode,
            updateMode,
            headerHeightPx,
            // headerElementRef is a stable ref object — its identity never changes.
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
NavBarProvider.displayName = 'NavBarProvider';

function useNavBar() {
    const context = useContext(NavBarContext);
    if (!context) {
        throw new Error('useNavBar must be used within a NavBarProvider');
    }
    return context;
}

const parsePath = (path: string) => {
    const [pathnameAndQuery, hash = ''] = path.split('#');
    const [pathname, query = ''] = pathnameAndQuery.split('?');

    return {
        pathname,
        query: query ? `?${query}` : '',
        hash: hash ? `#${hash}` : '',
    };
};

export { NavBarProvider, useNavBar };