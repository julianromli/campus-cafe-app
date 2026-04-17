import { v } from "convex/values";

import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { requireRole } from "./lib/auth";

const menuCategoryValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("menuCategories"),
  createdAt: v.number(),
  displayOrder: v.number(),
  name: v.string(),
});

const menuItemPublicValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("menuItems"),
  available: v.boolean(),
  categoryId: v.id("menuCategories"),
  createdAt: v.number(),
  description: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  name: v.string(),
  price: v.number(),
});

const menuItemStaffValidator = v.object({
  _creationTime: v.number(),
  _id: v.id("menuItems"),
  available: v.boolean(),
  categoryId: v.id("menuCategories"),
  categoryName: v.string(),
  createdAt: v.number(),
  description: v.optional(v.string()),
  imageUrl: v.optional(v.string()),
  name: v.string(),
  price: v.number(),
});

type MenuItemDoc = Doc<"menuItems">;

async function resolveItemImageUrl(
  ctx: { storage: { getUrl: (id: Id<"_storage">) => Promise<string | null> } },
  item: MenuItemDoc,
): Promise<string | undefined> {
  if (!item.imageStorageId) {
    return undefined;
  }

  const url = await ctx.storage.getUrl(item.imageStorageId);
  return url ?? undefined;
}

function normalizeName(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Name is required");
  }

  return trimmed;
}

function validatePrice(price: number): number {
  if (!Number.isFinite(price) || price < 0) {
    throw new Error("Price must be a non-negative number");
  }

  return Math.round(price);
}

export const listCategories = query({
  args: {},
  returns: v.array(menuCategoryValidator),
  handler: async (ctx) => {
    const categories = await ctx.db.query("menuCategories").collect();
    return categories.sort((left, right) => left.displayOrder - right.displayOrder);
  },
});

const menuSectionValidator = v.object({
  category: menuCategoryValidator,
  items: v.array(menuItemPublicValidator),
});

export const listPublicMenu = query({
  args: {},
  returns: v.array(menuSectionValidator),
  handler: async (ctx) => {
    const categories = await ctx.db.query("menuCategories").collect();
    const sortedCategories = categories.sort((left, right) => left.displayOrder - right.displayOrder);

    const sections = await Promise.all(
      sortedCategories.map(async (category) => {
        const items = await ctx.db
          .query("menuItems")
          .withIndex("by_categoryId", (query) => query.eq("categoryId", category._id))
          .collect();

        const sortedItems = [...items].sort((left, right) => right._creationTime - left._creationTime);

        const publicItems = await Promise.all(
          sortedItems.map(async (item) => ({
            _creationTime: item._creationTime,
            _id: item._id,
            available: item.available,
            categoryId: item.categoryId,
            createdAt: item.createdAt,
            description: item.description,
            imageUrl: await resolveItemImageUrl(ctx, item),
            name: item.name,
            price: item.price,
          })),
        );

        return {
          category,
          items: publicItems,
        };
      }),
    );

    return sections;
  },
});

export const listItemsByCategory = query({
  args: {
    categoryId: v.id("menuCategories"),
  },
  returns: v.array(menuItemPublicValidator),
  handler: async (ctx, args) => {
    const items = await ctx.db
      .query("menuItems")
      .withIndex("by_categoryId", (query) => query.eq("categoryId", args.categoryId))
      .collect();

    const sorted = [...items].sort((left, right) => right._creationTime - left._creationTime);

    return Promise.all(
      sorted.map(async (item) => ({
        _creationTime: item._creationTime,
        _id: item._id,
        available: item.available,
        categoryId: item.categoryId,
        createdAt: item.createdAt,
        description: item.description,
        imageUrl: await resolveItemImageUrl(ctx, item),
        name: item.name,
        price: item.price,
      })),
    );
  },
});

export const listAllItems = query({
  args: {},
  returns: v.array(menuItemStaffValidator),
  handler: async (ctx) => {
    await requireRole(ctx, "staff");

    const [categories, items] = await Promise.all([ctx.db.query("menuCategories").collect(), ctx.db.query("menuItems").collect()]);

    const categoryNameById = new Map(categories.map((category) => [category._id, category.name]));

    const enriched = await Promise.all(
      items.map(async (item) => {
        const categoryName = categoryNameById.get(item.categoryId);
        if (!categoryName) {
          throw new Error("Category not found for menu item");
        }

        return {
          _creationTime: item._creationTime,
          _id: item._id,
          available: item.available,
          categoryId: item.categoryId,
          categoryName,
          createdAt: item.createdAt,
          description: item.description,
          imageUrl: await resolveItemImageUrl(ctx, item),
          name: item.name,
          price: item.price,
        };
      }),
    );

    return enriched.sort((left, right) => {
      const leftOrder = categories.find((category) => category._id === left.categoryId)?.displayOrder ?? 0;
      const rightOrder = categories.find((category) => category._id === right.categoryId)?.displayOrder ?? 0;
      if (leftOrder !== rightOrder) {
        return leftOrder - rightOrder;
      }

      return right._creationTime - left._creationTime;
    });
  },
});

export const createCategory = mutation({
  args: {
    name: v.string(),
  },
  returns: menuCategoryValidator,
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const existing = await ctx.db.query("menuCategories").collect();
    const nextOrder =
      existing.length === 0 ? 0 : Math.max(...existing.map((category) => category.displayOrder)) + 1;

    const id = await ctx.db.insert("menuCategories", {
      createdAt: Date.now(),
      displayOrder: nextOrder,
      name: normalizeName(args.name),
    });

    const category = await ctx.db.get(id);
    if (!category) {
      throw new Error("Category not found");
    }

    return category;
  },
});

export const updateCategory = mutation({
  args: {
    displayOrder: v.optional(v.number()),
    id: v.id("menuCategories"),
    name: v.optional(v.string()),
  },
  returns: menuCategoryValidator,
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const category = await ctx.db.get(args.id);
    if (!category) {
      throw new Error("Category not found");
    }

    const patch: Partial<Doc<"menuCategories">> = {};
    if (args.name !== undefined) {
      patch.name = normalizeName(args.name);
    }

    if (args.displayOrder !== undefined) {
      if (!Number.isInteger(args.displayOrder)) {
        throw new Error("displayOrder must be an integer");
      }

      patch.displayOrder = args.displayOrder;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(category._id, patch);
    }

    const updated = await ctx.db.get(category._id);
    if (!updated) {
      throw new Error("Category not found");
    }

    return updated;
  },
});

export const deleteCategory = mutation({
  args: {
    id: v.id("menuCategories"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const items = await ctx.db
      .query("menuItems")
      .withIndex("by_categoryId", (query) => query.eq("categoryId", args.id))
      .first();

    if (items) {
      throw new Error("Cannot delete a category that still has menu items");
    }

    await ctx.db.delete(args.id);
    return null;
  },
});

export const reorderCategories = mutation({
  args: {
    orderedIds: v.array(v.id("menuCategories")),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireRole(ctx, "admin");

    const uniqueIds = new Set(args.orderedIds);
    if (uniqueIds.size !== args.orderedIds.length) {
      throw new Error("Duplicate category ids in reorder list");
    }

    for (let index = 0; index < args.orderedIds.length; index += 1) {
      const category = await ctx.db.get(args.orderedIds[index]);
      if (!category) {
        throw new Error("Category not found");
      }

      await ctx.db.patch(category._id, { displayOrder: index });
    }

    return null;
  },
});

export const generateItemImageUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    await requireRole(ctx, "staff");
    return await ctx.storage.generateUploadUrl();
  },
});

export const createItem = mutation({
  args: {
    available: v.optional(v.boolean()),
    categoryId: v.id("menuCategories"),
    description: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    name: v.string(),
    price: v.number(),
  },
  returns: menuItemPublicValidator,
  handler: async (ctx, args) => {
    await requireRole(ctx, "staff");

    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Category not found");
    }

    const id = await ctx.db.insert("menuItems", {
      available: args.available ?? true,
      categoryId: args.categoryId,
      createdAt: Date.now(),
      description: args.description?.trim() || undefined,
      imageStorageId: args.imageStorageId,
      name: normalizeName(args.name),
      price: validatePrice(args.price),
    });

    const item = await ctx.db.get(id);
    if (!item) {
      throw new Error("Menu item not found");
    }

    return {
      _creationTime: item._creationTime,
      _id: item._id,
      available: item.available,
      categoryId: item.categoryId,
      createdAt: item.createdAt,
      description: item.description,
      imageUrl: await resolveItemImageUrl(ctx, item),
      name: item.name,
      price: item.price,
    };
  },
});

export const updateItem = mutation({
  args: {
    available: v.optional(v.boolean()),
    categoryId: v.optional(v.id("menuCategories")),
    description: v.optional(v.string()),
    id: v.id("menuItems"),
    imageStorageId: v.optional(v.union(v.id("_storage"), v.null())),
    name: v.optional(v.string()),
    price: v.optional(v.number()),
  },
  returns: menuItemPublicValidator,
  handler: async (ctx, args) => {
    await requireRole(ctx, "staff");

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Menu item not found");
    }

    if (args.categoryId !== undefined) {
      const category = await ctx.db.get(args.categoryId);
      if (!category) {
        throw new Error("Category not found");
      }
    }

    const patch: Partial<MenuItemDoc> = {};
    if (args.name !== undefined) {
      patch.name = normalizeName(args.name);
    }

    if (args.description !== undefined) {
      patch.description = args.description.trim() || undefined;
    }

    if (args.price !== undefined) {
      patch.price = validatePrice(args.price);
    }

    if (args.available !== undefined) {
      patch.available = args.available;
    }

    if (args.categoryId !== undefined) {
      patch.categoryId = args.categoryId;
    }

    if (args.imageStorageId !== undefined) {
      patch.imageStorageId = args.imageStorageId === null ? undefined : args.imageStorageId;
    }

    if (Object.keys(patch).length > 0) {
      await ctx.db.patch(item._id, patch);
    }

    const updated = await ctx.db.get(item._id);
    if (!updated) {
      throw new Error("Menu item not found");
    }

    return {
      _creationTime: updated._creationTime,
      _id: updated._id,
      available: updated.available,
      categoryId: updated.categoryId,
      createdAt: updated.createdAt,
      description: updated.description,
      imageUrl: await resolveItemImageUrl(ctx, updated),
      name: updated.name,
      price: updated.price,
    };
  },
});

export const toggleAvailability = mutation({
  args: {
    id: v.id("menuItems"),
  },
  returns: menuItemPublicValidator,
  handler: async (ctx, args) => {
    await requireRole(ctx, "staff");

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Menu item not found");
    }

    await ctx.db.patch(item._id, {
      available: !item.available,
    });

    const updated = await ctx.db.get(item._id);
    if (!updated) {
      throw new Error("Menu item not found");
    }

    return {
      _creationTime: updated._creationTime,
      _id: updated._id,
      available: updated.available,
      categoryId: updated.categoryId,
      createdAt: updated.createdAt,
      description: updated.description,
      imageUrl: await resolveItemImageUrl(ctx, updated),
      name: updated.name,
      price: updated.price,
    };
  },
});

export const bulkToggleCategory = mutation({
  args: {
    available: v.boolean(),
    categoryId: v.id("menuCategories"),
  },
  returns: v.number(),
  handler: async (ctx, args) => {
    await requireRole(ctx, "staff");

    const items = await ctx.db
      .query("menuItems")
      .withIndex("by_categoryId", (query) => query.eq("categoryId", args.categoryId))
      .collect();

    await Promise.all(items.map((item) => ctx.db.patch(item._id, { available: args.available })));

    return items.length;
  },
});

export const deleteItem = mutation({
  args: {
    id: v.id("menuItems"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    await requireRole(ctx, "staff");

    const item = await ctx.db.get(args.id);
    if (!item) {
      throw new Error("Menu item not found");
    }

    await ctx.db.delete(item._id);
    return null;
  },
});
