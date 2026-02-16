"use client";

import { cn } from "@/lib/utils/cn";

type ToggleProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
};

function Toggle({ checked, onChange, label, disabled, className }: ToggleProps) {
  return (
    <div className={cn("inline-flex items-center gap-2", className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex shrink-0 items-center",
          "min-h-[44px] min-w-[44px] p-[10px] -m-[10px]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "cursor-pointer"
        )}
      >
        <span
          className={cn(
            "relative inline-flex h-6 w-11 items-center rounded-full",
            "transition-colors duration-200 ease-in-out",
            checked ? "bg-text-primary" : "bg-border"
          )}
        >
          <span
            className={cn(
              "pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm",
              "transition-transform duration-200 ease-in-out",
              checked ? "translate-x-5" : "translate-x-0"
            )}
          />
        </span>
      </button>
      {label && (
        <span className="text-sm text-text-primary">{label}</span>
      )}
    </div>
  );
}

export { Toggle, type ToggleProps };
