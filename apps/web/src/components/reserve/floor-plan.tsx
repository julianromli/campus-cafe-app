import { cn } from "@campus-cafe/ui/lib/utils";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useMemo, useRef, useState } from "react";

import {
	clampTablePosition,
	FLOOR_PLAN_HEIGHT,
	FLOOR_PLAN_TABLE_HEIGHT,
	FLOOR_PLAN_TABLE_WIDTH,
	FLOOR_PLAN_WIDTH,
	type FloorPlanStatus,
	type FloorPlanTable,
	getFloorPlanStatusClasses,
} from "./floor-plan-config";

type DragState = {
	startClientX: number;
	startClientY: number;
	startX: number;
	startY: number;
	tableId: string;
};

type FloorPlanProps = {
	draggable?: boolean;
	onTableMove?: (
		table: FloorPlanTable,
		nextPosition: { positionX: number; positionY: number },
	) => void;
	onTableSelect?: (table: FloorPlanTable) => void;
	selectableStatuses?: FloorPlanStatus[];
	selectedTableId?: string;
	showInactive?: boolean;
	tables: FloorPlanTable[];
};

export default function FloorPlan({
	draggable = false,
	onTableMove,
	onTableSelect,
	selectableStatuses = ["available"],
	selectedTableId,
	showInactive = false,
	tables,
}: FloorPlanProps) {
	const svgRef = useRef<SVGSVGElement | null>(null);
	const [dragState, setDragState] = useState<DragState | null>(null);
	const [previewPositions, setPreviewPositions] = useState<
		Record<string, { positionX: number; positionY: number }>
	>({});

	const visibleTables = useMemo(
		() => tables.filter((table) => showInactive || table.status !== "inactive"),
		[showInactive, tables],
	);

	const getRenderedPosition = (table: FloorPlanTable) =>
		previewPositions[table._id] ?? {
			positionX: table.positionX,
			positionY: table.positionY,
		};

	const updatePreviewPosition = (
		table: FloorPlanTable,
		event: ReactPointerEvent<SVGSVGElement>,
	) => {
		if (!dragState || dragState.tableId !== table._id || !svgRef.current) {
			return;
		}

		const rect = svgRef.current.getBoundingClientRect();
		const scaleX = FLOOR_PLAN_WIDTH / rect.width;
		const scaleY = FLOOR_PLAN_HEIGHT / rect.height;
		const deltaX = (event.clientX - dragState.startClientX) * scaleX;
		const deltaY = (event.clientY - dragState.startClientY) * scaleY;

		setPreviewPositions((current) => ({
			...current,
			[table._id]: clampTablePosition(
				dragState.startX + deltaX,
				dragState.startY + deltaY,
			),
		}));
	};

	return (
		<div className="w-full overflow-x-auto rounded-lg border border-border bg-card p-3">
			<svg
				ref={svgRef}
				className="min-w-[720px]"
				viewBox={`0 0 ${FLOOR_PLAN_WIDTH} ${FLOOR_PLAN_HEIGHT}`}
				onPointerMove={(event) => {
					if (!dragState) {
						return;
					}

					const table = visibleTables.find(
						(entry) => entry._id === dragState.tableId,
					);
					if (table) {
						updatePreviewPosition(table, event);
					}
				}}
				onPointerUp={() => {
					if (!dragState) {
						return;
					}

					const table = visibleTables.find(
						(entry) => entry._id === dragState.tableId,
					);
					const preview = previewPositions[dragState.tableId];

					if (table && preview && onTableMove) {
						onTableMove(table, preview);
					}

					setDragState(null);
					setPreviewPositions((current) => {
						const next = { ...current };
						delete next[dragState.tableId];
						return next;
					});
				}}
			>
				<rect
					className="fill-background stroke-border"
					height={FLOOR_PLAN_HEIGHT}
					width={FLOOR_PLAN_WIDTH}
					x={0}
					y={0}
				/>
				{visibleTables.map((table) => {
					const position = getRenderedPosition(table);
					const statusClasses = getFloorPlanStatusClasses(table.status);
					const isSelected = selectedTableId === table._id;
					const isSelectable = selectableStatuses.includes(table.status);
					const isClickable = draggable || (onTableSelect && isSelectable);

					return (
						<g
							key={table._id}
							className={cn(isClickable ? "cursor-pointer" : "cursor-default")}
							onClick={() => {
								if (
									!dragState &&
									onTableSelect &&
									(draggable || isSelectable)
								) {
									onTableSelect(table);
								}
							}}
							onPointerDown={(event) => {
								if (!draggable) {
									return;
								}

								event.preventDefault();
								setDragState({
									startClientX: event.clientX,
									startClientY: event.clientY,
									startX: position.positionX,
									startY: position.positionY,
									tableId: table._id,
								});
							}}
						>
							<title>{`${table.label} • ${table.zone} • Kapasitas ${table.capacity}`}</title>
							<rect
								className={cn(
									statusClasses.fill,
									statusClasses.border,
									isSelected ? "stroke-[3]" : "stroke-[2]",
								)}
								height={FLOOR_PLAN_TABLE_HEIGHT}
								rx={12}
								width={FLOOR_PLAN_TABLE_WIDTH}
								x={position.positionX}
								y={position.positionY}
							/>
							<text
								className="fill-current font-semibold text-[14px] text-foreground"
								textAnchor="middle"
								x={position.positionX + FLOOR_PLAN_TABLE_WIDTH / 2}
								y={position.positionY + 24}
							>
								{table.label}
							</text>
							<text
								className="fill-current text-[11px] text-muted-foreground"
								textAnchor="middle"
								x={position.positionX + FLOOR_PLAN_TABLE_WIDTH / 2}
								y={position.positionY + 42}
							>
								{`${table.capacity} seats • ${table.zone}`}
							</text>
						</g>
					);
				})}
			</svg>
		</div>
	);
}
