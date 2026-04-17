import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";

export const FLOOR_PLAN_WIDTH = 800;
export const FLOOR_PLAN_HEIGHT = 600;
export const FLOOR_PLAN_TABLE_WIDTH = 108;
export const FLOOR_PLAN_TABLE_HEIGHT = 64;

export type FloorPlanStatus = "available" | "booked" | "occupied" | "inactive";

export type FloorPlanTable = {
	_id: Id<"tables">;
	capacity: number;
	label: string;
	positionX: number;
	positionY: number;
	status: FloorPlanStatus;
	zone: string;
};

export function clampTablePosition(positionX: number, positionY: number) {
	return {
		positionX: Math.max(
			0,
			Math.min(positionX, FLOOR_PLAN_WIDTH - FLOOR_PLAN_TABLE_WIDTH),
		),
		positionY: Math.max(
			0,
			Math.min(positionY, FLOOR_PLAN_HEIGHT - FLOOR_PLAN_TABLE_HEIGHT),
		),
	};
}

export function getFloorPlanStatusClasses(status: FloorPlanStatus) {
	switch (status) {
		case "available":
			return {
				border: "stroke-primary",
				fill: "fill-primary/15",
				text: "text-primary",
			};
		case "booked":
		case "occupied":
			return {
				border: "stroke-destructive",
				fill: "fill-destructive/15",
				text: "text-destructive",
			};
		case "inactive":
			return {
				border: "stroke-border",
				fill: "fill-muted",
				text: "text-muted-foreground",
			};
	}
}
