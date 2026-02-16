import { cn } from "@/lib/utils/cn";

type SkeletonVariant = "text" | "circle" | "card" | "table-row";

type SkeletonProps = {
  variant?: SkeletonVariant;
  className?: string;
};

const variantStyles: Record<SkeletonVariant, string> = {
  text: "h-4 w-full rounded",
  circle: "size-10 rounded-full",
  card: "h-24 w-full rounded-card",
  "table-row": "h-12 w-full rounded",
};

function Skeleton({ variant = "text", className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-border/50",
        "bg-[length:200%_100%]",
        "bg-[linear-gradient(90deg,transparent_0%,var(--color-surface)_50%,transparent_100%)]",
        "animate-[shimmer_1.5s_ease-in-out_infinite]",
        variantStyles[variant],
        className
      )}
    />
  );
}

export { Skeleton, type SkeletonProps, type SkeletonVariant };
