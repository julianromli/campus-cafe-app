import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";

const tableStatusValidator = v.union(
	v.literal("available"),
	v.literal("booked"),
	v.literal("occupied"),
	v.literal("inactive"),
);

const tableValidator = v.object({
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

type AppTable = Doc<"tables">;

function sortTables(tables: AppTable[]): AppTable[] {
	return [...tables].sort((left, right) => {
		if (left.zone !== right.zone) {
			return left.zone.localeCompare(right.zone);
		}

		return left.label.localeCompare(right.label, undefined, {
			numeric: true,
			sensitivity: "base",
		});
	});
}

function normalizeRequiredText(value: string, fieldName: string): string {
	const normalized = value.trim();
	if (!normalized) {
		throw new Error(`${fieldName} is required`);
	}

	return normalized;
}

function validateCapacity(capacity: number): number {
	if (!Number.isInteger(capacity) || capacity < 1 || capacity > 20) {
		throw new Error("Capacity must be between 1 and 20");
	}

	return capacity;
}

function validateCoordinate(
	value: number,
	fieldName: "positionX" | "positionY",
): number {
	if (!Number.isFinite(value) || value < 0) {
		throw new Error(`${fieldName} must be greater than or equal to 0`);
	}

	return value;
}

function buildTablePatch(args: {
	capacity?: number;
	label?: string;
	positionX?: number;
	positionY?: number;
	zone?: string;
}): Partial<AppTable> {
	const patch: Partial<AppTable> = {};

	if (args.label !== undefined) {
		patch.label = normalizeRequiredText(args.label, "Label");
	}

	if (args.zone !== undefined) {
		patch.zone = normalizeRequiredText(args.zone, "Zone");
	}

	if (args.capacity !== undefined) {
		patch.capacity = validateCapacity(args.capacity);
	}

	if (args.positionX !== undefined) {
		patch.positionX = validateCoordinate(args.positionX, "positionX");
	}

	if (args.positionY !== undefined) {
		patch.positionY = validateCoordinate(args.positionY, "positionY");
	}

	return patch;
}

export const list = query({
	args: {},
	returns: v.array(tableValidator),
	handler: async (ctx) => {
		const [availableTables, bookedTables, occupiedTables] = await Promise.all([
			ctx.db
				.query("tables")
				.withIndex("by_status", (query) => query.eq("status", "available"))
				.collect(),
			ctx.db
				.query("tables")
				.withIndex("by_status", (query) => query.eq("status", "booked"))
				.collect(),
			ctx.db
				.query("tables")
				.withIndex("by_status", (query) => query.eq("status", "occupied"))
				.collect(),
		]);

		return sortTables([...availableTables, ...bookedTables, ...occupiedTables]);
	},
});

export const listAll = query({
	args: {},
	returns: v.array(tableValidator),
	handler: async (ctx) => {
		await requireRole(ctx, "admin");
		return sortTables(await ctx.db.query("tables").collect());
	},
});

export const getById = query({
	args: {
		id: v.id("tables"),
	},
	returns: v.union(tableValidator, v.null()),
	handler: async (ctx, args) => {
		return await ctx.db.get(args.id);
	},
});

export const create = mutation({
	args: {
		capacity: v.number(),
		label: v.string(),
		positionX: v.number(),
		positionY: v.number(),
		zone: v.string(),
	},
	returns: tableValidator,
	handler: async (ctx, args) => {
		await requireRole(ctx, "admin");

		const id = await ctx.db.insert("tables", {
			capacity: validateCapacity(args.capacity),
			createdAt: Date.now(),
			label: normalizeRequiredText(args.label, "Label"),
			positionX: validateCoordinate(args.positionX, "positionX"),
			positionY: validateCoordinate(args.positionY, "positionY"),
			status: "available",
			zone: normalizeRequiredText(args.zone, "Zone"),
		});

		const table = await ctx.db.get(id);
		if (!table) {
			throw new Error("Table not found");
		}

		return table;
	},
});

export const update = mutation({
	args: {
		capacity: v.optional(v.number()),
		id: v.id("tables"),
		label: v.optional(v.string()),
		positionX: v.optional(v.number()),
		positionY: v.optional(v.number()),
		zone: v.optional(v.string()),
	},
	returns: tableValidator,
	handler: async (ctx, args) => {
		await requireRole(ctx, "admin");

		const table = await ctx.db.get(args.id);
		if (!table) {
			throw new Error("Table not found");
		}

		const patch = buildTablePatch(args);
		if (Object.keys(patch).length > 0) {
			await ctx.db.patch(table._id, patch);
		}

		const updatedTable = await ctx.db.get(table._id);
		if (!updatedTable) {
			throw new Error("Table not found");
		}

		return updatedTable;
	},
});

export const setStatus = mutation({
	args: {
		id: v.id("tables"),
		status: tableStatusValidator,
	},
	returns: tableValidator,
	handler: async (ctx, args) => {
		await requireRole(ctx, "admin");

		const table = await ctx.db.get(args.id);
		if (!table) {
			throw new Error("Table not found");
		}

		await ctx.db.patch(table._id, {
			status: args.status,
		});

		const updatedTable = await ctx.db.get(table._id);
		if (!updatedTable) {
			throw new Error("Table not found");
		}

		return updatedTable;
	},
});

export const markOccupied = mutation({
	args: {
		id: v.id("tables"),
	},
	returns: tableValidator,
	handler: async (ctx, args) => {
		await requireRole(ctx, "staff");

		const table = await ctx.db.get(args.id);
		if (!table) {
			throw new Error("Table not found");
		}

		if (table.status !== "booked") {
			throw new Error("Only booked tables can be marked occupied");
		}

		await ctx.db.patch(table._id, {
			status: "occupied",
		});

		const updatedTable = await ctx.db.get(table._id);
		if (!updatedTable) {
			throw new Error("Table not found");
		}

		return updatedTable;
	},
});

export const release = mutation({
	args: {
		id: v.id("tables"),
	},
	returns: tableValidator,
	handler: async (ctx, args) => {
		const user = await requireRole(ctx, "staff");

		const table = await ctx.db.get(args.id);
		if (!table) {
			throw new Error("Table not found");
		}

		await ctx.db.patch(table._id, {
			lastReleasedAt: Date.now(),
			lastReleasedBy: user._id,
			status: "available",
		});

		const updatedTable = await ctx.db.get(table._id);
		if (!updatedTable) {
			throw new Error("Table not found");
		}

		return updatedTable;
	},
});

export const remove = mutation({
	args: {
		id: v.id("tables"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireRole(ctx, "admin");

		const table = await ctx.db.get(args.id);
		if (!table) {
			throw new Error("Table not found");
		}

		const reservations = await ctx.db
			.query("reservations")
			.withIndex("by_tableId_startTime", (query) =>
				query.eq("tableId", table._id),
			)
			.collect();

		if (
			reservations.some((reservation) => reservation.status === "confirmed")
		) {
			throw new Error("Cannot delete a table with confirmed reservations");
		}

		await ctx.db.delete(table._id);
		return null;
	},
});
