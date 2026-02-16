"use client";

import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const buttonVariants = cva(
  [
    "inline-flex items-center justify-center gap-2",
    "font-sans font-bold text-sm",
    "rounded-button",
    "transition-colors duration-150",
    "active:scale-[0.98]",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
    "disabled:opacity-40 disabled:pointer-events-none",
    "min-h-[44px] min-w-[44px]",
    "cursor-pointer",
  ],
  {
    variants: {
      variant: {
        primary:
          "bg-brand text-brand-light hover:bg-brand-dark",
        secondary:
          "bg-transparent border border-brand text-brand hover:bg-brand hover:text-brand-light",
        ghost:
          "bg-transparent text-brand hover:bg-surface",
      },
      size: {
        default: "h-12 sm:h-10 px-6",
        sm: "h-9 px-4 text-xs",
        lg: "h-14 sm:h-12 px-8 text-base",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "default",
    },
  }
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & {
    icon?: LucideIcon;
    loading?: boolean;
  };

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, icon: Icon, loading, disabled, children, ...props }, ref) => {
    const isDisabled = disabled || loading;

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isDisabled}
        aria-disabled={isDisabled || undefined}
        tabIndex={isDisabled ? -1 : undefined}
        {...props}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" />
        ) : Icon ? (
          <Icon className="size-4" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants, type ButtonProps };
