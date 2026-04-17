import type { Doc } from "@campus-cafe/backend/convex/_generated/dataModel";

type TableDoc = Doc<"tables">;

type TableOrderHeaderProps = {
  table: TableDoc;
};

export default function TableOrderHeader({ table }: TableOrderHeaderProps) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 py-3 backdrop-blur">
      <p className="text-xs font-medium text-muted-foreground">Campus Cafe</p>
      <h1 className="text-lg font-semibold tracking-tight">
        Meja {table.label} — {table.zone}
      </h1>
      <p className="text-xs text-muted-foreground">{table.capacity} orang</p>
    </header>
  );
}
