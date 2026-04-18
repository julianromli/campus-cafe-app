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
import {
	applyOperationalTableStatus,
	CANCELLATION_CUTOFF_MS,
	DAY_MS,
	getActiveConfirmedTableIds,
	getBusinessDayRangeForTimestamp,
	getReservationEndTime,
	getReservationSearchWindowStart,
	MAX_ADVANCE_BOOKING_DAYS,
	parseBusinessDateFilter,
	PENDING_EXPIRY_MS,
	timeRangesOverlap,
	type ReservationDurationHours,
	validateReservationWindow,
} from "./lib/reservation_utils";
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
	args: {
		startTime: number;
		tableId: Id<"tables">;
		targetEndTime: number;
	},
): Promise<AppReservation[]> {
	const reservations = await ctx.db
		.query("reservations")
		.withIndex("by_tableId_startTime", (query) =>
			query
				.eq("tableId", args.tableId)
				.gte("startTime", getReservationSearchWindowStart(args.startTime))
				.lt("startTime", args.targetEndTime),
		)
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
	const reservations = await listActiveReservationsForTable(ctx, {
		startTime: args.startTime,
		tableId: args.tableId,
		targetEndTime,
	});

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
		referenceTimestamp: v.number(),
	},
	returns: v.array(reservationWithTableValidator),
	handler: async (ctx, args) => {
		await requireRole(ctx, "staff");

		const dateRange =
			args.date !== undefined
				? parseBusinessDateFilter(args.date)
				: getBusinessDayRangeForTimestamp(args.referenceTimestamp);
		const rangeEnd =
			args.date !== undefined
				? dateRange.end
				: dateRange.start + DAY_MS * (MAX_ADVANCE_BOOKING_DAYS + 1);
		const reservations = await ctx.db
			.query("reservations")
			.withIndex("by_startTime", (query) =>
				query.gte("startTime", dateRange.start).lt("startTime", rangeEnd),
			)
			.collect();

		const enrichedReservations = await Promise.all(
			[...reservations]
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
		referenceTimestamp: v.number(),
	},
	returns: v.array(reservationBoardItemValidator),
	handler: async (ctx, args) => {
		await requireRole(ctx, "staff");

		const dateRange =
			args.date !== undefined
				? parseBusinessDateFilter(args.date)
				: getBusinessDayRangeForTimestamp(args.referenceTimestamp);
		const rangeEnd =
			args.date !== undefined
				? dateRange.end
				: dateRange.start + DAY_MS * (MAX_ADVANCE_BOOKING_DAYS + 1);
		const [reservations, activeBookedTableIds] = await Promise.all([
			ctx.db
				.query("reservations")
				.withIndex("by_startTime", (query) =>
					query.gte("startTime", dateRange.start).lt("startTime", rangeEnd),
				)
				.collect(),
			getActiveConfirmedTableIds(ctx, args.referenceTimestamp),
		]);

		const enrichedReservations = await Promise.all(
			[...reservations]
				.sort((left, right) => left.startTime - right.startTime)
				.map(async (reservation) => {
					const [table, customer] = await Promise.all([
						getTableOrThrow(ctx, reservation.tableId),
						ctx.db.get(reservation.userId),
					]);

					return toReservationBoardItem(
						applyOperationalTableStatus(table, activeBookedTableIds),
						reservation,
						customer,
					);
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
		referenceTimestamp: v.number(),
		startTime: v.number(),
		tableId: v.id("tables"),
	},
	returns: v.boolean(),
	handler: async (ctx, args) => {
		const table = await getTableOrThrow(ctx, args.tableId);
		if (table.status === "inactive") {
			return false;
		}

		validateReservationWindow({
			durationHours: args.durationHours as ReservationDurationHours,
			referenceTimestamp: args.referenceTimestamp,
			startTime: args.startTime,
		});

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
			.withIndex("by_userId_startTime", (query) =>
				query
					.eq("userId", user._id)
					.gte(
						"startTime",
						getReservationSearchWindowStart(args.referenceTimestamp),
					)
					.lte("startTime", args.referenceTimestamp),
			)
			.collect();

		for (const reservation of reservations) {
			if (
				reservation.status !== "confirmed" ||
				reservation.tableId !== args.tableId
			) {
				continue;
			}

			if (
				reservation.startTime <= args.referenceTimestamp &&
				args.referenceTimestamp <
					getReservationEndTime(
						reservation.startTime,
						reservation.durationHours,
					)
			) {
				const table = await getTableOrThrow(ctx, reservation.tableId);
				return toReservationWithTable(table, reservation);
			}
		}

		return null;
	},
});

async function createPendingReservation(
	ctx: MutationCtx,
	args: {
		durationHours: ReservationDurationHours;
		eventId?: Id<"events">;
		guestCount: number;
		startTime: number;
		tableId: Id<"tables">;
		userId: Id<"users">;
	},
): Promise<{ confirmationCode: string; reservationId: Id<"reservations"> }> {
	const table = await getTableOrThrow(ctx, args.tableId);

	if (table.status === "inactive") {
		throw new Error("Table is not available for reservation");
	}

	if (!Number.isInteger(args.guestCount) || args.guestCount < 1) {
		throw new Error("Guest count must be at least 1");
	}

	if (args.guestCount > table.capacity) {
		throw new Error("Guest count exceeds table capacity");
	}

	validateReservationWindow({
		durationHours: args.durationHours,
		referenceTimestamp: Date.now(),
		startTime: args.startTime,
	});

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
		userId: args.userId,
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
}

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
		return await createPendingReservation(ctx, {
			...args,
			durationHours: args.durationHours as ReservationDurationHours,
			userId: user._id,
		});
	},
});

export const createPendingForCheckout = internalMutation({
	args: {
		durationHours: durationHoursValidator,
		eventId: v.optional(v.id("events")),
		guestCount: v.number(),
		startTime: v.number(),
		tableId: v.id("tables"),
		userId: v.id("users"),
	},
	returns: reservationCreateResultValidator,
	handler: async (ctx, args) => {
		return await createPendingReservation(ctx, {
			...args,
			durationHours: args.durationHours as ReservationDurationHours,
		});
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

		if (reservation.status !== "pending") {
			if (reservation.status === "confirmed") {
				const existingTable = await getTableOrThrow(ctx, reservation.tableId);
				return toReservationWithTable(existingTable, reservation);
			}

			throw new Error("Reservation is not pending");
		}

		await ctx.db.patch(reservation._id, {
			paymentRef: args.paymentRef,
			status: "confirmed",
		});

		const updatedReservation = await getReservationOrThrow(
			ctx,
			reservation._id,
		);
		const table = await getTableOrThrow(ctx, reservation.tableId);
		return toReservationWithTable(table, updatedReservation);
	},
});
