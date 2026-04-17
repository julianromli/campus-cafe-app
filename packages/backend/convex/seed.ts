import { ConvexError, v } from "convex/values";

import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";

const resultValidator = v.object({
	categoriesInserted: v.number(),
	eventsInserted: v.number(),
	itemsInserted: v.number(),
	tablesInserted: v.number(),
});

function requireSeedSecret(secret: string): void {
	const expected = process.env.DEMO_SEED_SECRET;
	if (expected === undefined || expected === "") {
		throw new ConvexError({
			code: "SEED_DISABLED",
			message:
				"DEMO_SEED_SECRET is not set on this Convex deployment. Set it with: npx convex env set DEMO_SEED_SECRET '<random>'",
		});
	}
	if (secret !== expected) {
		throw new ConvexError({
			code: "FORBIDDEN",
			message: "Invalid seed secret.",
		});
	}
}

async function getOldestUser(ctx: MutationCtx) {
	const users = await ctx.db.query("users").collect();
	if (users.length === 0) {
		throw new ConvexError({
			code: "NO_USERS",
			message:
				"At least one user must exist (e.g. sign up in the app) before seeding events. Run seed again after registering.",
		});
	}
	return users.reduce((a, b) => (a.createdAt <= b.createdAt ? a : b));
}

/**
 * Inserts demo rows only into empty collections (idempotent per collection).
 * Protected by DEMO_SEED_SECRET on the deployment — intended for dev / staging only.
 */
export const seedDemoData = mutation({
	args: {
		secret: v.string(),
	},
	returns: resultValidator,
	handler: async (ctx, args) => {
		requireSeedSecret(args.secret);

		let tablesInserted = 0;
		let categoriesInserted = 0;
		let itemsInserted = 0;
		let eventsInserted = 0;

		const existingTables = await ctx.db.query("tables").collect();
		if (existingTables.length === 0) {
			const createdAt = Date.now();
			const demoTables: Array<{
				capacity: number;
				label: string;
				positionX: number;
				positionY: number;
				status: "available" | "booked" | "occupied" | "inactive";
				zone: string;
			}> = [
				{
					label: "[Demo] T1 — Available",
					capacity: 4,
					positionX: 48,
					positionY: 48,
					status: "available",
					zone: "Main",
				},
				{
					label: "[Demo] T2 — Available",
					capacity: 2,
					positionX: 220,
					positionY: 48,
					status: "available",
					zone: "Main",
				},
				{
					label: "[Demo] T3 — Booked",
					capacity: 4,
					positionX: 392,
					positionY: 48,
					status: "booked",
					zone: "Main",
				},
				{
					label: "[Demo] T4 — Occupied",
					capacity: 6,
					positionX: 520,
					positionY: 48,
					status: "occupied",
					zone: "Main",
				},
				{
					label: "[Demo] T5 — Inactive",
					capacity: 4,
					positionX: 48,
					positionY: 200,
					status: "inactive",
					zone: "Main",
				},
				{
					label: "[Demo] T6 — Available",
					capacity: 4,
					positionX: 220,
					positionY: 200,
					status: "available",
					zone: "Main",
				},
			];

			for (const row of demoTables) {
				await ctx.db.insert("tables", {
					...row,
					createdAt,
				});
				tablesInserted += 1;
			}
		}

		let categoryIds: Id<"menuCategories">[] = [];
		const existingCategories = await ctx.db.query("menuCategories").collect();
		if (existingCategories.length === 0) {
			const t = Date.now();
			const drinkId = await ctx.db.insert("menuCategories", {
				createdAt: t,
				displayOrder: 0,
				name: "[Demo] Minuman",
			});
			const foodId = await ctx.db.insert("menuCategories", {
				createdAt: t,
				displayOrder: 1,
				name: "[Demo] Makanan",
			});
			categoryIds = [drinkId, foodId];
			categoriesInserted = 2;
		} else {
			const sorted = [...existingCategories].sort(
				(a, b) => a.displayOrder - b.displayOrder,
			);
			categoryIds =
				sorted.length >= 2
					? [sorted[0]._id, sorted[1]._id]
					: [sorted[0]._id, sorted[0]._id];
		}

		const existingItems = await ctx.db.query("menuItems").collect();
		if (existingItems.length === 0 && categoryIds.length > 0) {
			const t = Date.now();
			const [catA, catB] = categoryIds;
			const itemRows: Array<{
				available: boolean;
				categoryId: Id<"menuCategories">;
				description?: string;
				name: string;
				price: number;
			}> = [
				{
					categoryId: catA,
					name: "[Demo] Es Kopi Susu",
					description: "Kopi dingin dengan susu.",
					price: 22_000,
					available: true,
				},
				{
					categoryId: catA,
					name: "[Demo] Teh Tarik",
					price: 15_000,
					available: true,
				},
				{
					categoryId: catB,
					name: "[Demo] Nasi Goreng Kampung",
					description: "Nasi goreng dengan ayam dan sayur.",
					price: 35_000,
					available: true,
				},
				{
					categoryId: catB,
					name: "[Demo] Mie Goreng (sold out)",
					price: 28_000,
					available: false,
				},
			];

			for (const row of itemRows) {
				await ctx.db.insert("menuItems", {
					available: row.available,
					categoryId: row.categoryId,
					createdAt: t,
					description: row.description,
					name: row.name,
					price: row.price,
				});
				itemsInserted += 1;
			}
		}

		const allEvents = await ctx.db.query("events").collect();
		const hasPublished = allEvents.some((e) => e.status === "published");
		if (!hasPublished) {
			const author = await getOldestUser(ctx);
			const t = Date.now();
			const startPublished = t + 86_400_000;
			const endPublished = startPublished + 7_200_000;

			if (allEvents.length === 0) {
				await ctx.db.insert("events", {
					category: "Music",
					createdAt: t,
					createdBy: author._id,
					description:
						"Draft demo — siap dipublish dari admin setelah URL eksternal diisi.",
					endTime: startPublished + 14_400_000,
					locationText: "Campus Cafe",
					organizerName: "Demo Organizer",
					startTime: startPublished + 3_600_000,
					status: "draft",
					title: "[Demo] Draft: Open Mic Night",
				});
				eventsInserted += 1;
			}

			await ctx.db.insert("events", {
				category: "Music",
				createdAt: t,
				createdBy: author._id,
				description:
					"Event demo untuk simulasi listing. CTA mengarah ke URL contoh (https).",
				endTime: endPublished,
				externalUrl: "https://example.com/events/campus-cafe-demo",
				locationText: "Campus Cafe — Main Hall",
				organizerName: "Campus Cafe",
				startTime: startPublished,
				status: "published",
				title: "[Demo] Weekend Jazz Night",
			});
			eventsInserted += 1;
		}

		return {
			tablesInserted,
			categoriesInserted,
			itemsInserted,
			eventsInserted,
		};
	},
});
