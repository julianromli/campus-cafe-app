import { api } from "@campus-cafe/backend/convex/_generated/api";
import { Button } from "@campus-cafe/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@campus-cafe/ui/components/card";
import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import ConfirmDialog from "@/components/confirm-dialog";
import FloorPlan from "@/components/reserve/floor-plan";
import type { FloorPlanTable } from "@/components/reserve/floor-plan-config";
import SidePanel from "@/components/side-panel";
import { FloorPlanSkeleton } from "@/components/skeletons/floor-plan-skeleton";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";

type StaffView = "floor" | "list";
type StatusFilter = "all" | "pending" | "confirmed" | "cancelled";

function toDateInputValue(date: Date): string {
	const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
	return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function formatDateTime(timestamp: number) {
	return new Intl.DateTimeFormat("id-ID", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(timestamp));
}

function getStatusClasses(status: "pending" | "confirmed" | "cancelled") {
	switch (status) {
		case "confirmed":
			return "border-primary/30 bg-primary/10 text-primary";
		case "cancelled":
			return "border-destructive/30 bg-destructive/10 text-destructive";
		case "pending":
			return "border-border bg-muted text-muted-foreground";
	}
}

function getStatusLabel(status: "pending" | "confirmed" | "cancelled") {
	switch (status) {
		case "pending":
			return "Pending";
		case "confirmed":
			return "Confirmed";
		case "cancelled":
			return "Cancelled";
	}
}

export default function StaffReservationsPage() {
	const referenceStartTimestamp = useMemo(() => {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		return today.getTime();
	}, []);

	const [activeView, setActiveView] = useState<StaffView>("floor");
	const [dateFilter, setDateFilter] = useState("");
	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [tableFilter, setTableFilter] = useState<string>("all");
	const [selectedTableId, setSelectedTableId] = useState<
		FloorPlanTable["_id"] | null
	>(null);
	const [releaseTableId, setReleaseTableId] = useState<
		FloorPlanTable["_id"] | null
	>(null);
	const [pendingTableActionId, setPendingTableActionId] = useState<
		FloorPlanTable["_id"] | null
	>(null);

	const tables = useQuery(api.tables.list);
	const reservations = useQuery(api.reservations.listForBoard, {
		...(dateFilter ? { date: dateFilter } : {}),
		referenceStartTimestamp,
	});
	const markOccupied = useMutation(api.tables.markOccupied);
	const releaseTable = useMutation(api.tables.release);

	const filteredReservations = useMemo(() => {
		return (reservations ?? []).filter((reservation) => {
			if (statusFilter !== "all" && reservation.status !== statusFilter) {
				return false;
			}

			if (tableFilter !== "all" && reservation.tableId !== tableFilter) {
				return false;
			}

			return true;
		});
	}, [reservations, statusFilter, tableFilter]);

	const selectedTable = useMemo(
		() => tables?.find((table) => table._id === selectedTableId) ?? null,
		[selectedTableId, tables],
	);

	const selectedReservation = useMemo(() => {
		if (!selectedTableId) {
			return null;
		}

		return (
			reservations?.find(
				(reservation) =>
					reservation.tableId === selectedTableId &&
					reservation.status !== "cancelled",
			) ?? null
		);
	}, [reservations, selectedTableId]);

	const handleMarkOccupied = async (tableId: FloorPlanTable["_id"]) => {
		setPendingTableActionId(tableId);
		try {
			await markOccupied({ id: tableId });
			toast.success("Table marked as occupied");
		} catch (error) {
			toast.error(
				error instanceof Error
					? error.message
					: "Failed to update table status",
			);
		} finally {
			setPendingTableActionId(null);
		}
	};

	const handleReleaseTable = async (tableId: FloorPlanTable["_id"]) => {
		setPendingTableActionId(tableId);
		try {
			await releaseTable({ id: tableId });
			toast.success("Table released to available");
			setReleaseTableId(null);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to release table",
			);
		} finally {
			setPendingTableActionId(null);
		}
	};

	return (
		<>
			<div className="grid gap-6">
				<Card>
					<CardHeader>
						<CardTitle>Reservation Operations Board</CardTitle>
						<CardDescription>
							Monitor today and upcoming reservations, then update table state
							as guests arrive or leave.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<div className="flex flex-wrap gap-2">
							<Button
								variant={activeView === "floor" ? "default" : "outline"}
								onClick={() => setActiveView("floor")}
							>
								Floor Plan View
							</Button>
							<Button
								variant={activeView === "list" ? "default" : "outline"}
								onClick={() => setActiveView("list")}
							>
								Reservation List View
							</Button>
						</div>

						<div className="grid gap-3 md:grid-cols-[180px_180px_1fr]">
							<div className="flex flex-col gap-2">
								<label
									className="font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]"
									htmlFor="reservation-date-filter"
								>
									Date
								</label>
								<input
									id="reservation-date-filter"
									className="h-8 rounded-none border border-input bg-transparent px-2.5 text-xs"
									type="date"
									value={dateFilter}
									onChange={(event) => setDateFilter(event.target.value)}
								/>
							</div>
							<div className="flex flex-col gap-2">
								<label
									className="font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]"
									htmlFor="reservation-status-filter"
								>
									Status
								</label>
								<select
									id="reservation-status-filter"
									className="h-8 rounded-none border border-input bg-transparent px-2.5 text-xs"
									value={statusFilter}
									onChange={(event) =>
										setStatusFilter(event.target.value as StatusFilter)
									}
								>
									<option value="all">All statuses</option>
									<option value="pending">Pending</option>
									<option value="confirmed">Confirmed</option>
									<option value="cancelled">Cancelled</option>
								</select>
							</div>
							<div className="flex flex-col gap-2">
								<label
									className="font-medium text-muted-foreground text-xs uppercase tracking-[0.18em]"
									htmlFor="reservation-table-filter"
								>
									Table
								</label>
								<select
									id="reservation-table-filter"
									className="h-8 rounded-none border border-input bg-transparent px-2.5 text-xs"
									value={tableFilter}
									onChange={(event) => setTableFilter(event.target.value)}
								>
									<option value="all">All tables</option>
									{(tables ?? []).map((table) => (
										<option key={table._id} value={table._id}>
											{table.label}
										</option>
									))}
								</select>
							</div>
						</div>
					</CardContent>
				</Card>

				{activeView === "floor" ? (
					<Card>
						<CardHeader>
							<CardTitle>Live Floor Plan</CardTitle>
							<CardDescription>
								Booked and occupied tables are selectable so staff can inspect
								reservations and update state quickly.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex flex-col gap-4">
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
						</CardContent>
					</Card>
				) : (
					<Card>
						<CardHeader>
							<CardTitle>Reservation List</CardTitle>
							<CardDescription>
								View operational reservation details with customer context and
								quick actions.
							</CardDescription>
						</CardHeader>
						<CardContent>
							{reservations === undefined ? (
								<TableSkeleton columns={7} rows={6} />
							) : filteredReservations.length === 0 ? (
								<p className="text-muted-foreground text-sm">
									No reservations match the current filters.
								</p>
							) : (
								<div className="overflow-x-auto">
									<table className="w-full border-collapse text-sm">
										<thead>
											<tr className="border-border border-b text-left text-muted-foreground text-xs uppercase tracking-[0.18em]">
												<th className="px-2 py-3">Table</th>
												<th className="px-2 py-3">Customer</th>
												<th className="px-2 py-3">Date/Time</th>
												<th className="px-2 py-3">Duration</th>
												<th className="px-2 py-3">Guests</th>
												<th className="px-2 py-3">Status</th>
												<th className="px-2 py-3">Actions</th>
											</tr>
										</thead>
										<tbody>
											{filteredReservations.map((reservation) => (
												<tr
													key={reservation._id}
													className="border-border border-b"
												>
													<td className="px-2 py-3">
														<div className="font-medium">
															{reservation.table.label}
														</div>
														<div className="text-muted-foreground text-xs">
															{reservation.table.zone}
														</div>
													</td>
													<td className="px-2 py-3">
														<div className="font-medium">
															{reservation.customer.name}
														</div>
														<div className="text-muted-foreground text-xs">
															{reservation.customer.email}
														</div>
													</td>
													<td className="px-2 py-3">
														{formatDateTime(reservation.startTime)}
													</td>
													<td className="px-2 py-3">
														{reservation.durationHours} hour(s)
													</td>
													<td className="px-2 py-3">
														{reservation.guestCount}
													</td>
													<td className="px-2 py-3">
														<span
															className={`rounded-full border px-2 py-1 text-[11px] ${getStatusClasses(reservation.status)}`}
														>
															{getStatusLabel(reservation.status)}
														</span>
													</td>
													<td className="px-2 py-3">
														<div className="flex flex-wrap gap-2">
															<Button
																size="sm"
																variant="outline"
																onClick={() =>
																	setSelectedTableId(reservation.tableId)
																}
															>
																View
															</Button>
															{reservation.table.status === "booked" ? (
																<Button
																	disabled={
																		pendingTableActionId === reservation.tableId
																	}
																	size="sm"
																	variant="outline"
																	onClick={() =>
																		void handleMarkOccupied(reservation.tableId)
																	}
																>
																	Mark occupied
																</Button>
															) : null}
															{reservation.table.status === "booked" ||
															reservation.table.status === "occupied" ? (
																<Button
																	disabled={
																		pendingTableActionId === reservation.tableId
																	}
																	size="sm"
																	variant="outline"
																	onClick={() =>
																		setReleaseTableId(reservation.tableId)
																	}
																>
																	Release
																</Button>
															) : null}
														</div>
													</td>
												</tr>
											))}
										</tbody>
									</table>
								</div>
							)}
						</CardContent>
					</Card>
				)}
			</div>

			<SidePanel
				description="Inspect the reservation currently associated with this table and apply the next operational state update."
				footer={
					selectedTable ? (
						<div className="flex flex-wrap justify-end gap-2">
							<Button
								variant="outline"
								onClick={() => setSelectedTableId(null)}
							>
								Close
							</Button>
							{selectedTable.status === "booked" ? (
								<Button
									disabled={pendingTableActionId === selectedTable._id}
									onClick={() => void handleMarkOccupied(selectedTable._id)}
								>
									{pendingTableActionId === selectedTable._id
										? "Updating..."
										: "Mark occupied"}
								</Button>
							) : null}
							{selectedTable.status === "booked" ||
							selectedTable.status === "occupied" ? (
								<Button
									disabled={pendingTableActionId === selectedTable._id}
									variant="outline"
									onClick={() => setReleaseTableId(selectedTable._id)}
								>
									Release table
								</Button>
							) : null}
						</div>
					) : null
				}
				open={selectedTable !== null}
				title={
					selectedTable ? `${selectedTable.label} details` : "Table details"
				}
				onOpenChange={(open) => {
					if (!open) {
						setSelectedTableId(null);
					}
				}}
			>
				{selectedTable ? (
					<div className="flex flex-col gap-4">
						<div className="grid gap-3 rounded-md border border-border p-4 text-muted-foreground text-sm">
							<div>
								<span className="font-medium text-foreground">Zone:</span>{" "}
								{selectedTable.zone}
							</div>
							<div>
								<span className="font-medium text-foreground">Capacity:</span>{" "}
								{selectedTable.capacity} guests
							</div>
							<div>
								<span className="font-medium text-foreground">Status:</span>{" "}
								{selectedTable.status}
							</div>
						</div>

						{selectedReservation ? (
							<div className="grid gap-3 rounded-md border border-border p-4 text-muted-foreground text-sm">
								<div className="font-medium text-foreground text-sm">
									Reservation details
								</div>
								<div>
									<span className="font-medium text-foreground">Customer:</span>{" "}
									{selectedReservation.customer.name}
								</div>
								<div>
									<span className="font-medium text-foreground">Email:</span>{" "}
									{selectedReservation.customer.email}
								</div>
								{selectedReservation.customer.phone ? (
									<div>
										<span className="font-medium text-foreground">Phone:</span>{" "}
										{selectedReservation.customer.phone}
									</div>
								) : null}
								<div>
									<span className="font-medium text-foreground">Schedule:</span>{" "}
									{formatDateTime(selectedReservation.startTime)}
								</div>
								<div>
									<span className="font-medium text-foreground">Duration:</span>{" "}
									{selectedReservation.durationHours} hour(s)
								</div>
								<div>
									<span className="font-medium text-foreground">Guests:</span>{" "}
									{selectedReservation.guestCount}
								</div>
								<div>
									<span className="font-medium text-foreground">Status:</span>{" "}
									{getStatusLabel(selectedReservation.status)}
								</div>
							</div>
						) : (
							<div className="rounded-md border border-border p-4 text-muted-foreground text-sm">
								No active reservation is currently attached to this table in the
								selected time window.
							</div>
						)}
					</div>
				) : null}
			</SidePanel>

			<ConfirmDialog
				confirmLabel="Release table"
				description="Release this table back to available? This action updates the live floor plan immediately."
				open={releaseTableId !== null}
				pending={pendingTableActionId === releaseTableId}
				title="Release table"
				onConfirm={async () => {
					if (!releaseTableId) {
						return;
					}

					await handleReleaseTable(releaseTableId);
				}}
				onOpenChange={(open) => {
					if (!open) {
						setReleaseTableId(null);
					}
				}}
			/>
		</>
	);
}
