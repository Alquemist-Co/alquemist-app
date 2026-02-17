"use client";

import { cn } from "@/lib/utils/cn";
import { Check } from "lucide-react";

const STEPS = [
  { label: "Cultivar" },
  { label: "Fases" },
  { label: "Cantidad" },
  { label: "Planificacion" },
  { label: "Revision" },
];

type Props = {
  currentStep: number;
  onStepClick: (step: number) => void;
  maxVisitedStep: number;
};

export function WizardStepper({ currentStep, onStepClick, maxVisitedStep }: Props) {
  return (
    <nav aria-label="Pasos del wizard" className="flex items-center gap-1 sm:gap-2">
      {STEPS.map((step, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === currentStep;
        const isCompleted = stepNum < currentStep;
        const isClickable = stepNum <= maxVisitedStep;

        return (
          <div key={stepNum} className="flex items-center gap-1 sm:gap-2">
            {idx > 0 && (
              <div
                className={cn(
                  "h-px w-4 sm:w-8",
                  isCompleted ? "bg-brand" : "bg-border",
                )}
              />
            )}
            <button
              type="button"
              onClick={() => isClickable && onStepClick(stepNum)}
              disabled={!isClickable}
              aria-current={isActive ? "step" : undefined}
              className={cn(
                "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-medium transition-colors sm:px-3 sm:py-1.5 sm:text-sm",
                isActive && "bg-brand text-white",
                isCompleted && "bg-brand/10 text-brand",
                !isActive && !isCompleted && isClickable && "bg-surface-secondary text-secondary hover:bg-surface-secondary/80",
                !isClickable && "cursor-not-allowed bg-surface-secondary text-tertiary opacity-50",
              )}
            >
              {isCompleted ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-current/10 text-[10px]">
                  {stepNum}
                </span>
              )}
              <span className="hidden sm:inline">{step.label}</span>
            </button>
          </div>
        );
      })}
    </nav>
  );
}
