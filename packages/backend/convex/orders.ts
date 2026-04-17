import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireAuth, requireRole } from "./lib/auth";

type DbCtx = QueryCtx | MutationCtx;

const HOUR_MS = 60 * 60 * 1000;

const orderStatusValidator = v.union(
	v.literal("pending"),
	v.literal("preparing"),
	v.literal("ready"),
	v.literal("completed"),
);

const orderTypeValidator = v.union(v.literal("reserved"), v.literal("walkin"));

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
	status: v.union(
		v.literal("available"),
		v.literal("booked"),
		v.literal("occupied"),
		v.literal("inactive"),
	),
	zone: v.string(),
});

const orderLineValidator = v.object({
	menuItemId: v.id("menuItems"),
	name: v.string(),
	price: v.number(),
	qty: v.number(),
});

const orderWithTableValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("orders"),
	createdAt: v.number(),
	items: v.array(orderLineValidator),
	orderType: orderTypeValidator,
	reservationId: v.optional(v.id("reservations")),
	status: orderStatusValidator,
	table: tableSummaryValidator,
	tableId: v.id("tables"),
	total: v.number(),
	userId: v.id("users"),
});

const orderCreateResultValidator = v.object({
	orderId: v.id("orders"),
});

type AppReservation = Doc<"reservations">;
type AppTable = Doc<"tables">;

function getReservationEndTime(
	startTime: number,
	durationHours: 1 | 2 | 3,
): number {
	return startTime + durationHours * HOUR_MS;
}

async function findActiveReservationForUser(
	ctx: MutationCtx,
	userId: Id<"users">,
	tableId: Id<"tables">,
	referenceTimestamp: number,
): Promise<AppReservation | null> {
	const reservations = await ctx.db
		.query("reservations")
		.withIndex("by_userId", (query) => query.eq("userId", userId))
		.collect();

	for (const reservation of reservations) {
		if (reservation.status !== "confirmed" || reservation.tableId !== tableId) {
			continue;
		}

		const endTime = getReservationEndTime(
			reservation.startTime,
			reservation.durationHours,
		);
		if (
			reservation.startTime <= referenceTimestamp &&
			referenceTimestamp < endTime
		) {
			return reservation;
		}
	}

	return null;
}

function utcDayBounds(referenceTimestamp: number): {
	dayEnd: number;
	dayStart: number;
} {
	const ref = new Date(referenceTimestamp);
	const dayStart = Date.UTC(
		ref.getUTCFullYear(),
		ref.getUTCMonth(),
		ref.getUTCDate(),
	);
	const dayEnd = dayStart + 24 * 60 * 60 * 1000;
	return { dayEnd, dayStart };
}

function getNextStatus(
	current: "pending" | "preparing" | "ready" | "completed",
): "preparing" | "ready" | "completed" | null {
	if (current === "pending") {
		return "preparing";
	}

	if (current === "preparing") {
		return "ready";
	}

	if (current === "ready") {
		return "completed";
	}

	return null;
}

async function toOrderWithTable(ctx: DbCtx, order: Doc<"orders">) {
	const table = await ctx.db.get(order.tableId);
	if (!table) {
		throw new Error("Table not found");
	}

	return {
		_creationTime: order._creationTime,
		_id: order._id,
		createdAt: order.createdAt,
		items: order.items,
		orderType: order.orderType,
		reservationId: order.reservationId,
		status: order.status,
		table,
		tableId: order.tableId,
		total: order.total,
		userId: order.userId,
	};
}

export const listActive = query({
	args: {},
	returns: v.array(orderWithTableValidator),
	handler: async (ctx) => {
		await requireRole(ctx, "staff");

		const [pending, preparing, ready] = await Promise.all([
			ctx.db
				.query("orders")
				.withIndex("by_status", (query) => query.eq("status", "pending"))
				.collect(),
			ctx.db
				.query("orders")
				.withIndex("by_status", (query) => query.eq("status", "preparing"))
				.collect(),
			ctx.db
				.query("orders")
				.withIndex("by_status", (query) => query.eq("status", "ready"))
				.collect(),
		]);

		const combined = [...pending, ...preparing, ...ready];
		const enriched = await Promise.all(
			combined.map((order) => toOrderWithTable(ctx, order)),
		);
		return enriched.sort((left, right) => left.createdAt - right.createdAt);
	},
});

export const listCompletedToday = query({
	args: {
		referenceTimestamp: v.number(),
	},
	returns: v.array(orderWithTableValidator),
	handler: async (ctx, args) => {
		await requireRole(ctx, "staff");

		const { dayEnd, dayStart } = utcDayBounds(args.referenceTimestamp);

		const completed = await ctx.db
			.query("orders")
			.withIndex("by_status", (query) => query.eq("status", "completed"))
			.collect();

		const todays = completed.filter(
			(order) => order.createdAt >= dayStart && order.createdAt < dayEnd,
		);
		const enriched = await Promise.all(
			todays.map((order) => toOrderWithTable(ctx, order)),
		);
		return enriched.sort((left, right) => right.createdAt - left.createdAt);
	},
});

export const listByUser = query({
	args: {},
	returns: v.array(orderWithTableValidator),
	handler: async (ctx) => {
		const user = await requireAuth(ctx);
		const orders = await ctx.db
			.query("orders")
			.withIndex("by_userId", (query) => query.eq("userId", user._id))
			.collect();

		const sorted = [...orders].sort(
			(left, right) => right._creationTime - left._creationTime,
		);
		return Promise.all(sorted.map((order) => toOrderWithTable(ctx, order)));
	},
});

export const listActiveForUserAtTable = query({
	args: {
		referenceTimestamp: v.number(),
		tableId: v.id("tables"),
	},
	returns: v.array(orderWithTableValidator),
	handler: async (
		ctx,
		{ referenceTimestamp: _referenceTimestamp, tableId },
	) => {
		const user = await requireAuth(ctx);
		const orders = await ctx.db
			.query("orders")
			.withIndex("by_userId", (query) => query.eq("userId", user._id))
			.collect();

		const active = orders.filter(
			(order) =>
				order.tableId === tableId &&
				(order.status === "pending" ||
					order.status === "preparing" ||
					order.status === "ready"),
		);

		const enriched = await Promise.all(
			active.map((order) => toOrderWithTable(ctx, order)),
		);
		return enriched.sort((left, right) => right.createdAt - left.createdAt);
	},
});

export const getById = query({
	args: {
		id: v.id("orders"),
	},
	returns: v.union(orderWithTableValidator, v.null()),
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const order = await ctx.db.get(args.id);
		if (!order) {
			return null;
		}

		if (
			order.userId !== user._id &&
			user.role !== "staff" &&
			user.role !== "admin"
		) {
			throw new Error("Unauthorized");
		}

		return await toOrderWithTable(ctx, order);
	},
});

export const create = mutation({
	args: {
		items: v.array(
			v.object({
				menuItemId: v.id("menuItems"),
				qty: v.number(),
			}),
		),
		referenceTimestamp: v.number(),
		tableId: v.id("tables"),
	},
	returns: orderCreateResultValidator,
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);

		if (args.items.length === 0) {
			throw new Error("Cart is empty");
		}

		const table = await ctx.db.get(args.tableId);
		if (!table) {
			throw new Error("Table not found");
		}

		if (table.status === "inactive") {
			throw new Error("Table is not available for ordering");
		}

		const lines: Doc<"orders">["items"] = [];
		let total = 0;

		for (const line of args.items) {
			if (!Number.isInteger(line.qty) || line.qty < 1) {
				throw new Error("Each item must have a positive integer quantity");
			}

			const menuItem = await ctx.db.get(line.menuItemId);
			if (!menuItem) {
				throw new Error("Menu item not found");
			}

			if (!menuItem.available) {
				throw new Error(`"${menuItem.name}" is not available`);
			}

			const lineTotal = menuItem.price * line.qty;
			total += lineTotal;
			lines.push({
				menuItemId: menuItem._id,
				name: menuItem.name,
				price: menuItem.price,
				qty: line.qty,
			});
		}

		const activeReservation = await findActiveReservationForUser(
			ctx,
			user._id,
			args.tableId,
			args.referenceTimestamp,
		);

		const orderType = activeReservation
			? ("reserved" as const)
			: ("walkin" as const);
		const reservationId = activeReservation?._id;

		const orderId = await ctx.db.insert("orders", {
			createdAt: Date.now(),
			items: lines,
			orderType,
			reservationId,
			status: "pending",
			tableId: args.tableId,
			total,
			userId: user._id,
		});

		return { orderId };
	},
});

export const updateStatus = mutation({
	args: {
		orderId: v.id("orders"),
		status: orderStatusValidator,
	},
	returns: orderWithTableValidator,
	handler: async (ctx, args) => {
		await requireRole(ctx, "staff");

		const order = await ctx.db.get(args.orderId);
		if (!order) {
			throw new Error("Order not found");
		}

		const expectedNext = getNextStatus(order.status);
		if (expectedNext === null || args.status !== expectedNext) {
			throw new Error("Invalid status transition");
		}

		await ctx.db.patch(order._id, {
			status: args.status,
		});

		const updated = await ctx.db.get(order._id);
		if (!updated) {
			throw new Error("Order not found");
		}

		return await toOrderWithTable(ctx, updated);
	},
});
