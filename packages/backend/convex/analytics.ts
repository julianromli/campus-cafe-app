import { v } from "convex/values";

import { query } from "./_generated/server";
import { requireRole } from "./lib/auth";

const DAY_MS = 24 * 60 * 60 * 1000;

function getUtcDayStartMs(timestamp: number): number {
	const date = new Date(timestamp);
	return Date.UTC(
		date.getUTCFullYear(),
		date.getUTCMonth(),
		date.getUTCDate(),
		0,
		0,
		0,
		0,
	);
}

function formatUtcDateKeyFromMs(ms: number): string {
	const date = new Date(ms);
	const year = date.getUTCFullYear();
	const month = String(date.getUTCMonth() + 1).padStart(2, "0");
	const day = String(date.getUTCDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
}

function utcDateKeyFromTimestamp(timestamp: number): string {
	return formatUtcDateKeyFromMs(timestamp);
}

const todayOverviewValidator = v.object({
	activeOrders: v.number(),
	occupiedTables: v.number(),
	todayEventRegistrations: v.number(),
	todayReservations: v.number(),
	todayRevenue: v.number(),
	totalTables: v.number(),
});

const trendDayValidator = v.object({
	date: v.string(),
	eventRegistrations: v.number(),
	orderCount: v.number(),
	reservations: v.number(),
});

export const todayOverview = query({
	args: {
		referenceTimestamp: v.number(),
	},
	returns: todayOverviewValidator,
	handler: async (ctx, args) => {
		await requireRole(ctx, "admin");

		const dayStart = getUtcDayStartMs(args.referenceTimestamp);
		const dayEnd = dayStart + DAY_MS;

		const [bookedTables, occupiedTablesList, allTables] = await Promise.all([
			ctx.db
				.query("tables")
				.withIndex("by_status", (query) => query.eq("status", "booked"))
				.collect(),
			ctx.db
				.query("tables")
				.withIndex("by_status", (query) => query.eq("status", "occupied"))
				.collect(),
			ctx.db.query("tables").collect(),
		]);

		const occupiedTables = bookedTables.length + occupiedTablesList.length;
		const totalTables = allTables.filter(
			(table) => table.status !== "inactive",
		).length;

		const confirmedReservations = await ctx.db
			.query("reservations")
			.withIndex("by_status", (query) => query.eq("status", "confirmed"))
			.collect();

		const todayReservations = confirmedReservations.filter(
			(reservation) =>
				reservation.startTime >= dayStart && reservation.startTime < dayEnd,
		).length;

		// TODO: add index `by_status_creationTime` on payments if this scan becomes hot.
		const payments = await ctx.db.query("payments").collect();
		const todayRevenue = payments
			.filter(
				(payment) =>
					payment.status === "paid" && payment._creationTime >= dayStart,
			)
			.reduce((sum, payment) => sum + payment.amount, 0);

		// TODO(B-028): count orders with status pending | preparing from orders table.
		const activeOrders = 0;

		// TODO(B-018): count event registrations created today (confirmed).
		const todayEventRegistrations = 0;

		return {
			activeOrders,
			occupiedTables,
			todayEventRegistrations,
			todayReservations,
			todayRevenue,
			totalTables,
		};
	},
});

export const thirtyDayTrends = query({
	args: {
		referenceTimestamp: v.number(),
	},
	returns: v.array(trendDayValidator),
	handler: async (ctx, args) => {
		await requireRole(ctx, "admin");

		const endDayStart = getUtcDayStartMs(args.referenceTimestamp);
		const windowStartMs = endDayStart - 29 * DAY_MS;
		const windowEndExclusive = endDayStart + DAY_MS;

		const dayKeys: string[] = [];
		for (let offset = 29; offset >= 0; offset -= 1) {
			dayKeys.push(formatUtcDateKeyFromMs(endDayStart - offset * DAY_MS));
		}

		const reservationCounts = new Map<string, number>();
		for (const key of dayKeys) {
			reservationCounts.set(key, 0);
		}

		const confirmedReservations = await ctx.db
			.query("reservations")
			.withIndex("by_status", (query) => query.eq("status", "confirmed"))
			.collect();

		for (const reservation of confirmedReservations) {
			if (
				reservation.startTime < windowStartMs ||
				reservation.startTime >= windowEndExclusive
			) {
				continue;
			}

			const key = utcDateKeyFromTimestamp(reservation.startTime);
			if (!reservationCounts.has(key)) {
				continue;
			}

			reservationCounts.set(key, (reservationCounts.get(key) ?? 0) + 1);
		}

		// TODO(B-018): bucket confirmed event registrations by UTC day (createdAt or confirmation time).
		// TODO(B-028): bucket orders by UTC day (_creationTime).

		return dayKeys.map((date) => ({
			date,
			eventRegistrations: 0,
			orderCount: 0,
			reservations: reservationCounts.get(date) ?? 0,
		}));
	},
});
