import { Button } from "@campus-cafe/ui/components/button";
import type { ReactNode } from "react";

type ConfirmDialogProps = {
  confirmLabel?: string;
  description: ReactNode;
  onConfirm: () => void | Promise<void>;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  pending?: boolean;
  title: string;
};

export default function ConfirmDialog({
  confirmLabel = "Confirm",
  description,
  onConfirm,
  onOpenChange,
  open,
  pending = false,
  title,
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        aria-label="Close confirmation dialog"
        className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"
        type="button"
        onClick={() => onOpenChange(false)}
      />
      <section
        aria-modal="true"
        className="relative flex w-full max-w-md flex-col gap-4 border border-border bg-background p-5 shadow-xl"
        role="dialog"
      >
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">{title}</h2>
          <div className="text-sm leading-6 text-muted-foreground">{description}</div>
        </div>
        <div className="flex justify-end gap-2">
          <Button disabled={pending} type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={pending} type="button" variant="destructive" onClick={() => void onConfirm()}>
            {pending ? "Processing..." : confirmLabel}
          </Button>
        </div>
      </section>
    </div>
  );
}
