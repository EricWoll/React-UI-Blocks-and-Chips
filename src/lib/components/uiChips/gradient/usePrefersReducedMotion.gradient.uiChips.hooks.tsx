import { useEffect, useState } from "react";

function usePrefersReducedMotion(defaultRespect = true) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (
      !defaultRespect ||
      typeof window === "undefined" ||
      !window.matchMedia
    ) {
      setReduced(false);
      return;
    }
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");

    const onChange = () => setReduced(!!mq.matches);
    onChange();

    mq.addEventListener?.("change", onChange);

    return () => mq.removeEventListener?.("change", onChange);
  }, [defaultRespect]);

  return reduced;
}
usePrefersReducedMotion.displayName = "usePrefersReducedMotion";

export default usePrefersReducedMotion;
