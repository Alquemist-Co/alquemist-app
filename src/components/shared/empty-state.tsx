import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

type EmptyStateAction = {
  label: string;
} & (
  | { onClick: () => void; href?: never }
  | { href: string; onClick?: never }
);

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: EmptyStateAction;
  className?: string;
};

function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 px-6 py-12 text-center",
        className
      )}
    >
      {Icon && (
        <Icon className="size-12 text-brand" strokeWidth={1.5} />
      )}
      <div className="flex flex-col gap-1">
        <h3 className="text-base font-bold text-text-primary">{title}</h3>
        {description && (
          <p className="text-sm text-text-secondary">{description}</p>
        )}
      </div>
      {action && (
        action.href ? (
          <Link href={action.href}>
            <Button variant="secondary">{action.label}</Button>
          </Link>
        ) : (
          <Button variant="secondary" onClick={action.onClick}>
            {action.label}
          </Button>
        )
      )}
    </div>
  );
}

export { EmptyState, type EmptyStateProps };
