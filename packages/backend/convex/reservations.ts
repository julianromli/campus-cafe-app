import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import {
	internalMutation,
	internalQuery,
	mutation,
	query,
} from "./_generated/server";
import { requireAuth, requireRole } from "./lib/auth";

const durationHoursValidator = v.union(
	v.literal(1),
	v.literal(2),
	v.literal(3),
);
const reservationStatusValidator = v.union(
	v.literal("pending"),
	v.literal("confirmed"),
	v.literal("cancelled"),
);
const tableStatusValidator = v.union(
	v.literal("available"),
	v.literal("booked"),
	v.literal("occupied"),
	v.literal("inactive"),
);

const tableSummaryValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("tables"),
	capacity: v.number(),
	createdAt: v.number(),
	label: v.string(),
	lastReleasedAt: v.optional(v.number()),
	lastReleasedBy: v.optional(v.id("users")),
	positionX: v.number(),
	positionY: v.number(),
	status: tableStatusValidator,
	zone: v.string(),
});

const reservationWithTableValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("reservations"),
	confirmationCode: v.optional(v.string()),
	createdAt: v.number(),
	durationHours: durationHoursValidator,
	eventId: v.optional(v.id("events")),
	guestCount: v.number(),
	paymentRef: v.optional(v.string()),
	startTime: v.number(),
	status: reservationStatusValidator,
	table: tableSummaryValidator,
	tableId: v.id("tables"),
	userId: v.id("users"),
});

const reservationCreateResultValidator = v.object({
	confirmationCode: v.string(),
	reservationId: v.id("reservations"),
});

const paymentContextValidator = v.object({
	confirmationCode: v.optional(v.string()),
	durationHours: durationHoursValidator,
	guestCount: v.number(),
	reservationId: v.id("reservations"),
	startTime: v.number(),
	table: tableSummaryValidator,
	userId: v.id("users"),
});

const reservationCustomerValidator = v.object({
	email: v.string(),
	name: v.string(),
	phone: v.optional(v.string()),
	userId: v.id("users"),
});

const reservationBoardItemValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("reservations"),
	confirmationCode: v.optional(v.string()),
	createdAt: v.number(),
	customer: reservationCustomerValidator,
	durationHours: durationHoursValidator,
	eventId: v.optional(v.id("events")),
	guestCount: v.number(),
	paymentRef: v.optional(v.string()),
	startTime: v.number(),
	status: reservationStatusValidator,
	table: tableSummaryValidator,
	tableId: v.id("tables"),
	userId: v.id("users"),
});

type AppReservation = Doc<"reservations">;
type AppTable = Doc<"tables">;
type AppUser = Doc<"users">;
type DbCtx = QueryCtx | MutationCtx;

const CANCELLATION_CUTOFF_MS = 2 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const PENDING_EXPIRY_MS = 30 * 60 * 1000;

function getReservationEndTime(
	startTime: number,
	durationHours: 1 | 2 | 3,
): number {
	return startTime + durationHours * HOUR_MS;
}

function timeRangesOverlap(
	startA: number,
	endA: number,
	startB: number,
	endB: number,
): boolean {
	return startA < endB && startB < endA;
}

function generateConfirmationCode(): string {
	const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
	let code = "";
	for (let index = 0; index < 8; index += 1) {
		code += alphabet[Math.floor(Math.random() * alphabet.length)];
	}
	return code;
}

function isStaffOrAdmin(role: "customer" | "staff" | "admin"): boolean {
	return role === "staff" || role === "admin";
}

function toReservationWithTable(table: AppTable, reservation: AppReservation) {
	return {
		...reservation,
		table,
	};
}

function toReservationBoardItem(
	table: AppTable,
	reservation: AppReservation,
	user: AppUser | null,
) {
	return {
		...reservation,
		customer: {
			email: user?.email ?? "",
			name: user?.name ?? "Unknown customer",
			phone: user?.phone,
			userId: reservation.userId,
		},
		table,
	};
}

async function getTableOrThrow(
	ctx: DbCtx,
	tableId: Id<"tables">,
): Promise<AppTable> {
	const table = await ctx.db.get(tableId);
	if (!table) {
		throw new Error("Table not found");
	}

	return table;
}

async function getReservationOrThrow(
	ctx: DbCtx,
	reservationId: Id<"reservations">,
): Promise<AppReservation> {
	const reservation = await ctx.db.get(reservationId);
	if (!reservation) {
		throw new Error("Reservation not found");
	}

	return reservation;
}

async function listActiveReservationsForTable(
	ctx: DbCtx,
	tableId: Id<"tables">,
): Promise<AppReservation[]> {
	const reservations = await ctx.db
		.query("reservations")
		.withIndex("by_tableId_startTime", (query) => query.eq("tableId", tableId))
		.collect();

	return reservations.filter(
		(reservation) =>
			reservation.status === "confirmed" || reservation.status === "pending",
	);
}

async function ensureAvailability(
	ctx: DbCtx,
	args: {
		durationHours: 1 | 2 | 3;
		excludeReservationId?: Id<"reservations">;
		startTime: number;
		tableId: Id<"tables">;
	},
): Promise<boolean> {
	const targetEndTime = getReservationEndTime(
		args.startTime,
		args.durationHours,
	);
	const reservations = await listActiveReservationsForTable(ctx, args.tableId);

	for (const reservation of reservations) {
		if (
			args.excludeReservationId &&
			reservation._id === args.excludeReservationId
		) {
			continue;
		}

		const existingEndTime = getReservationEndTime(
			reservation.startTime,
			reservation.durationHours,
		);
		if (
			timeRangesOverlap(
				args.startTime,
				targetEndTime,
				reservation.startTime,
				existingEndTime,
			)
		) {
			return false;
		}
	}

	return true;
}

function parseDateFilter(date: string): { end: number; start: number } {
	const start = Date.parse(`${date}T00:00:00.000Z`);
	if (Number.isNaN(start)) {
		throw new Error("Invalid date filter");
	}

	return {
		end: start + 24 * HOUR_MS,
		start,
	};
}

export const listByUser = query({
	args: {},
	returns: v.array(reservationWithTableValidator),
	handler: async (ctx) => {
		const user = await requireAuth(ctx);
		const reservations = await ctx.db
			.query("reservations")
			.withIndex("by_userId", (query) => query.eq("userId", user._id))
			.order("desc")
			.collect();

		const enrichedReservations = await Promise.all(
			reservations.map(async (reservation) => {
				const table = await getTableOrThrow(ctx, reservation.tableId);
				return toReservationWithTable(table, reservation);
			}),
		);

		return enrichedReservations;
	},
});

export const listAll = query({
	args: {
		date: v.optional(v.string()),
	},
	returns: v.array(reservationWithTableValidator),
	handler: async (ctx, args) => {
		await requireRole(ctx, "staff");

		const reservations = await ctx.db.query("reservations").collect();
		const dateRange =
			args.date !== undefined ? parseDateFilter(args.date) : null;
		const filteredReservations = dateRange
			? reservations.filter((reservation) => {
					return (
						reservation.startTime >= dateRange.start &&
						reservation.startTime < dateRange.end
					);
				})
			: reservations;

		const enrichedReservations = await Promise.all(
			[...filteredReservations]
				.sort((left, right) => right.startTime - left.startTime)
				.map(async (reservation) => {
					const table = await getTableOrThrow(ctx, reservation.tableId);
					return toReservationWithTable(table, reservation);
				}),
		);

		return enrichedReservations;
	},
});

export const listForBoard = query({
	args: {
		date: v.optional(v.string()),
		referenceStartTimestamp: v.number(),
	},
	returns: v.array(reservationBoardItemValidator),
	handler: async (ctx, args) => {
		await requireRole(ctx, "staff");

		const reservations = await ctx.db.query("reservations").collect();
		const activeRangeStart =
			args.date !== undefined
				? parseDateFilter(args.date).start
				: args.referenceStartTimestamp;
		const activeRangeEnd =
			args.date !== undefined ? parseDateFilter(args.date).end : null;

		const filteredReservations = reservations.filter((reservation) => {
			if (reservation.startTime < activeRangeStart) {
				return false;
			}

			if (activeRangeEnd !== null && reservation.startTime >= activeRangeEnd) {
				return false;
			}

			return true;
		});

		const enrichedReservations = await Promise.all(
			[...filteredReservations]
				.sort((left, right) => left.startTime - right.startTime)
				.map(async (reservation) => {
					const [table, customer] = await Promise.all([
						getTableOrThrow(ctx, reservation.tableId),
						ctx.db.get(reservation.userId),
					]);

					return toReservationBoardItem(table, reservation, customer);
				}),
		);

		return enrichedReservations;
	},
});

export const getById = query({
	args: {
		id: v.id("reservations"),
	},
	returns: v.union(reservationWithTableValidator, v.null()),
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const reservation = await ctx.db.get(args.id);

		if (!reservation) {
			return null;
		}

		if (reservation.userId !== user._id && !isStaffOrAdmin(user.role)) {
			throw new Error("Unauthorized");
		}

		const table = await getTableOrThrow(ctx, reservation.tableId);
		return toReservationWithTable(table, reservation);
	},
});

export const checkAvailability = query({
	args: {
		durationHours: durationHoursValidator,
		startTime: v.number(),
		tableId: v.id("tables"),
	},
	returns: v.boolean(),
	handler: async (ctx, args) => {
		return await ensureAvailability(ctx, args);
	},
});

export const checkActiveForTable = query({
	args: {
		referenceTimestamp: v.number(),
		tableId: v.id("tables"),
	},
	returns: v.union(reservationWithTableValidator, v.null()),
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const reservations = await ctx.db
			.query("reservations")
			.withIndex("by_userId", (query) => query.eq("userId", user._id))
			.collect();

		for (const reservation of reservations) {
			if (
				reservation.status !== "confirmed" ||
				reservation.tableId !== args.tableId
			) {
				continue;
			}

			const endTime = getReservationEndTime(
				reservation.startTime,
				reservation.durationHours,
			);
			if (
				reservation.startTime <= args.referenceTimestamp &&
				args.referenceTimestamp < endTime
			) {
				const table = await getTableOrThrow(ctx, reservation.tableId);
				return toReservationWithTable(table, reservation);
			}
		}

		return null;
	},
});

export const create = mutation({
	args: {
		durationHours: durationHoursValidator,
		eventId: v.optional(v.id("events")),
		guestCount: v.number(),
		startTime: v.number(),
		tableId: v.id("tables"),
	},
	returns: reservationCreateResultValidator,
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const table = await getTableOrThrow(ctx, args.tableId);

		if (table.status !== "available") {
			throw new Error("Table is not currently available");
		}

		if (!Number.isInteger(args.guestCount) || args.guestCount < 1) {
			throw new Error("Guest count must be at least 1");
		}

		if (args.guestCount > table.capacity) {
			throw new Error("Guest count exceeds table capacity");
		}

		const available = await ensureAvailability(ctx, args);
		if (!available) {
			throw new Error("Table is not available for the selected time");
		}

		const confirmationCode = generateConfirmationCode();
		const reservationId = await ctx.db.insert("reservations", {
			confirmationCode,
			createdAt: Date.now(),
			durationHours: args.durationHours,
			eventId: args.eventId,
			guestCount: args.guestCount,
			startTime: args.startTime,
			status: "pending",
			tableId: args.tableId,
			userId: user._id,
		});

		await ctx.scheduler.runAfter(
			PENDING_EXPIRY_MS,
			internal.reservations.expirePendingReservation,
			{ reservationId },
		);

		return {
			confirmationCode,
			reservationId,
		};
	},
});

export const expirePendingReservation = internalMutation({
	args: {
		reservationId: v.id("reservations"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const reservation = await ctx.db.get(args.reservationId);
		if (!reservation || reservation.status !== "pending") {
			return null;
		}

		await ctx.db.patch(reservation._id, { status: "cancelled" });
		return null;
	},
});

export const cancel = mutation({
	args: {
		reservationId: v.id("reservations"),
	},
	returns: reservationWithTableValidator,
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const reservation = await getReservationOrThrow(ctx, args.reservationId);

		if (reservation.userId !== user._id && !isStaffOrAdmin(user.role)) {
			throw new Error("Unauthorized");
		}

		if (reservation.status === "cancelled") {
			const table = await getTableOrThrow(ctx, reservation.tableId);
			return toReservationWithTable(table, reservation);
		}

		if (reservation.startTime - Date.now() <= CANCELLATION_CUTOFF_MS) {
			throw new Error("Cancellation window passed");
		}

		await ctx.db.patch(reservation._id, {
			status: "cancelled",
		});

		await ctx.scheduler.runAfter(0, internal.emails.sendCancellationNotice, {
			reservationId: reservation._id,
		});

		if (reservation.paymentRef) {
			await ctx.scheduler.runAfter(
				0,
				internal.notifications.notifyAdminsOfCancellationRefund,
				{
					reservationId: reservation._id,
				},
			);
		}

		const updatedReservation = await getReservationOrThrow(
			ctx,
			reservation._id,
		);
		const table = await getTableOrThrow(ctx, updatedReservation.tableId);
		return toReservationWithTable(table, updatedReservation);
	},
});

export const getPendingForPayment = internalQuery({
	args: {
		reservationId: v.id("reservations"),
		userId: v.id("users"),
	},
	returns: v.union(paymentContextValidator, v.null()),
	handler: async (ctx, args) => {
		const reservation = await ctx.db.get(args.reservationId);
		if (
			!reservation ||
			reservation.userId !== args.userId ||
			reservation.status !== "pending"
		) {
			return null;
		}

		const table = await ctx.db.get(reservation.tableId);
		if (!table) {
			return null;
		}

		return {
			confirmationCode: reservation.confirmationCode,
			durationHours: reservation.durationHours,
			guestCount: reservation.guestCount,
			reservationId: reservation._id,
			startTime: reservation.startTime,
			table,
			userId: reservation.userId,
		};
	},
});

export const confirm = internalMutation({
	args: {
		paymentRef: v.string(),
		reservationId: v.id("reservations"),
	},
	returns: v.union(reservationWithTableValidator, v.null()),
	handler: async (ctx, args) => {
		const reservation = await ctx.db.get(args.reservationId);
		if (!reservation) {
			throw new Error("Reservation not found");
		}

		const table = await getTableOrThrow(ctx, reservation.tableId);

		if (reservation.status === "confirmed") {
			return toReservationWithTable(table, reservation);
		}

		if (reservation.status !== "pending") {
			throw new Error("Reservation is not pending");
		}

		await ctx.db.patch(reservation._id, {
			paymentRef: args.paymentRef,
			status: "confirmed",
		});

		await ctx.db.patch(table._id, {
			status: "booked",
		});

		const updatedReservation = await getReservationOrThrow(
			ctx,
			reservation._id,
		);
		const updatedTable = await getTableOrThrow(ctx, table._id);
		return toReservationWithTable(updatedTable, updatedReservation);
	},
});
