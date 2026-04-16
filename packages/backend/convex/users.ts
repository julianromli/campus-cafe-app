import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { getAuthUser, requireAuth, requireRole } from "./lib/auth";

const userRoleValidator = v.union(v.literal("customer"), v.literal("staff"), v.literal("admin"));

const userValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("users"),
  authId: v.optional(v.string()),
  avatarUrl: v.optional(v.string()),
  createdAt: v.number(),
  email: v.string(),
  name: v.string(),
  phone: v.optional(v.string()),
  role: userRoleValidator,
});

type AppUser = Doc<"users">;

function normalizeOptionalString(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function buildProfilePatch(args: {
  avatarUrl?: string;
  name?: string;
  phone?: string;
}): Partial<AppUser> {
  const patch: Partial<AppUser> = {};

  const name = normalizeOptionalString(args.name);
  if (args.name !== undefined) {
    if (!name || name.length < 2) {
      throw new Error("Name must be at least 2 characters");
    }
    patch.name = name;
  }

  if (args.phone !== undefined) {
    patch.phone = normalizeOptionalString(args.phone);
  }

  if (args.avatarUrl !== undefined) {
    patch.avatarUrl = normalizeOptionalString(args.avatarUrl);
  }

  return patch;
}

export const getMe = query({
  args: {},
  returns: v.union(userValidator, v.null()),
  handler: async (ctx) => {
    return await getAuthUser(ctx);
  },
});

export const getById = query({
  args: {
    id: v.id("users"),
  },
  returns: v.union(userValidator, v.null()),
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    return await ctx.db.get(args.id);
  },
});

export const updateProfile = mutation({
  args: {
    avatarUrl: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  returns: userValidator,
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    const patch = buildProfilePatch(args);

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(user._id, patch);
    }

    const updatedUser = await ctx.db.get(user._id);
    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  },
});

export const setRole = mutation({
  args: {
    role: userRoleValidator,
    userId: v.id("users"),
  },
  returns: userValidator,
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, { role: args.role });

    const updatedUser = await ctx.db.get(user._id);
    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  },
});

export const revokeAccess = mutation({
  args: {
    userId: v.id("users"),
  },
  returns: userValidator,
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, { role: "customer" });

    const updatedUser = await ctx.db.get(user._id);
    if (!updatedUser) {
      throw new Error("User not found");
    }

    return updatedUser;
  },
});
