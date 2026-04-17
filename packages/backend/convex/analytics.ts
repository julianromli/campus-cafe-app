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
	publishedEventsActive: v.number(),
	todayReservations: v.number(),
	todayRevenue: v.number(),
	totalTables: v.number(),
});

const trendDayValidator = v.object({
	date: v.string(),
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
		const now = args.referenceTimestamp;

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

		const payments = await ctx.db.query("payments").collect();
		const todayRevenue = payments
			.filter(
				(payment) =>
					payment.status === "paid" && payment._creationTime >= dayStart,
			)
			.reduce((sum, payment) => sum + payment.amount, 0);

		const activeOrders = 0;

		const publishedEvents = await ctx.db
			.query("events")
			.withIndex("by_status_startTime", (q) => q.eq("status", "published"))
			.collect();
		const publishedEventsActive = publishedEvents.filter(
			(e) => e.endTime >= now,
		).length;

		return {
			activeOrders,
			occupiedTables,
			publishedEventsActive,
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

		return dayKeys.map((date) => ({
			date,
			orderCount: 0,
			reservations: reservationCounts.get(date) ?? 0,
		}));
	},
});
