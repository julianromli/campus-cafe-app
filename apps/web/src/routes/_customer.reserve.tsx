import { api } from "@campus-cafe/backend/convex/_generated/api";
import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@campus-cafe/ui/components/card";
import { useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { MapPin, Info } from "lucide-react";

import FloorPlan from "@/components/reserve/floor-plan";
import type { FloorPlanTable } from "@/components/reserve/floor-plan-config";
import ReservationFormSheet from "@/components/reserve/reservation-form-sheet";
import { FloorPlanSkeleton } from "@/components/skeletons/floor-plan-skeleton";

function isValidDateInput(value: string | null): value is string {
	return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export default function ReservePage() {
	const [searchParams] = useSearchParams();
	const [referenceTimestamp, setReferenceTimestamp] = useState(() => Date.now());
	const tables = useQuery(api.tables.list, { referenceTimestamp });
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
	const requestedEventId = searchParams.get("eventId");
	const eventId = requestedEventId
		? (requestedEventId as Id<"events">)
		: undefined;

	useEffect(() => {
		const updateReferenceTimestamp = () => setReferenceTimestamp(Date.now());
		updateReferenceTimestamp();

		const interval = window.setInterval(updateReferenceTimestamp, 10_000);
		return () => window.clearInterval(interval);
	}, []);

	return (
		<>
			<div className="flex flex-col gap-6 sm:gap-8 pb-8">
				<div className="flex flex-col gap-1">
					<h1 className="font-heading text-3xl font-semibold tracking-tight">
						Reserve a Table
					</h1>
					<p className="text-muted-foreground">
						Secure your favorite spot in the cafe
					</p>
				</div>

				<div className="grid gap-6 lg:grid-cols-[1fr_280px]">
					<Card className="overflow-hidden rounded-[2rem] border-none bg-muted/30 shadow-none">
						<CardHeader className="border-b border-border/50 bg-background/50 px-6 py-4 backdrop-blur-sm">
							<CardTitle className="flex items-center gap-2 text-lg">
								<MapPin className="size-5 text-primary" />
								Floor Plan
							</CardTitle>
							<CardDescription>
								Select any active table, then check slot availability in the
								reservation panel
							</CardDescription>
						</CardHeader>
						<CardContent className="p-4 sm:p-6 overflow-x-auto">
							<div className="min-w-[600px] flex justify-center">
								{tables === undefined ? (
									<FloorPlanSkeleton />
								) : (
									<FloorPlan
										selectableStatuses={["available", "booked", "occupied"]}
										selectedTableId={selectedTableId ?? undefined}
										tables={tables}
										onTableSelect={(table) => setSelectedTableId(table._id)}
									/>
								)}
							</div>
						</CardContent>
					</Card>

					<div className="flex flex-col gap-4">
						<Card className="rounded-[2rem] border-none bg-primary/5 shadow-none">
							<CardHeader className="pb-3 pt-5">
								<CardTitle className="flex items-center gap-2 text-base">
									<Info className="size-4 text-primary" />
									Legend
								</CardTitle>
							</CardHeader>
							<CardContent className="flex flex-col gap-4 text-sm">
								<div className="flex items-center gap-3">
									<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/20">
										<span className="size-3 rounded-full bg-primary" />
									</div>
									<span className="text-foreground font-medium">Available</span>
								</div>
								<div className="flex items-center gap-3">
									<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-destructive/20">
										<span className="size-3 rounded-full bg-destructive" />
									</div>
									<span className="text-foreground font-medium">
										Booked / Occupied now
									</span>
								</div>
								<div className="mt-2 rounded-xl bg-background p-4 text-xs leading-relaxed text-muted-foreground shadow-sm">
									Current floor status is informational. The exact reservation
									slot is checked after you choose date, time, and duration.
									Checkout now happens in-app with a QRIS countdown, so unpaid
									holds can expire automatically.
								</div>
							</CardContent>
						</Card>
					</div>
				</div>
			</div>

			<ReservationFormSheet
				eventId={eventId}
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
