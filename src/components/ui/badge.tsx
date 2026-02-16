import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-badge px-2.5 py-1 text-[11px] font-bold leading-none max-w-full",
  {
    variants: {
      variant: {
        filled: "bg-brand text-brand-light",
        outlined: "border border-brand text-brand bg-transparent",
        success: "bg-success text-white",
        warning: "bg-warning text-white",
        error: "bg-error text-white",
        info: "bg-info text-white",
      },
    },
    defaultVariants: {
      variant: "filled",
    },
  }
);

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> &
  VariantProps<typeof badgeVariants>;

function Badge({ className, variant, children, ...props }: BadgeProps) {
  const text = typeof children === "string" ? children : undefined;

  return (
    <span
      className={cn(badgeVariants({ variant }), className)}
      title={text}
      {...props}
    >
      <span className="truncate">{children}</span>
    </span>
  );
}

export { Badge, badgeVariants, type BadgeProps };
