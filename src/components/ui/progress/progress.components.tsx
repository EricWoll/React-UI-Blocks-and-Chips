import { cn } from "@/lib/tools/cn.tools";
import { HTMLAttributes } from "react";

interface ProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  progressSlider?: HTMLAttributes<HTMLDivElement>;
  progressBackground?: HTMLAttributes<HTMLDivElement>;
}

export default function Progress({
  value,
  max = 100,
  progressSlider,
  progressBackground,
  className,
  ...props
}: ProgressProps) {
  const safeMax = Math.max(max, 1);

  const clampedValue = Math.min(Math.max(value, 0), safeMax);
  const percent = (clampedValue / safeMax) * 100;

  const roundedPercent = Math.round(percent * 100) / 100;

  return (
    <div
      {...props}
      className={cn("relative", className)}
      role="progressbar"
      aria-valuenow={roundedPercent}
    >
      <div
        {...progressSlider}
        className={cn(
          "absolute top-0 left-0 h-full bg-blue-500",
          progressSlider?.className,
        )}
        style={{
          ...progressSlider?.style,
          width: `${roundedPercent}%`,
        }}
        data-testid="progress-display"
        aria-hidden
      ></div>
      <div
        {...progressBackground}
        aria-hidden
        className={cn("h-2 w-full bg-gray-200", progressBackground?.className)}
      ></div>
    </div>
  );
}
