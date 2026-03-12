import { useEffect, useState } from "react";

type WindowSize = { width: number; height: number };

/**
 * Returns the current window size. SSR-safe.
 * Adds a single 'resize' listener and updates state on change.
 */
function useWindowSize(): WindowSize {
  const isClient = typeof window !== "undefined";

  const getSize = (): WindowSize => ({
    width: isClient ? window.innerWidth : 0,
    height: isClient ? window.innerHeight : 0,
  });

  const [windowSize, setWindowSize] = useState<WindowSize>(getSize);

  useEffect(() => {
    if (!isClient) return;

    let frame = 0;
    const handleResize = () => {
      // Throttle to animation frame
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setWindowSize(getSize()));
    };

    window.addEventListener("resize", handleResize, { passive: true });
    handleResize();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", handleResize);
    };
  }, [isClient]);

  return windowSize;
}

export default useWindowSize;
