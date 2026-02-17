import Link from "next/link";
import { cn } from "@/lib/utils/cn";

const colorMap = {
  brand: "border-l-brand",
  success: "border-l-success",
  warning: "border-l-warning",
  error: "border-l-error",
  info: "border-l-info",
} as const;

type StatCardColor = keyof typeof colorMap;

type StatCardProps = {
  value: string | number;
  label: string;
  color?: StatCardColor;
  href?: string;
  onClick?: () => void;
  selected?: boolean;
  className?: string;
};

function StatCard({ value, label, color = "brand", href, onClick, selected, className }: StatCardProps) {
  const classes = cn(
    "bg-surface-card border border-border rounded-card p-5",
    "border-l-4",
    colorMap[color],
    "transition-colors duration-150",
    (href || onClick) && "hover:border-brand cursor-pointer",
    selected && "ring-2 ring-brand",
    className
  );

  const inner = (
    <>
      <p className="font-mono text-3xl sm:text-[36px] font-bold leading-tight text-text-primary">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
        {label}
      </p>
    </>
  );

  if (href) {
    return (
      <Link href={href}>
        <article className={classes}>{inner}</article>
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(classes, "text-left w-full")}>
        {inner}
      </button>
    );
  }

  return <article className={classes}>{inner}</article>;
}

export { StatCard, type StatCardProps, type StatCardColor };
