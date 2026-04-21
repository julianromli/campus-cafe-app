import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DbCtx = MutationCtx | QueryCtx;

export type ReservationDurationHours = 1 | 2 | 3;
export type ReservationWindow = Pick<
	Doc<"reservations">,
	"durationHours" | "startTime"
>;
export type OperationalTableLike = Pick<Doc<"tables">, "_id" | "status">;

export const HOUR_MS = 60 * 60 * 1000;
export const DAY_MS = 24 * HOUR_MS;
export const MAX_RESERVATION_DURATION_MS = 3 * HOUR_MS;
export const CANCELLATION_CUTOFF_MS = 2 * HOUR_MS;
export const PENDING_EXPIRY_MS = 30 * 60 * 1000;
export const BUSINESS_TIMEZONE = "Asia/Jakarta";
export const BUSINESS_TIMEZONE_OFFSET_MS = 7 * HOUR_MS;
export const RESERVATION_OPEN_HOUR = 10;
export const RESERVATION_CLOSE_HOUR = 21;
export const MAX_ADVANCE_BOOKING_DAYS = 7;

type BusinessTimeParts = {
	dayIndex: number;
	hour: number;
	millisecond: number;
	minute: number;
	second: number;
};

function getBusinessTimeParts(timestamp: number): BusinessTimeParts {
	const localTimestamp = timestamp + BUSINESS_TIMEZONE_OFFSET_MS;
	const date = new Date(localTimestamp);

	return {
		dayIndex: Math.floor(localTimestamp / DAY_MS),
		hour: date.getUTCHours(),
		millisecond: date.getUTCMilliseconds(),
		minute: date.getUTCMinutes(),
		second: date.getUTCSeconds(),
	};
}

export function getReservationSearchWindowStart(
	referenceTimestamp: number,
): number {
	return Math.max(0, referenceTimestamp - MAX_RESERVATION_DURATION_MS);
}

export function getReservationEndTime(
	startTime: number,
	durationHours: ReservationDurationHours,
): number {
	return startTime + durationHours * HOUR_MS;
}

export function timeRangesOverlap(
	startA: number,
	endA: number,
	startB: number,
	endB: number,
): boolean {
	return startA < endB && startB < endA;
}

export function isReservationActiveAt(
	reservation: ReservationWindow,
	referenceTimestamp: number,
): boolean {
	return (
		reservation.startTime <= referenceTimestamp &&
		referenceTimestamp <
			getReservationEndTime(
				reservation.startTime,
				reservation.durationHours as ReservationDurationHours,
			)
	);
}

export function parseBusinessDateFilter(date: string): {
	dayIndex: number;
	end: number;
	start: number;
} {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
	if (!match) {
		throw new Error("Invalid date filter");
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	const utcMidnight = Date.UTC(year, month - 1, day);

	if (Number.isNaN(utcMidnight)) {
		throw new Error("Invalid date filter");
	}

	const start = utcMidnight - BUSINESS_TIMEZONE_OFFSET_MS;
	return {
		dayIndex: Math.floor(utcMidnight / DAY_MS),
		end: start + DAY_MS,
		start,
	};
}

export function getBusinessDayRangeForTimestamp(referenceTimestamp: number): {
	dayIndex: number;
	end: number;
	start: number;
} {
	const { dayIndex } = getBusinessTimeParts(referenceTimestamp);
	const start = dayIndex * DAY_MS - BUSINESS_TIMEZONE_OFFSET_MS;

	return {
		dayIndex,
		end: start + DAY_MS,
		start,
	};
}

export function validateReservationWindow(args: {
	durationHours: ReservationDurationHours;
	referenceTimestamp: number;
	startTime: number;
}) {
	if (!Number.isInteger(args.startTime) || args.startTime <= 0) {
		throw new Error("Reservation time is invalid");
	}

	if (args.startTime <= args.referenceTimestamp) {
		throw new Error("Reservation must be scheduled in the future");
	}

	const startParts = getBusinessTimeParts(args.startTime);
	const currentParts = getBusinessTimeParts(args.referenceTimestamp);
	const advanceDays = startParts.dayIndex - currentParts.dayIndex;

	if (advanceDays < 0 || advanceDays > MAX_ADVANCE_BOOKING_DAYS) {
		throw new Error("Reservation date must be within the next 7 days");
	}

	if (
		startParts.minute !== 0 ||
		startParts.second !== 0 ||
		startParts.millisecond !== 0
	) {
		throw new Error("Reservation time must start on the hour");
	}

	if (
		startParts.hour < RESERVATION_OPEN_HOUR ||
		startParts.hour > RESERVATION_CLOSE_HOUR
	) {
		throw new Error("Reservation time must be between 10:00 and 21:00");
	}
}

export function getOperationalTableStatus(
	status: Doc<"tables">["status"],
	hasActiveConfirmedReservation: boolean,
): Doc<"tables">["status"] {
	if (status === "inactive" || status === "occupied") {
		return status;
	}

	return hasActiveConfirmedReservation ? "booked" : "available";
}

export function applyOperationalTableStatus<T extends OperationalTableLike>(
	table: T,
	activeBookedTableIds: Set<Id<"tables">>,
): T {
	const nextStatus = getOperationalTableStatus(
		table.status,
		activeBookedTableIds.has(table._id),
	);
	if (nextStatus === table.status) {
		return table;
	}

	return {
		...table,
		status: nextStatus,
	};
}

export async function getActiveConfirmedTableIds(
	ctx: DbCtx,
	referenceTimestamp: number,
): Promise<Set<Id<"tables">>> {
	const candidates = await ctx.db
		.query("reservations")
		.withIndex("by_startTime", (query) =>
			query
				.gte("startTime", getReservationSearchWindowStart(referenceTimestamp))
				.lte("startTime", referenceTimestamp),
		)
		.collect();

	const tableIds = new Set<Id<"tables">>();
	for (const reservation of candidates) {
		if (
			reservation.status === "confirmed" &&
			isReservationActiveAt(reservation, referenceTimestamp)
		) {
			tableIds.add(reservation.tableId);
		}
	}

	return tableIds;
}
