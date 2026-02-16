"use client";

import { useEffect, useRef, useCallback, type ReactNode, type PointerEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type DialogProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
};

function Dialog({ open, onClose, title, children, footer }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const dragStartY = useRef<number | null>(null);
  const dragCurrentY = useRef<number>(0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open) {
      if (!dialog.open) dialog.showModal();
    } else {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (e: Event) => {
      e.preventDefault();
      onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    return () => dialog.removeEventListener("cancel", handleCancel);
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDialogElement>) => {
      if (e.target === dialogRef.current) {
        onClose();
      }
    },
    [onClose]
  );

  const handlePointerDown = useCallback((e: PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("[data-dialog-pill]")) {
      dragStartY.current = e.clientY;
      dragCurrentY.current = 0;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  }, []);

  const handlePointerMove = useCallback((e: PointerEvent<HTMLDivElement>) => {
    if (dragStartY.current === null) return;
    const deltaY = e.clientY - dragStartY.current;
    dragCurrentY.current = Math.max(0, deltaY);
    if (contentRef.current) {
      contentRef.current.style.transform = `translateY(${dragCurrentY.current}px)`;
    }
  }, []);

  const handlePointerUp = useCallback(() => {
    if (dragStartY.current === null) return;
    if (dragCurrentY.current > 100) {
      onClose();
    }
    if (contentRef.current) {
      contentRef.current.style.transform = "";
    }
    dragStartY.current = null;
    dragCurrentY.current = 0;
  }, [onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClick={handleBackdropClick}
      className={cn(
        "m-0 max-h-[85vh] w-full border-none bg-transparent p-0",
        "backdrop:bg-overlay",
        // Mobile: bottom sheet
        "fixed bottom-0 left-0 right-0",
        "animate-[slide-up_250ms_ease-out]",
        // Desktop: centered modal
        "sm:static sm:m-auto sm:max-w-[480px]",
        "sm:animate-[fade-in_200ms_ease-out]",
      )}
    >
      <div
        ref={contentRef}
        className={cn(
          "flex max-h-[85vh] flex-col bg-surface-card",
          // Mobile: rounded top only
          "rounded-t-dialog",
          // Desktop: fully rounded
          "sm:rounded-dialog",
        )}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {/* Pill indicator — mobile only */}
        <div
          data-dialog-pill
          className="flex justify-center py-3 sm:hidden cursor-grab touch-none"
        >
          <div className="h-1 w-10 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border sm:pt-5">
          <h2 className="font-sans text-lg font-bold text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className={cn(
              "flex size-8 items-center justify-center rounded-full",
              "text-text-secondary hover:bg-surface hover:text-text-primary",
              "transition-colors duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              "cursor-pointer",
            )}
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="border-t border-border px-5 py-4">
            {footer}
          </div>
        )}
      </div>
    </dialog>
  );
}

export { Dialog, type DialogProps };
