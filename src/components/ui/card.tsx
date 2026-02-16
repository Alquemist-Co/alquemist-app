import { type HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils/cn";

type CardProps = HTMLAttributes<HTMLElement>;

const Card = forwardRef<HTMLElement, CardProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <article
        ref={ref}
        className={cn(
          "bg-surface-card border border-border rounded-card p-4",
          "transition-colors duration-150 hover:border-brand",
          className
        )}
        {...props}
      >
        {children}
      </article>
    );
  }
);
Card.displayName = "Card";

export { Card, type CardProps };
