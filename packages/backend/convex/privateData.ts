import { v } from "convex/values";

import { query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

export const get = query({
	args: {},
	returns: v.object({
		message: v.string(),
	}),
	handler: async (ctx) => {
		await requireAuth(ctx);

		return {
			message: "This is private",
		};
	},
});
