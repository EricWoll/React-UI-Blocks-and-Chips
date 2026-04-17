type AnimationName =
  | "pan"
  | "hue"
  | "pulse"
  | "rotate"
  | "squiggle"
  | "blobMorph";

type AnimationTarget = "gradient" | "shape" | "wrapper";

type BuiltInAnimationConfig = {
  speed?: number;
  intensity?: number;
  direction?: "horizontal" | "vertical" | "diagonal" | "radial" | "cw" | "ccw";
  delay?: number;
  iterationCount?: number | "infinite";
  easing?: string;
  fillMode?: "none" | "forwards" | "backwards" | "both";
  playDirection?: "normal" | "reverse" | "alternate" | "alternate-reverse";
  /** Which layer to animate. Default depends on animation. */
  target?: AnimationTarget;
};

type CustomAnimationConfig = {
  type: "custom";
  /** Provide keyframes object or a pre-existing keyframes name */
  keyframes: KeyframesObject | string;
  /** Optional CSS custom properties for use in your keyframes */
  cssVars?: Record<string, string | number>;
  /** Timing options (ms) */
  timing?: {
    direction?: "normal" | "reverse" | "alternate" | "alternate-reverse";
    delay?: number;
    iterationCount?: number | "infinite";
    easing?: string;
    fillMode?: "none" | "forwards" | "backwards" | "both";
    duration?: number;
  };
  target?: AnimationTarget;
};

type KeyframeStep = Partial<Record<string, string | number>>; // e.g., { transform: 'scale(1.05)' }
type KeyframesObject = Record<string, KeyframeStep>; // { '0%': {...}, '100%': {...} }

type AnimationsProp =
  | AnimationName[]
  | Record<string, BuiltInAnimationConfig | CustomAnimationConfig>;

type ShapePreset =
  | "none"
  | "blob"
  | "squiggle"
  | "wave"
  | "circleCutout"
  | "diagonalStripes";

type CustomShape = {
  type: "custom";
  /** Any valid CSS mask-image value (e.g., 'url(#id)', 'url(data:image/svg+xml;...)', gradients, etc.) */
  mask: string;
  /** Optional sizing/positioning for mask */
  maskSize?: string;
  maskPosition?: string;
  maskRepeat?: string;
  /** Optional WebKit-prefixed overrides for Safari */
  webkitMaskImage?: string;
  webkitMaskSize?: string;
  webkitMaskPosition?: string;
  webkitMaskRepeat?: string;
};

type ShapeAnimation =
  | AnimationName
  | (BuiltInAnimationConfig & { type?: AnimationName | "custom" })
  | CustomAnimationConfig;

export type AnimatedGradientProps = {
  colorHex?: string;
  gradient?: string;
  /** Number of stops to auto-generate from colorHex (default 3). */
  stops?: number;
  /** Angle for auto-generated gradient (degrees). Default 135. */
  angle?: number;
  animated?: boolean;
  animations?: AnimationsProp;

  shape?: ShapePreset | CustomShape;
  shapeAnim?: ShapeAnimation | ShapeAnimation[];

  respectReducedMotion?: boolean;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
};

type ShapeDef = {
  maskImage: string;
  maskSize?: string;
  maskPosition?: string;
  maskRepeat?: string;
  webkitMaskImage?: string;
  webkitMaskSize?: string;
  webkitMaskPosition?: string;
  webkitMaskRepeat?: string;
};

type AnimationDescriptor = {
  name: string;
  css: string; // @keyframes CSS (for injection)
  defaultDuration: number;
  defaultEasing: string;
  /** Which CSS properties are modified (info only) */
  affects?: Array<
    "transform" | "filter" | "backgroundPosition" | "maskPosition"
  >;
  /** Suggested target if not provided */
  defaultTarget: AnimationTarget;
};

type ConcreteAnimation = {
  name: string;
  /** combined timing */
  durationMs: number;
  easing: string;
  iterationCount: number | "infinite";
  delayMs: number;
  fillMode: NonNullable<BuiltInAnimationConfig["fillMode"]> | "both";
  playDirection:
    | NonNullable<BuiltInAnimationConfig["playDirection"]>
    | "normal";
  /** which layer receives this animation */
  target: AnimationTarget;
  /** optional CSS vars to set on that layer */
  cssVars?: Record<string, string | number>;
};

export {
  type AnimationName,
  type AnimationTarget,
  type BuiltInAnimationConfig,
  type KeyframeStep,
  type KeyframesObject,
  type CustomAnimationConfig,
  type AnimationsProp,
  type ShapePreset,
  type CustomShape,
  type ShapeAnimation,
  type ShapeDef,
  type AnimationDescriptor,
  type ConcreteAnimation,
};
