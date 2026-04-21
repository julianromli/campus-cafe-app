import { v } from "convex/values";

import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalMutation, mutation, query } from "./_generated/server";
import { requireAuth } from "./lib/auth";

const notificationMetadataValidator = v.object({
	amount: v.optional(v.number()),
	eventId: v.optional(v.id("events")),
	orderId: v.optional(v.id("orders")),
	paymentRef: v.optional(v.string()),
	reservationId: v.optional(v.id("reservations")),
	tableId: v.optional(v.id("tables")),
});

const notificationDocValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("notifications"),
	createdAt: v.number(),
	message: v.string(),
	metadata: v.optional(notificationMetadataValidator),
	read: v.boolean(),
	targetUserId: v.id("users"),
	title: v.string(),
	type: v.string(),
});

function formatIdr(amount: number): string {
	return new Intl.NumberFormat("id-ID", {
		currency: "IDR",
		maximumFractionDigits: 0,
		minimumFractionDigits: 0,
		style: "currency",
	}).format(amount);
}

export const listMine = query({
	args: {},
	returns: v.array(notificationDocValidator),
	handler: async (ctx) => {
		const user = await requireAuth(ctx);
		const rows = await ctx.db
			.query("notifications")
			.withIndex("by_targetUserId_read", (q) => q.eq("targetUserId", user._id))
			.collect();

		return [...rows]
			.sort((left, right) => right._creationTime - left._creationTime)
			.slice(0, 50);
	},
});

export const countUnread = query({
	args: {},
	returns: v.number(),
	handler: async (ctx) => {
		const user = await requireAuth(ctx);
		const rows = await ctx.db
			.query("notifications")
			.withIndex("by_targetUserId_read", (q) =>
				q.eq("targetUserId", user._id).eq("read", false),
			)
			.collect();

		return rows.length;
	},
});

export const markRead = mutation({
	args: {
		notificationId: v.id("notifications"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const user = await requireAuth(ctx);
		const notification = await ctx.db.get(args.notificationId);
		if (!notification || notification.targetUserId !== user._id) {
			throw new Error("Notification not found");
		}

		if (!notification.read) {
			await ctx.db.patch(notification._id, { read: true });
		}

		return null;
	},
});

export const markAllRead = mutation({
	args: {},
	returns: v.null(),
	handler: async (ctx) => {
		const user = await requireAuth(ctx);
		const unread = await ctx.db
			.query("notifications")
			.withIndex("by_targetUserId_read", (q) =>
				q.eq("targetUserId", user._id).eq("read", false),
			)
			.collect();

		await Promise.all(unread.map((n) => ctx.db.patch(n._id, { read: true })));

		return null;
	},
});

export const create = internalMutation({
	args: {
		message: v.string(),
		metadata: v.optional(notificationMetadataValidator),
		targetUserId: v.id("users"),
		title: v.string(),
		type: v.string(),
	},
	returns: v.id("notifications"),
	handler: async (ctx, args) => {
		return await ctx.db.insert("notifications", {
			createdAt: Date.now(),
			message: args.message,
			metadata: args.metadata,
			read: false,
			targetUserId: args.targetUserId,
			title: args.title,
			type: args.type,
		});
	},
});

export const notifyAdminsOfCancellationRefund = internalMutation({
	args: {
		reservationId: v.id("reservations"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const reservation = await ctx.db.get(args.reservationId);
		if (
			!reservation ||
			reservation.status !== "cancelled" ||
			!reservation.paymentRef
		) {
			return null;
		}

		const [table, customer] = await Promise.all([
			ctx.db.get(reservation.tableId),
			ctx.db.get(reservation.userId),
		]);

		const payment = await ctx.runQuery(
			internal.payments.getReservationPayment,
			{
				reservationId: args.reservationId,
			},
		);
		const amount = payment?.totalPayment ?? payment?.amount ?? 0;
		const customerName = customer?.name ?? "Pelanggan";
		const tableLabel = table?.label ?? "?";

		const dateLine = new Intl.DateTimeFormat("id-ID", {
			dateStyle: "medium",
			timeStyle: "short",
			timeZone: "Asia/Jakarta",
		}).format(new Date(reservation.startTime));

		const message = `${customerName} membatalkan reservasi Meja ${tableLabel} (${dateLine}). Jumlah: ${formatIdr(amount)}. Proses refund di dashboard Pakasir.`;

		const admins = await ctx.db
			.query("users")
			.withIndex("by_role", (q) => q.eq("role", "admin"))
			.collect();

		const metadata: Doc<"notifications">["metadata"] = {
			amount,
			paymentRef: reservation.paymentRef,
			reservationId: args.reservationId,
			tableId: reservation.tableId,
		};

		await Promise.all(
			admins.map((admin) =>
				ctx.db.insert("notifications", {
					createdAt: Date.now(),
					message,
					metadata,
					read: false,
					targetUserId: admin._id,
					title: "Pembatalan — Perlu Refund Manual",
					type: "cancellation_refund",
				}),
			),
		);

		return null;
	},
});
