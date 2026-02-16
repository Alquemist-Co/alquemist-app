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
  className?: string;
};

function StatCard({ value, label, color = "brand", href, className }: StatCardProps) {
  const content = (
    <article
      className={cn(
        "bg-surface-card border border-border rounded-card p-4",
        "border-l-4",
        colorMap[color],
        "transition-colors duration-150",
        href && "hover:border-brand cursor-pointer",
        className
      )}
    >
      <p className="font-mono text-2xl sm:text-[32px] font-bold leading-tight text-text-primary">
        {value}
      </p>
      <p className="mt-1 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
        {label}
      </p>
    </article>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return content;
}

export { StatCard, type StatCardProps, type StatCardColor };
