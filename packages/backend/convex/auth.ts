import {
	type AuthFunctions,
	createClient,
	type GenericCtx,
} from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";

import { components, internal } from "./_generated/api";
import type { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL!;
const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const authFunctions: AuthFunctions = internal.auth;

export const authComponent = createClient<DataModel>(components.betterAuth, {
	authFunctions,
	triggers: {
		user: {
			onCreate: async (ctx, authUser) => {
				const existingUser = await ctx.db
					.query("users")
					.withIndex("by_authId", (query) => query.eq("authId", authUser._id))
					.unique();

				if (existingUser) {
					return;
				}

				const email = authUser.email?.trim();
				if (!email) {
					throw new Error("Authenticated user is missing an email address");
				}

				await ctx.db.insert("users", {
					authId: authUser._id,
					createdAt: Date.now(),
					email,
					name: authUser.name?.trim() || email,
					role: "customer",
				});
			},
			onUpdate: async (ctx, authUser) => {
				const user = await ctx.db
					.query("users")
					.withIndex("by_authId", (query) => query.eq("authId", authUser._id))
					.unique();

				if (!user) {
					return;
				}

				const email = authUser.email?.trim();
				const name = authUser.name?.trim();

				await ctx.db.patch(user._id, {
					...(email ? { email } : {}),
					...(name ? { name } : {}),
				});
			},
			onDelete: async (ctx, authUser) => {
				const user = await ctx.db
					.query("users")
					.withIndex("by_authId", (query) => query.eq("authId", authUser._id))
					.unique();

				if (!user) {
					return;
				}

				if (user.avatarStorageId) {
					await ctx.storage.delete(user.avatarStorageId);
				}

				// Anonymize PII but keep the `users` row so foreign keys in
				// reservations/orders/payments/notifications remain valid.
				await ctx.db.patch(user._id, {
					authId: undefined,
					avatarStorageId: undefined,
					avatarUrl: undefined,
					email: `deleted+${user._id}@cafe.local`,
					name: "Pengguna dihapus",
					phone: undefined,
					role: "customer",
				});
			},
		},
	},
});

function createAuth(ctx: GenericCtx<DataModel>) {
	const socialProviders =
		googleClientId && googleClientSecret
			? {
					google: {
						clientId: googleClientId,
						clientSecret: googleClientSecret,
					},
				}
			: undefined;

	return betterAuth({
		baseURL: siteUrl,
		trustedOrigins: [siteUrl],
		database: authComponent.adapter(ctx),
		emailAndPassword: {
			enabled: true,
			// Email delivery is intentionally deferred to a later sprint.
			requireEmailVerification: false,
		},
		...(socialProviders ? { socialProviders } : {}),
		plugins: [
			crossDomain({ siteUrl }),
			convex({
				authConfig,
				jwksRotateOnTokenGenerationError: true,
			}),
		],
	});
}

export { createAuth };
export const { onCreate, onDelete, onUpdate } = authComponent.triggersApi();
