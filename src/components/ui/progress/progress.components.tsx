import clsx from "clsx";
import { HTMLAttributes } from "react";

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  progressSlider?: HTMLAttributes<HTMLDivElement>;
  progressBackground?: HTMLAttributes<HTMLDivElement>;
}

export default function Prgress({
  value,
  max = 100,
  progressSlider,
  progressBackground,
  className,
  ...props
}: ProgressProps) {
  return (
    <div {...props} className={clsx("relative", className)}>
      <div
        {...progressSlider}
        className={clsx(
          "absolute top-0 left-0 h-full bg-blue-500",
          progressSlider?.className,
        )}
        style={{ width: `${(value / max) * 100}%`, ...progressSlider?.style }}
      ></div>
      <div
        {...progressBackground}
        className={clsx(
          "h-2 w-full bg-gray-200",
          progressBackground?.className,
        )}
      ></div>
    </div>
  );
}
