import { api } from "@campus-cafe/backend/convex/_generated/api";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@campus-cafe/ui/components/card";
import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";

import FloorPlan from "@/components/reserve/floor-plan";
import type { FloorPlanTable } from "@/components/reserve/floor-plan-config";
import ReservationFormSheet from "@/components/reserve/reservation-form-sheet";

function isValidDateInput(value: string | null): value is string {
	return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export default function ReservePage() {
	const [searchParams] = useSearchParams();
	const tables = useQuery(api.tables.list);
	const [selectedTableId, setSelectedTableId] = useState<
		FloorPlanTable["_id"] | null
	>(null);

	const selectedTable = useMemo(
		() => tables?.find((table) => table._id === selectedTableId) ?? null,
		[selectedTableId, tables],
	);

	const requestedDate = searchParams.get("date");
	const initialDate = isValidDateInput(requestedDate)
		? requestedDate
		: undefined;

	return (
		<>
			<div className="grid gap-6 lg:grid-cols-[1fr_280px]">
				<Card>
					<CardHeader>
						<CardTitle>Reserve a Table</CardTitle>
						<CardDescription>
							Pick an available table, choose your schedule, then continue to
							Mayar to complete the booking payment.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{tables === undefined ? (
							<p className="text-muted-foreground text-sm">
								Loading table availability...
							</p>
						) : (
							<FloorPlan
								selectedTableId={selectedTableId ?? undefined}
								tables={tables}
								onTableSelect={(table) => {
									if (table.status === "available") {
										setSelectedTableId(table._id);
									}
								}}
							/>
						)}
					</CardContent>
				</Card>

				<Card size="sm">
					<CardHeader>
						<CardTitle>Legend</CardTitle>
						<CardDescription>
							Availability updates reactively as table status changes.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-3 text-muted-foreground text-sm">
						<div className="flex items-center gap-2">
							<span className="size-2 rounded-full bg-primary" />
							Available tables can be selected.
						</div>
						<div className="flex items-center gap-2">
							<span className="size-2 rounded-full bg-destructive" />
							Booked and occupied tables are visible but locked.
						</div>
						<div className="rounded-md border border-border bg-muted/30 p-3 text-xs leading-6">
							Reservations stay pending until the payment webhook confirms them
							and the table status changes to booked.
						</div>
					</CardContent>
				</Card>
			</div>

			<ReservationFormSheet
				initialDate={initialDate}
				open={selectedTable !== null}
				table={selectedTable}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedTableId(null);
					}
				}}
			/>
		</>
	);
}
