import { cn } from "@campus-cafe/ui/lib/utils";

type OrderStatusValue = "pending" | "preparing" | "ready" | "completed";

type OrderStatusProps = {
  className?: string;
  status: OrderStatusValue;
};

const steps = [
  { id: "pending" as const, label: "Diterima" },
  { id: "preparing" as const, label: "Diproses" },
  { id: "ready" as const, label: "Siap diambil" },
];

function stepIndex(status: OrderStatusValue): number {
  if (status === "completed") {
    return 3;
  }

  if (status === "pending") {
    return 0;
  }

  if (status === "preparing") {
    return 1;
  }

  return 2;
}

export default function OrderStatus({ className, status }: OrderStatusProps) {
  const activeIndex = stepIndex(status);
  const completed = status === "completed";

  return (
    <div className={cn("w-full", className)}>
      <div className="flex items-start justify-between gap-1">
        {steps.map((step, index) => {
          const done = completed || index < activeIndex;
          const current = !completed && index === activeIndex;
          return (
            <div className="flex min-w-0 flex-1 flex-col items-center gap-1" key={step.id}>
              <div className="flex w-full items-center">
                {index > 0 ? (
                  <div
                    className={cn(
                      "h-0.5 flex-1 rounded-full",
                      index <= activeIndex || completed ? "bg-primary/70" : "bg-border",
                    )}
                  />
                ) : (
                  <div className="flex-1" />
                )}
                <span
                  className={cn(
                    "mx-1 flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-semibold",
                    done && "border-emerald-500 bg-emerald-500/20 text-emerald-400",
                    current && !done && "animate-pulse border-primary bg-primary/25 text-primary",
                    !done && !current && "border-muted-foreground/40 text-muted-foreground",
                  )}
                >
                  {done ? "✓" : index + 1}
                </span>
                {index < steps.length - 1 ? (
                  <div
                    className={cn(
                      "h-0.5 flex-1 rounded-full",
                      index < activeIndex || completed ? "bg-primary/70" : "bg-border",
                    )}
                  />
                ) : (
                  <div className="flex-1" />
                )}
              </div>
              <span className="max-w-[5rem] text-center text-[10px] leading-tight text-muted-foreground">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
