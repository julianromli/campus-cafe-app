import type { Doc } from "@campus-cafe/backend/convex/_generated/dataModel";

type TableDoc = Doc<"tables">;

type TableOrderHeaderProps = {
	table: TableDoc;
};

export default function TableOrderHeader({ table }: TableOrderHeaderProps) {
	return (
		<header className="sticky top-0 z-30 border-border border-b bg-background/95 py-3 backdrop-blur">
			<p className="font-medium text-muted-foreground text-xs">Campus Cafe</p>
			<h1 className="font-semibold text-lg tracking-tight">
				Meja {table.label} — {table.zone}
			</h1>
			<p className="text-muted-foreground text-xs">{table.capacity} orang</p>
		</header>
	);
}
