import { v } from "convex/values";

import type { Doc } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { getAuthUser, requireAuth, requireRole } from "./lib/auth";

const userRoleValidator = v.union(v.literal("customer"), v.literal("staff"), v.literal("admin"));

const userValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("users"),
  authId: v.optional(v.string()),
  avatarStorageId: v.optional(v.id("_storage")),
  avatarUrl: v.optional(v.string()),
  createdAt: v.number(),
  email: v.string(),
  name: v.string(),
  phone: v.optional(v.string()),
  role: userRoleValidator,
});

const staffListItemValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("users"),
  createdAt: v.number(),
  email: v.string(),
  name: v.string(),
  role: userRoleValidator,
});

const findByEmailResultValidator = v.object({
  _id: v.id("users"),
  email: v.string(),
  name: v.string(),
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

type DbCtx = MutationCtx | QueryCtx;

async function resolveAvatarUrl(ctx: DbCtx, user: AppUser): Promise<AppUser> {
  if (!user.avatarStorageId) {
    return user;
  }

  const url = await ctx.storage.getUrl(user.avatarStorageId);
  if (url) {
    return { ...user, avatarUrl: url };
  }

  return user;
}

export const getMe = query({
  args: {},
  returns: v.union(userValidator, v.null()),
  handler: async (ctx) => {
    const user = await getAuthUser(ctx);
    if (!user) {
      return null;
    }

    return await resolveAvatarUrl(ctx, user);
  },
});

export const getById = query({
  args: {
    id: v.id("users"),
  },
  returns: v.union(userValidator, v.null()),
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");
    const user = await ctx.db.get(args.id);
    if (!user) {
      return null;
    }

    return await resolveAvatarUrl(ctx, user);
  },
});

export const listStaff = query({
  args: {},
  returns: v.array(staffListItemValidator),
  handler: async (ctx) => {
    await requireRole(ctx, "admin");

    const [staffMembers, admins] = await Promise.all([
      ctx.db
        .query("users")
        .withIndex("by_role", (query) => query.eq("role", "staff"))
        .collect(),
      ctx.db
        .query("users")
        .withIndex("by_role", (query) => query.eq("role", "admin"))
        .collect(),
    ]);

    const combined = [...staffMembers, ...admins].sort((left, right) => right.createdAt - left.createdAt);

    return combined.map((user) => ({
      _creationTime: user._creationTime,
      _id: user._id,
      createdAt: user.createdAt,
      email: user.email,
      name: user.name,
      role: user.role,
    }));
  },
});

export const findByEmail = query({
  args: {
    email: v.string(),
  },
  returns: v.union(findByEmailResultValidator, v.null()),
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const email = args.email.trim();
    if (!email) {
      return null;
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (query) => query.eq("email", email))
      .unique();

    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
    };
  },
});

export const generateAvatarUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireAuth(ctx);
    return await ctx.storage.generateUploadUrl();
  },
});

export const updateProfile = mutation({
  args: {
    avatarStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    avatarUrl: v.optional(v.string()),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
  },
  returns: userValidator,
  handler: async (ctx, args) => {
    const user = await requireAuth(ctx);
    let workingUser = user;

    if (args.avatarStorageId !== undefined) {
      const previousStorageId = workingUser.avatarStorageId;

      if (args.avatarStorageId === null) {
        await ctx.db.patch(workingUser._id, {
          avatarStorageId: undefined,
          avatarUrl: undefined,
        });
        if (previousStorageId) {
          await ctx.storage.delete(previousStorageId);
        }
      } else {
        if (previousStorageId && previousStorageId !== args.avatarStorageId) {
          await ctx.storage.delete(previousStorageId);
        }

        await ctx.db.patch(workingUser._id, {
          avatarStorageId: args.avatarStorageId,
          avatarUrl: undefined,
        });
      }

      const refreshed = await ctx.db.get(workingUser._id);
      if (!refreshed) {
        throw new Error("User not found");
      }
      workingUser = refreshed;
    }

    const patch = buildProfilePatch({
      avatarUrl: args.avatarUrl,
      name: args.name,
      phone: args.phone,
    });

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(workingUser._id, patch);
    }

    const updatedUser = await ctx.db.get(workingUser._id);
    if (!updatedUser) {
      throw new Error("User not found");
    }

    return await resolveAvatarUrl(ctx, updatedUser);
  },
});

export const setRole = mutation({
  args: {
    role: userRoleValidator,
    userId: v.id("users"),
  },
  returns: userValidator,
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");

    if (args.userId === admin._id) {
      throw new Error("Cannot modify your own role");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, { role: args.role });

    const updatedUser = await ctx.db.get(user._id);
    if (!updatedUser) {
      throw new Error("User not found");
    }

    return await resolveAvatarUrl(ctx, updatedUser);
  },
});

export const revokeAccess = mutation({
  args: {
    userId: v.id("users"),
  },
  returns: userValidator,
  handler: async (ctx, args) => {
    const admin = await requireRole(ctx, "admin");

    if (args.userId === admin._id) {
      throw new Error("Cannot revoke your own access");
    }

    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, { role: "customer" });

    const updatedUser = await ctx.db.get(user._id);
    if (!updatedUser) {
      throw new Error("User not found");
    }

    return await resolveAvatarUrl(ctx, updatedUser);
  },
});
