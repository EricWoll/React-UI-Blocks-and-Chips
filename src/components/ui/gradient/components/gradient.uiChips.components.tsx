import {
  AnimatedGradientProps,
  ShapeDef,
  CustomShape,
  ShapePreset,
} from "@/lib/components/gradient/types/gradient.uiChips.types";
import { SHAPES } from "@/lib/components/gradient/components/shapes.gradient.uiChips.components";
import {
  normalizeAnimations,
  toAnimationCSS,
} from "@/lib/components/gradient/utilities/normalize.gradient.uiChips.utilities";
import {
  isValidHex,
  stopsFromHex,
} from "@/lib/components/gradient/utilities/color.gradient.uiChips.utilities";
import usePrefersReducedMotion from "@/lib/components/gradient/hooks/usePrefersReducedMotion.gradient.uiChips.hooks";
import { useEffect, useMemo } from "react";
import clsx from "clsx";

let __ag_styleEl: HTMLStyleElement | null = null;
const __ag_injected = new Set<string>();
let __ag_keyframeId = 0;

/** Ensure a <style> tag exists for our dynamic keyframes (client-side only). */
function ensureStyleTag(): HTMLStyleElement | null {
  if (typeof document === "undefined") return null;
  if (__ag_styleEl && document.head.contains(__ag_styleEl)) return __ag_styleEl;
  const style = document.createElement("style");
  style.setAttribute("data-animated-gradient", "true");
  document.head.appendChild(style);
  __ag_styleEl = style;
  return __ag_styleEl;
}
ensureStyleTag.displayName = "ensureStyleTag";

/** Inject raw CSS once. Returns true if injected now, false if previously injected. */
function injectCSSOnce(css: string, signature: string) {
  if (typeof document === "undefined") return;
  if (__ag_injected.has(signature)) return;
  const tag = ensureStyleTag();
  if (!tag) return;
  tag.appendChild(document.createTextNode(css));
  __ag_injected.add(signature);
}
injectCSSOnce.displayName = "injectCSSOnce";

/** Create a unique name for dynamic keyframes based on a signature string. */
function uniqueName(prefix: string, signature: string) {
  // Simplistic hashing to keep name short & stable per signature in a session
  const hash = Array.from(signature).reduce(
    (acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0,
    0,
  );
  __ag_keyframeId += 1;
  return `${prefix}_${Math.abs(hash)}_${__ag_keyframeId}`;
}
uniqueName.displayName = "uniqueName";

const AnimatedGradient: React.FC<AnimatedGradientProps> = ({
  colorHex = "#000000",
  gradient,
  stops = 3,
  angle = 135,
  animated = true,
  animations = ["pan"],
  respectReducedMotion = true,

  shape = "none",
  shapeAnim,

  className,
  style,
  children,
}) => {
  // Ensure style tag exists on client; no-op on SSR
  useEffect(() => {
    ensureStyleTag();
  }, []);

  const reduced = usePrefersReducedMotion(respectReducedMotion);
  const runAnims = animated && !reduced;

  // Compute gradient string
  const gradientCSS = useMemo(() => {
    if (gradient && typeof gradient === "string") return gradient;
    if (isValidHex(colorHex)) {
      const stopList = stopsFromHex(colorHex!, stops).join(", ");
      return `linear-gradient(${angle}deg, ${stopList})`;
    }
    // Safe pleasant default
    return `linear-gradient(${angle}deg, #6366f1, #22d3ee, #a78bfa)`;
  }, [gradient, colorHex, stops, angle]);

  // Normalize animations
  const allAnims = useMemo(
    () => normalizeAnimations(animations, shapeAnim, !runAnims),
    [animations, shapeAnim, runAnims],
  );

  const wrapperAnims = allAnims.filter((a) => a.target === "wrapper");
  const gradientAnims = allAnims.filter((a) => a.target === "gradient");
  const shapeAnims = allAnims.filter((a) => a.target === "shape");

  const wrapperAnimCSS = toAnimationCSS(wrapperAnims);
  const gradientAnimCSS = toAnimationCSS(gradientAnims);
  const shapeAnimCSS = toAnimationCSS(shapeAnims);

  // If pan is present, use larger background-size for smoother motion
  const hasPan = gradientAnims.some((a) => a.name.startsWith("ag_pan"));
  const bgSize = hasPan ? "300% 300%" : "100% 100%";

  // Shape mask styles
  const shapeDef: ShapeDef | CustomShape | undefined =
    typeof shape === "string"
      ? shape === "none"
        ? undefined
        : SHAPES[shape as Exclude<ShapePreset, "none">]
      : shape;

  // Base layers
  const wrapperStyle: React.CSSProperties = {
    position: "relative",
    overflow: "hidden",
    ...style,
    ...(runAnims && wrapperAnims.length
      ? { animation: wrapperAnimCSS.animation, ...wrapperAnimCSS.vars }
      : null),
  };

  const gradientLayerStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    backgroundImage: gradientCSS,
    backgroundSize: bgSize,
    backgroundRepeat: "no-repeat",
    backgroundPosition: "50% 50%",
    ...(runAnims && gradientAnims.length
      ? { animation: gradientAnimCSS.animation, ...gradientAnimCSS.vars }
      : null),
  };

  const shapeLayerStyle: React.CSSProperties | undefined = shapeDef
    ? {
        position: "absolute",
        inset: 0,
        backgroundImage: gradientCSS,
        backgroundSize: bgSize,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "50% 50%",
        // Apply masks for both standard and WebKit
        maskImage:
          (shapeDef as any).maskImage ?? (shapeDef as any).webkitMaskImage,
        WebkitMaskImage:
          (shapeDef as any).webkitMaskImage ?? (shapeDef as any).maskImage,
        maskSize: (shapeDef as any).maskSize,
        WebkitMaskSize:
          (shapeDef as any).webkitMaskSize ?? (shapeDef as any).maskSize,
        maskPosition: (shapeDef as any).maskPosition,
        WebkitMaskPosition:
          (shapeDef as any).webkitMaskPosition ??
          (shapeDef as any).maskPosition,
        maskRepeat: (shapeDef as any).maskRepeat,
        WebkitMaskRepeat:
          (shapeDef as any).webkitMaskRepeat ?? (shapeDef as any).maskRepeat,
        borderRadius: "inherit", // so blobMorph has something to manipulate
        ...(runAnims && shapeAnims.length
          ? { animation: shapeAnimCSS.animation, ...shapeAnimCSS.vars }
          : null),
      }
    : undefined;

  return (
    <div
      className={clsx("relative overflow-hidden", className)}
      style={wrapperStyle}
    >
      {/* If a shape is specified, render only the shaped layer.
          Otherwise render the plain gradient layer. */}
      {shapeLayerStyle ? (
        <div aria-hidden style={shapeLayerStyle} />
      ) : (
        <div aria-hidden style={gradientLayerStyle} />
      )}

      {/* Content overlay */}
      {children ? <div className="relative z-10">{children}</div> : null}
    </div>
  );
};
AnimatedGradient.displayName = "AnimatedGradient";

export { ensureStyleTag, injectCSSOnce, uniqueName, AnimatedGradient };
