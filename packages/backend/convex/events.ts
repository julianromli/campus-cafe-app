import { ConvexError, v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";

const eventStatusValidator = v.union(
	v.literal("draft"),
	v.literal("published"),
);

const eventDocValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("events"),
	category: v.string(),
	coverImage: v.optional(v.string()),
	createdAt: v.number(),
	createdBy: v.id("users"),
	description: v.string(),
	endTime: v.number(),
	externalUrl: v.optional(v.string()),
	locationText: v.optional(v.string()),
	organizerName: v.optional(v.string()),
	startTime: v.number(),
	status: eventStatusValidator,
	title: v.string(),
});

const eventListItemValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("events"),
	category: v.string(),
	coverImage: v.optional(v.string()),
	endTime: v.number(),
	externalUrl: v.optional(v.string()),
	locationText: v.optional(v.string()),
	organizerName: v.optional(v.string()),
	startTime: v.number(),
	status: eventStatusValidator,
	title: v.string(),
});

function isHttpsUrl(value: string): boolean {
	try {
		const parsed = new URL(value);
		return parsed.protocol === "https:";
	} catch {
		return false;
	}
}

function normalizeOptionalString(
	value: string | undefined,
): string | undefined {
	if (value === undefined) {
		return undefined;
	}
	const trimmed = value.trim();
	return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeRequiredString(value: string, label: string): string {
	const normalized = value.trim();
	if (!normalized) {
		throw new ConvexError({
			code: "INVALID_INPUT",
			message: `${label} is required`,
		});
	}
	return normalized;
}

function assertEndAfterStart(startTime: number, endTime: number): void {
	if (endTime <= startTime) {
		throw new ConvexError({
			code: "INVALID_RANGE",
			message: "End time must be after start time",
		});
	}
}

/** Published listings must have a valid https URL (PRD v1.3). */
function validatePublish(externalUrl: string | undefined): string {
	if (!externalUrl || !isHttpsUrl(externalUrl)) {
		throw new ConvexError({
			code: "INVALID_EXTERNAL_URL",
			message: "Published events require a valid https:// external URL",
		});
	}
	return externalUrl;
}

function isActiveEvent(doc: Doc<"events">, now: number): boolean {
	return doc.status === "published" && doc.endTime >= now;
}

export const listPublishedActive = query({
	args: {
		referenceTimestamp: v.number(),
	},
	returns: v.array(eventListItemValidator),
	handler: async (ctx, args) => {
		const now = args.referenceTimestamp;
		const published = await ctx.db
			.query("events")
			.withIndex("by_status_startTime", (q) => q.eq("status", "published"))
			.collect();

		const active = published
			.filter((doc) => isActiveEvent(doc, now))
			.sort((a, b) => a.startTime - b.startTime);

		return active.map((doc) => ({
			_creationTime: doc._creationTime,
			_id: doc._id,
			category: doc.category,
			coverImage: doc.coverImage,
			endTime: doc.endTime,
			externalUrl: doc.externalUrl,
			locationText: doc.locationText,
			organizerName: doc.organizerName,
			startTime: doc.startTime,
			status: doc.status,
			title: doc.title,
		}));
	},
});

export const getById = query({
	args: {
		id: v.id("events"),
	},
	returns: v.union(eventDocValidator, v.null()),
	handler: async (ctx, args) => {
		const doc = await ctx.db.get(args.id);
		if (!doc) {
			return null;
		}

		if (doc.status !== "published") {
			return null;
		}

		return doc;
	},
});

export const getByIdAdmin = query({
	args: {
		id: v.id("events"),
	},
	returns: v.union(eventDocValidator, v.null()),
	handler: async (ctx, args) => {
		await requireRole(ctx, "staff");
		return await ctx.db.get(args.id);
	},
});

export const listAllAdmin = query({
	args: {},
	returns: v.array(eventDocValidator),
	handler: async (ctx) => {
		await requireRole(ctx, "staff");
		const events = await ctx.db.query("events").collect();
		return events.sort((a, b) => b.startTime - a.startTime);
	},
});

export const create = mutation({
	args: {
		category: v.string(),
		coverImage: v.optional(v.string()),
		description: v.string(),
		endTime: v.number(),
		externalUrl: v.optional(v.string()),
		locationText: v.optional(v.string()),
		organizerName: v.optional(v.string()),
		startTime: v.number(),
		status: eventStatusValidator,
		title: v.string(),
	},
	returns: v.id("events"),
	handler: async (ctx, args) => {
		const admin = await requireRole(ctx, "admin");
		assertEndAfterStart(args.startTime, args.endTime);

		const title = normalizeRequiredString(args.title, "Title");
		const description = normalizeRequiredString(
			args.description,
			"Description",
		);
		const category = normalizeRequiredString(args.category, "Category");
		const externalUrl = normalizeOptionalString(args.externalUrl);

		if (args.status === "published") {
			validatePublish(externalUrl);
		}

		return await ctx.db.insert("events", {
			category,
			coverImage: args.coverImage,
			createdAt: Date.now(),
			createdBy: admin._id,
			description,
			endTime: args.endTime,
			externalUrl,
			locationText: normalizeOptionalString(args.locationText),
			organizerName: normalizeOptionalString(args.organizerName),
			startTime: args.startTime,
			status: args.status,
			title,
		});
	},
});

export const update = mutation({
	args: {
		category: v.optional(v.string()),
		coverImage: v.optional(v.union(v.string(), v.null())),
		description: v.optional(v.string()),
		endTime: v.optional(v.number()),
		externalUrl: v.optional(v.union(v.string(), v.null())),
		id: v.id("events"),
		locationText: v.optional(v.union(v.string(), v.null())),
		organizerName: v.optional(v.union(v.string(), v.null())),
		startTime: v.optional(v.number()),
		status: v.optional(eventStatusValidator),
		title: v.optional(v.string()),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireRole(ctx, "admin");
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new ConvexError({ code: "NOT_FOUND", message: "Event not found" });
		}

		const nextStart = args.startTime ?? existing.startTime;
		const nextEnd = args.endTime ?? existing.endTime;
		assertEndAfterStart(nextStart, nextEnd);

		const nextStatus = args.status ?? existing.status;
		let nextExternal =
			args.externalUrl === null
				? undefined
				: args.externalUrl === undefined
					? existing.externalUrl
					: normalizeOptionalString(args.externalUrl);

		if (nextStatus === "published") {
			nextExternal = validatePublish(nextExternal);
		}

		const patch: Partial<Doc<"events">> = {
			category:
				args.category !== undefined
					? normalizeRequiredString(args.category, "Category")
					: existing.category,
			description:
				args.description !== undefined
					? normalizeRequiredString(args.description, "Description")
					: existing.description,
			endTime: nextEnd,
			externalUrl: nextExternal,
			startTime: nextStart,
			status: nextStatus,
			title:
				args.title !== undefined
					? normalizeRequiredString(args.title, "Title")
					: existing.title,
		};

		if (args.coverImage !== undefined) {
			patch.coverImage = args.coverImage === null ? undefined : args.coverImage;
		}
		if (args.organizerName !== undefined) {
			patch.organizerName =
				args.organizerName === null
					? undefined
					: normalizeOptionalString(args.organizerName);
		}
		if (args.locationText !== undefined) {
			patch.locationText =
				args.locationText === null
					? undefined
					: normalizeOptionalString(args.locationText);
		}

		await ctx.db.patch(args.id, patch);
		return null;
	},
});

export const remove = mutation({
	args: {
		id: v.id("events"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireRole(ctx, "admin");
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new ConvexError({ code: "NOT_FOUND", message: "Event not found" });
		}
		await ctx.db.delete(args.id);
		return null;
	},
});

export const publish = mutation({
	args: {
		id: v.id("events"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireRole(ctx, "admin");
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new ConvexError({ code: "NOT_FOUND", message: "Event not found" });
		}
		validatePublish(existing.externalUrl);
		await ctx.db.patch(args.id, { status: "published" });
		return null;
	},
});

export const unpublish = mutation({
	args: {
		id: v.id("events"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		await requireRole(ctx, "admin");
		const existing = await ctx.db.get(args.id);
		if (!existing) {
			throw new ConvexError({ code: "NOT_FOUND", message: "Event not found" });
		}
		await ctx.db.patch(args.id, { status: "draft" });
		return null;
	},
});
