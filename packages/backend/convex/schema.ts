import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const userRole = v.union(v.literal("customer"), v.literal("staff"), v.literal("admin"));

const tableStatus = v.union(
  v.literal("available"),
  v.literal("booked"),
  v.literal("occupied"),
  v.literal("inactive"),
);

const reservationStatus = v.union(
  v.literal("pending"),
  v.literal("confirmed"),
  v.literal("cancelled"),
);

const durationHours = v.union(v.literal(1), v.literal(2), v.literal(3));

const eventStatus = v.union(v.literal("draft"), v.literal("published"));

const eventRegistrationStatus = v.union(v.literal("pending"), v.literal("confirmed"), v.literal("cancelled"));

const orderStatus = v.union(
  v.literal("pending"),
  v.literal("preparing"),
  v.literal("ready"),
  v.literal("completed"),
);

const orderType = v.union(v.literal("reserved"), v.literal("walkin"));

const paymentType = v.union(
  v.literal("reservation"),
  v.literal("event_ticket"),
  v.literal("food_order"),
);

const paymentStatus = v.union(
  v.literal("pending"),
  v.literal("paid"),
  v.literal("failed"),
  v.literal("refunded"),
);

const notificationMetadata = v.object({
  amount: v.optional(v.number()),
  eventId: v.optional(v.id("events")),
  eventRegistrationId: v.optional(v.id("eventRegistrations")),
  orderId: v.optional(v.id("orders")),
  paymentRef: v.optional(v.string()),
  reservationId: v.optional(v.id("reservations")),
  tableId: v.optional(v.id("tables")),
});

export default defineSchema({
  users: defineTable({
    authId: v.optional(v.string()),
    avatarStorageId: v.optional(v.id("_storage")),
    avatarUrl: v.optional(v.string()),
    createdAt: v.number(),
    email: v.string(),
    name: v.string(),
    phone: v.optional(v.string()),
    role: userRole,
  })
    .index("by_authId", ["authId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  tables: defineTable({
    capacity: v.number(),
    createdAt: v.number(),
    label: v.string(),
    lastReleasedAt: v.optional(v.number()),
    lastReleasedBy: v.optional(v.id("users")),
    positionX: v.number(),
    positionY: v.number(),
    status: tableStatus,
    zone: v.string(),
  })
    .index("by_status", ["status"])
    .index("by_zone", ["zone"]),

  reservations: defineTable({
    confirmationCode: v.optional(v.string()),
    createdAt: v.number(),
    durationHours,
    eventId: v.optional(v.id("events")),
    guestCount: v.number(),
    paymentRef: v.optional(v.string()),
    startTime: v.number(),
    status: reservationStatus,
    tableId: v.id("tables"),
    userId: v.id("users"),
  })
    .index("by_status", ["status"])
    .index("by_tableId_startTime", ["tableId", "startTime"])
    .index("by_userId", ["userId"]),

  events: defineTable({
    capacity: v.number(),
    category: v.string(),
    coverImage: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.id("users"),
    description: v.string(),
    endTime: v.number(),
    registrationDeadline: v.number(),
    seatsRemaining: v.number(),
    startTime: v.number(),
    status: eventStatus,
    ticketPrice: v.number(),
    title: v.string(),
  }).index("by_status_startTime", ["status", "startTime"]),

  eventRegistrations: defineTable({
    createdAt: v.number(),
    eventId: v.id("events"),
    paymentRef: v.optional(v.string()),
    status: eventRegistrationStatus,
    ticketCode: v.string(),
    userId: v.id("users"),
  })
    .index("by_eventId", ["eventId"])
    .index("by_userId", ["userId"]),

  menuCategories: defineTable({
    createdAt: v.number(),
    displayOrder: v.number(),
    name: v.string(),
  }).index("by_displayOrder", ["displayOrder"]),

  menuItems: defineTable({
    available: v.boolean(),
    categoryId: v.id("menuCategories"),
    createdAt: v.number(),
    description: v.optional(v.string()),
    imageStorageId: v.optional(v.id("_storage")),
    name: v.string(),
    price: v.number(),
  })
    .index("by_available", ["available"])
    .index("by_categoryId", ["categoryId"]),

  orders: defineTable({
    createdAt: v.number(),
    items: v.array(
      v.object({
        menuItemId: v.id("menuItems"),
        name: v.string(),
        price: v.number(),
        qty: v.number(),
      }),
    ),
    orderType,
    reservationId: v.optional(v.id("reservations")),
    status: orderStatus,
    tableId: v.id("tables"),
    total: v.number(),
    userId: v.id("users"),
  })
    .index("by_status", ["status"])
    .index("by_tableId", ["tableId"])
    .index("by_userId", ["userId"]),

  payments: defineTable({
    amount: v.number(),
    createdAt: v.number(),
    currency: v.literal("IDR"),
    refId: v.string(),
    status: paymentStatus,
    targetId: v.string(),
    type: paymentType,
  })
    .index("by_refId", ["refId"])
    .index("by_targetId", ["targetId"]),

  notifications: defineTable({
    createdAt: v.number(),
    message: v.string(),
    metadata: v.optional(notificationMetadata),
    read: v.boolean(),
    targetUserId: v.id("users"),
    title: v.string(),
    type: v.string(),
  }).index("by_targetUserId_read", ["targetUserId", "read"]),
});
