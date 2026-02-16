import { cn } from "@/lib/utils/cn";

const colorMap = {
  brand: "bg-brand",
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-error",
} as const;

type ProgressBarProps = {
  value: number;
  label?: string;
  color?: keyof typeof colorMap;
  className?: string;
};

function ProgressBar({ value, label, color = "brand", className }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      {label !== undefined && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-text-secondary">{label}</span>
          <span className="font-mono text-xs font-bold text-text-primary">
            {Math.round(clamped)}%
          </span>
        </div>
      )}
      {label === undefined && (
        <div className="flex justify-end">
          <span className="font-mono text-xs font-bold text-text-primary">
            {Math.round(clamped)}%
          </span>
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        className="h-1.5 w-full overflow-hidden rounded-progress bg-border"
      >
        <div
          className={cn(
            "h-full rounded-progress transition-all duration-300 ease-out",
            colorMap[color]
          )}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

export { ProgressBar, type ProgressBarProps };
