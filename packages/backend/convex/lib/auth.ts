import type { Doc } from "./../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./../_generated/server";

type AuthCtx = MutationCtx | QueryCtx;
type AppUser = Doc<"users">;

export async function getAuthUser(ctx: AuthCtx): Promise<AppUser | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    return null;
  }

  return await ctx.db
    .query("users")
    .withIndex("by_authId", (query) => query.eq("authId", identity.subject))
    .unique();
}

export async function requireAuth(ctx: AuthCtx): Promise<AppUser> {
  const user = await getAuthUser(ctx);
  if (!user) {
    throw new Error("Unauthenticated");
  }

  return user;
}

export async function requireRole(ctx: AuthCtx, role: "staff" | "admin"): Promise<AppUser> {
  const user = await requireAuth(ctx);
  const allowed = role === "staff" ? user.role === "staff" || user.role === "admin" : user.role === "admin";

  if (!allowed) {
    throw new Error("Unauthorized");
  }

  return user;
}
