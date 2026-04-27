import { api } from "@campus-cafe/backend/convex/_generated/api";
import { Button } from "@campus-cafe/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@campus-cafe/ui/components/card";
import { Input } from "@campus-cafe/ui/components/input";
import { Label } from "@campus-cafe/ui/components/label";
import { Skeleton } from "@campus-cafe/ui/components/skeleton";
import { useMutation, useQuery } from "convex/react";
import { PlusIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import FloorPlan from "@/components/reserve/floor-plan";
import type { FloorPlanTable } from "@/components/reserve/floor-plan-config";
import SidePanel from "@/components/side-panel";
import { FloorPlanSkeleton } from "@/components/skeletons/floor-plan-skeleton";
import { usePanelRole } from "@/hooks/use-panel-role";
import { canWrite } from "@/lib/permissions";

type TableFormState = {
	capacity: string;
	label: string;
	positionX: string;
	positionY: string;
	zone: string;
};

const defaultFormState: TableFormState = {
	capacity: "4",
	label: "",
	positionX: "40",
	positionY: "40",
	zone: "Indoor",
};

function getStatusLabel(status: FloorPlanTable["status"]) {
	switch (status) {
		case "available":
			return "Available";
		case "booked":
			return "Booked";
		case "occupied":
			return "Occupied";
		case "inactive":
			return "Inactive";
	}
}

function getStatusClasses(status: FloorPlanTable["status"]) {
	switch (status) {
		case "available":
			return "border-primary/30 bg-primary/10 text-primary";
		case "booked":
		case "occupied":
			return "border-destructive/30 bg-destructive/10 text-destructive";
		case "inactive":
			return "border-border bg-muted text-muted-foreground";
	}
}

function toFormState(table?: FloorPlanTable): TableFormState {
	if (!table) {
		return defaultFormState;
	}

	return {
		capacity: String(table.capacity),
		label: table.label,
		positionX: String(Math.round(table.positionX)),
		positionY: String(Math.round(table.positionY)),
		zone: table.zone,
	};
}

export default function PanelTablesPage() {
	const role = usePanelRole();
	const canModify = role ? canWrite(role, "tables") : false;

	const tables = useQuery(api.tables.listAll);
	const createTable = useMutation(api.tables.create);
	const updateTable = useMutation(api.tables.update);
	const setTableStatus = useMutation(api.tables.setStatus);
	const deleteTable = useMutation(api.tables.remove);

	const [formState, setFormState] = useState<TableFormState>(defaultFormState);
	const [panelMode, setPanelMode] = useState<"create" | "edit">("create");
	const [panelOpen, setPanelOpen] = useState(false);
	const [selectedTableId, setSelectedTableId] = useState<string | undefined>(
		undefined,
	);
	const [submitting, setSubmitting] = useState(false);

	const selectedTable = useMemo(
		() => tables?.find((table) => table._id === selectedTableId),
		[selectedTableId, tables],
	);

	const openCreatePanel = () => {
		setPanelMode("create");
		setSelectedTableId(undefined);
		setFormState(defaultFormState);
		setPanelOpen(true);
	};

	const openEditPanel = (table: FloorPlanTable) => {
		setPanelMode("edit");
		setSelectedTableId(table._id);
		setFormState(toFormState(table));
		setPanelOpen(true);
	};

	const handleSubmit = async () => {
		setSubmitting(true);

		try {
			const payload = {
				capacity: Number(formState.capacity),
				label: formState.label,
				positionX: Number(formState.positionX),
				positionY: Number(formState.positionY),
				zone: formState.zone,
			};

			if (panelMode === "create") {
				await createTable(payload);
				toast.success("Table created");
			} else if (selectedTable) {
				await updateTable({
					...payload,
					id: selectedTable._id,
				});
				toast.success("Table updated");
			}

			setPanelOpen(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to save table",
			);
		} finally {
			setSubmitting(false);
		}
	};

	const handleMove = async (
		table: FloorPlanTable,
		nextPosition: { positionX: number; positionY: number },
	) => {
		try {
			await updateTable({
				id: table._id,
				positionX: Math.round(nextPosition.positionX),
				positionY: Math.round(nextPosition.positionY),
			});
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Failed to move table",
			);
		}
	};

	const summary = useMemo(() => {
		const allTables = tables ?? [];
		return {
			active: allTables.filter((table) => table.status !== "inactive").length,
			inactive: allTables.filter((table) => table.status === "inactive").length,
			total: allTables.length,
		};
	}, [tables]);

	return (
		<>
			<div className="grid gap-6 xl:grid-cols-[340px_1fr]">
				<Card>
					<CardHeader>
						<CardTitle>Table Inventory</CardTitle>
						<CardDescription>
							Manage labels, capacity, and activation status before placing
							tables on the floor canvas.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<div className="grid grid-cols-3 gap-2">
							<div className="rounded-md border border-border p-3">
								<div className="font-semibold text-lg">{summary.total}</div>
								<div className="text-muted-foreground text-xs">Total</div>
							</div>
							<div className="rounded-md border border-border p-3">
								<div className="font-semibold text-lg">{summary.active}</div>
								<div className="text-muted-foreground text-xs">Active</div>
							</div>
							<div className="rounded-md border border-border p-3">
								<div className="font-semibold text-lg">{summary.inactive}</div>
								<div className="text-muted-foreground text-xs">Inactive</div>
							</div>
						</div>

						<Button
							onClick={openCreatePanel}
							disabled={!canModify}
							title={
								!canModify ? "Hanya admin yang dapat melakukan ini" : undefined
							}
						>
							<PlusIcon data-icon="inline-start" />
							Add Table
						</Button>

						<div className="flex flex-col gap-3">
							{tables === undefined ? (
								<div className="flex flex-col gap-3">
									{Array.from({ length: 5 }).map((_, i) => (
										<Skeleton className="h-24 w-full rounded-md" key={i} />
									))}
								</div>
							) : tables.length === 0 ? (
								<p className="text-muted-foreground text-sm">
									No tables created yet.
								</p>
							) : (
								tables.map((table) => (
									<div
										key={table._id}
										className="flex flex-col gap-3 rounded-md border border-border p-3"
									>
										<div className="flex items-start justify-between gap-3">
											<div className="flex flex-col gap-1">
												<div className="font-medium">{table.label}</div>
												<div className="text-muted-foreground text-xs">
													{table.zone} • {table.capacity} seats
												</div>
											</div>
											<span
												className={`rounded-full border px-2 py-1 text-[11px] ${getStatusClasses(table.status)}`}
											>
												{getStatusLabel(table.status)}
											</span>
										</div>
										<div className="flex flex-wrap gap-2">
											<Button
												size="sm"
												variant="outline"
												onClick={() => openEditPanel(table)}
												disabled={!canModify}
												title={
													!canModify
														? "Hanya admin yang dapat melakukan ini"
														: undefined
												}
											>
												Edit
											</Button>
											<Button
												size="sm"
												variant="outline"
												onClick={async () => {
													try {
														await setTableStatus({
															id: table._id,
															status:
																table.status === "inactive"
																	? "available"
																	: "inactive",
														});
														toast.success("Table status updated");
													} catch (error) {
														toast.error(
															error instanceof Error
																? error.message
																: "Failed to update table status",
														);
													}
												}}
												disabled={!canModify}
												title={
													!canModify
														? "Hanya admin yang dapat melakukan ini"
														: undefined
												}
											>
												{table.status === "inactive"
													? "Activate"
													: "Deactivate"}
											</Button>
											<Button
												size="sm"
												variant="destructive"
												onClick={async () => {
													if (
														!window.confirm(
															`Delete ${table.label}? This only works when there are no confirmed reservations.`,
														)
													) {
														return;
													}

													try {
														await deleteTable({ id: table._id });
														toast.success("Table deleted");
														if (selectedTableId === table._id) {
															setSelectedTableId(undefined);
														}
													} catch (error) {
														toast.error(
															error instanceof Error
																? error.message
																: "Failed to delete table",
														);
													}
												}}
												disabled={!canModify}
												title={
													!canModify
														? "Hanya admin yang dapat melakukan ini"
														: undefined
												}
											>
												Delete
											</Button>
										</div>
									</div>
								))
							)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Floor Plan Editor</CardTitle>
						<CardDescription>
							Drag tables to update their coordinates. The same geometry
							contract is reused by the customer reserve view.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{tables === undefined ? (
							<FloorPlanSkeleton />
						) : (
							<FloorPlan
								draggable={canModify}
								selectedTableId={selectedTableId}
								showInactive
								tables={tables}
								onTableMove={handleMove}
								onTableSelect={openEditPanel}
							/>
						)}
						<div className="flex flex-wrap gap-3 text-muted-foreground text-xs">
							<span className="flex items-center gap-2">
								<span className="size-2 rounded-full bg-primary" />
								Available
							</span>
							<span className="flex items-center gap-2">
								<span className="size-2 rounded-full bg-destructive" />
								Booked / Occupied
							</span>
							<span className="flex items-center gap-2">
								<span className="size-2 rounded-full bg-muted-foreground" />
								Inactive
							</span>
						</div>
					</CardContent>
				</Card>
			</div>

			<SidePanel
				description="Fill in the table details and coordinates used by both the admin editor and the customer reservation map."
				footer={
					<div className="flex justify-end gap-2">
						<Button variant="outline" onClick={() => setPanelOpen(false)}>
							Cancel
						</Button>
						<Button disabled={submitting || !canModify} onClick={handleSubmit}>
							{submitting
								? "Saving..."
								: panelMode === "create"
									? "Create table"
									: "Save changes"}
						</Button>
					</div>
				}
				open={panelOpen}
				title={
					panelMode === "create"
						? "Add table"
						: `Edit ${selectedTable?.label ?? "table"}`
				}
				onOpenChange={setPanelOpen}
			>
				<div className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="table-label">Label</Label>
						<Input
							id="table-label"
							value={formState.label}
							onChange={(event) =>
								setFormState((current) => ({
									...current,
									label: event.target.value,
								}))
							}
						/>
					</div>
					<div className="flex flex-col gap-2">
						<Label htmlFor="table-zone">Zone</Label>
						<Input
							id="table-zone"
							value={formState.zone}
							onChange={(event) =>
								setFormState((current) => ({
									...current,
									zone: event.target.value,
								}))
							}
						/>
					</div>
					<div className="grid grid-cols-3 gap-3">
						<div className="flex flex-col gap-2">
							<Label htmlFor="table-capacity">Capacity</Label>
							<Input
								id="table-capacity"
								min={1}
								type="number"
								value={formState.capacity}
								onChange={(event) =>
									setFormState((current) => ({
										...current,
										capacity: event.target.value,
									}))
								}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="table-x">Position X</Label>
							<Input
								id="table-x"
								min={0}
								type="number"
								value={formState.positionX}
								onChange={(event) =>
									setFormState((current) => ({
										...current,
										positionX: event.target.value,
									}))
								}
							/>
						</div>
						<div className="flex flex-col gap-2">
							<Label htmlFor="table-y">Position Y</Label>
							<Input
								id="table-y"
								min={0}
								type="number"
								value={formState.positionY}
								onChange={(event) =>
									setFormState((current) => ({
										...current,
										positionY: event.target.value,
									}))
								}
							/>
						</div>
					</div>
				</div>
			</SidePanel>
		</>
	);
}
