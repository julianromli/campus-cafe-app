import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	action,
	httpAction,
	internalMutation,
	internalQuery,
	query,
	type ActionCtx,
} from "./_generated/server";
import { PENDING_EXPIRY_MS } from "./lib/reservation_utils";
import { requireRole } from "./lib/auth";

const durationHoursValidator = v.union(
	v.literal(1),
	v.literal(2),
	v.literal(3),
);

const paymentTypeValidator = v.union(
	v.literal("reservation"),
	v.literal("food_order"),
);

const paymentStatusValidator = v.union(
	v.literal("pending"),
	v.literal("paid"),
	v.literal("failed"),
	v.literal("refunded"),
);

const paymentValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("payments"),
	amount: v.number(),
	checkoutUrl: v.optional(v.string()),
	createdAt: v.number(),
	currency: v.literal("IDR"),
	expiresAt: v.optional(v.number()),
	refId: v.string(),
	status: paymentStatusValidator,
	targetId: v.string(),
	type: paymentTypeValidator,
});

const paymentLinkResultValidator = v.object({
	paymentUrl: v.string(),
	reservationId: v.id("reservations"),
});

const pendingPaymentLinkValidator = v.object({
	checkoutUrl: v.string(),
	expiresAt: v.number(),
	refId: v.string(),
});

const pendingReservationCheckoutValidator = v.object({
	activePayment: v.union(pendingPaymentLinkValidator, v.null()),
	reservation: v.object({
		confirmationCode: v.optional(v.string()),
		durationHours: durationHoursValidator,
		guestCount: v.number(),
		reservationId: v.id("reservations"),
		startTime: v.number(),
		userId: v.id("users"),
	}),
});

const startReservationCheckoutArgsValidator = v.object({
	durationHours: v.optional(durationHoursValidator),
	eventId: v.optional(v.id("events")),
	guestCount: v.optional(v.number()),
	mode: v.union(v.literal("new"), v.literal("resume")),
	reservationId: v.optional(v.id("reservations")),
	startTime: v.optional(v.number()),
	tableId: v.optional(v.id("tables")),
});

const mayarResponseValidator = v.object({
	transactionId: v.string(),
	url: v.string(),
});

const MAYAR_CREATE_PAYMENT_URL =
	process.env.MAYAR_PAYMENT_CREATE_URL ??
	"https://api.mayar.id/hl/v1/payment/create";

function getReservationPricePerHour(): number {
	const amount = Number(process.env.RESERVATION_PRICE_PER_HOUR ?? "0");
	if (!Number.isFinite(amount) || amount <= 0) {
		throw new Error(
			"RESERVATION_PRICE_PER_HOUR must be configured before creating payments",
		);
	}

	return Math.round(amount);
}

function getMayarApiKey(): string {
	const apiKey = process.env.MAYAR_API_KEY;
	if (!apiKey) {
		throw new Error("MAYAR_API_KEY is not configured");
	}

	return apiKey;
}

function getSiteUrl(): string {
	const siteUrl = process.env.SITE_URL;
	if (!siteUrl) {
		throw new Error("SITE_URL is not configured");
	}

	return siteUrl.replace(/\/$/, "");
}

function jsonResponse(body: Record<string, string>, status = 200): Response {
	return new Response(JSON.stringify(body), {
		headers: {
			"Content-Type": "application/json",
		},
		status,
	});
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function parseMayarCreateResponse(response: unknown): {
	transactionId: string;
	url: string;
} {
	if (!isObject(response)) {
		throw new Error("Unexpected response from Mayar");
	}

	const data = response.data;
	if (!isObject(data)) {
		throw new Error("Mayar response did not include payment data");
	}

	const transactionId =
		typeof data.transactionId === "string"
			? data.transactionId
			: typeof data.transaction_id === "string"
				? data.transaction_id
				: null;

	if (!transactionId || typeof data.link !== "string") {
		throw new Error("Mayar response did not include a payment link");
	}

	return {
		transactionId,
		url: data.link,
	};
}

function extractWebhookSecretCandidate(request: Request): string | null {
	const candidates = [
		request.headers.get("x-mayar-webhook-secret"),
		request.headers.get("x-webhook-secret"),
		request.headers.get("authorization"),
	];

	for (const candidate of candidates) {
		if (!candidate) {
			continue;
		}

		if (candidate.toLowerCase().startsWith("bearer ")) {
			return candidate.slice(7).trim();
		}

		return candidate.trim();
	}

	return null;
}

function validateWebhookSecret(request: Request): boolean {
	const expectedSecret = process.env.MAYAR_WEBHOOK_SECRET;
	if (!expectedSecret) {
		console.error(
			"MAYAR_WEBHOOK_SECRET is not configured — rejecting webhook request. " +
				"Set the env var in Convex to enable webhook delivery.",
		);
		return false;
	}

	const receivedSecret = extractWebhookSecretCandidate(request);
	if (!receivedSecret) {
		return false;
	}

	if (receivedSecret.length !== expectedSecret.length) {
		return false;
	}

	let mismatch = 0;
	for (let index = 0; index < expectedSecret.length; index += 1) {
		mismatch |=
			expectedSecret.charCodeAt(index) ^ receivedSecret.charCodeAt(index);
	}
	return mismatch === 0;
}

function parseWebhookPayload(body: unknown): {
	amount?: number;
	event?: string;
	status?: string;
	transactionId?: string;
} {
	const outerPayload = isObject(body) ? body : {};
	let innerPayload: unknown = null;

	if (typeof outerPayload.payload === "string") {
		try {
			innerPayload = JSON.parse(outerPayload.payload);
		} catch {
			innerPayload = null;
		}
	}

	const inner = isObject(innerPayload) ? innerPayload : null;
	const innerData = inner && isObject(inner.data) ? inner.data : null;

	const transactionIdCandidates = [
		typeof outerPayload.paymentLinkTransactionId === "string"
			? outerPayload.paymentLinkTransactionId
			: null,
		innerData && typeof innerData.transactionId === "string"
			? innerData.transactionId
			: null,
		innerData && typeof innerData.id === "string" ? innerData.id : null,
	];

	const transactionId =
		transactionIdCandidates.find((candidate) => candidate !== null) ??
		undefined;
	const event =
		typeof outerPayload.type === "string"
			? outerPayload.type
			: inner && typeof inner.event === "string"
				? inner.event
				: undefined;
	const status =
		typeof outerPayload.status === "string"
			? outerPayload.status
			: innerData && typeof innerData.status === "string"
				? innerData.status
				: undefined;
	const amount =
		innerData && typeof innerData.amount === "number"
			? innerData.amount
			: undefined;

	return {
		amount,
		event,
		status,
		transactionId,
	};
}

type CheckoutUser = {
	_id: Id<"users">;
	email: string;
	name: string;
	phone?: string;
};

async function createMayarReservationPayment(args: {
	confirmationCode?: string;
	durationHours: 1 | 2 | 3;
	reservationId: Id<"reservations">;
	user: CheckoutUser & { phone: string };
}): Promise<{
	amount: number;
	expiresAt: number;
	transactionId: string;
	url: string;
}> {
	const amount = getReservationPricePerHour() * args.durationHours;
	const expiresAt = Date.now() + PENDING_EXPIRY_MS;
	const response = await fetch(MAYAR_CREATE_PAYMENT_URL, {
		body: JSON.stringify({
			amount,
			description: `Campus Cafe reservation ${args.confirmationCode ?? args.reservationId}`,
			email: args.user.email,
			expiredAt: new Date(expiresAt).toISOString(),
			mobile: args.user.phone,
			name: args.user.name,
			redirectUrl: `${getSiteUrl()}/my-reservations?success=true`,
		}),
		headers: {
			Authorization: `Bearer ${getMayarApiKey()}`,
			"Content-Type": "application/json",
		},
		method: "POST",
	});

	if (!response.ok) {
		const responseText = await response.text();
		throw new Error(
			`Mayar payment creation failed: ${responseText || response.statusText}`,
		);
	}

	const parsedResponse = parseMayarCreateResponse(await response.json());
	return {
		amount,
		expiresAt,
		transactionId: parsedResponse.transactionId,
		url: parsedResponse.url,
	};
}

async function getUserForReservationCheckout(
	ctx: ActionCtx,
): Promise<CheckoutUser> {
	const user = await ctx.runQuery(api.users.getMe, {});
	if (!user) {
		throw new Error("Unauthenticated");
	}

	return user;
}

async function ensureReservationCheckoutLink(
	ctx: ActionCtx,
	args: {
		reservationId: Id<"reservations">;
		user: CheckoutUser;
	},
): Promise<{ paymentUrl: string; reservationId: Id<"reservations"> }> {
	const checkout = await ctx.runQuery(
		internal.payments.getPendingReservationCheckout,
		{
			referenceTimestamp: Date.now(),
			reservationId: args.reservationId,
			userId: args.user._id,
		},
	);
	if (!checkout) {
		throw new Error("Pending reservation not found");
	}

	if (checkout.activePayment) {
		return {
			paymentUrl: checkout.activePayment.checkoutUrl,
			reservationId: checkout.reservation.reservationId,
		};
	}

	if (!args.user.phone) {
		throw new Error("Add a phone number to your profile before continuing");
	}

	const payment = await createMayarReservationPayment({
		confirmationCode: checkout.reservation.confirmationCode,
		durationHours: checkout.reservation.durationHours,
		reservationId: checkout.reservation.reservationId,
		user: {
			...args.user,
			phone: args.user.phone,
		},
	});

	await ctx.runMutation(internal.payments.recordPendingReservationPayment, {
		amount: payment.amount,
		checkoutUrl: payment.url,
		expiresAt: payment.expiresAt,
		refId: payment.transactionId,
		reservationId: checkout.reservation.reservationId,
	});

	return {
		paymentUrl: payment.url,
		reservationId: checkout.reservation.reservationId,
	};
}

export const createReservationPaymentLink = action({
	args: {
		reservationId: v.id("reservations"),
	},
	returns: paymentLinkResultValidator,
	handler: async (ctx, args) => {
		const user = await getUserForReservationCheckout(ctx);
		return await ensureReservationCheckoutLink(ctx, {
			reservationId: args.reservationId,
			user,
		});
	},
});

export const startReservationCheckout = action({
	args: startReservationCheckoutArgsValidator,
	returns: paymentLinkResultValidator,
	handler: async (
		ctx,
		args,
	): Promise<{ paymentUrl: string; reservationId: Id<"reservations"> }> => {
		const user = await getUserForReservationCheckout(ctx);

		if (args.mode === "resume") {
			if (!args.reservationId) {
				throw new Error("Reservation is required to resume checkout");
			}

			return await ensureReservationCheckoutLink(ctx, {
				reservationId: args.reservationId,
				user,
			});
		}

		if (
			args.durationHours === undefined ||
			args.guestCount === undefined ||
			args.startTime === undefined ||
			args.tableId === undefined
		) {
			throw new Error("Reservation details are incomplete");
		}

		const reservation: {
			confirmationCode: string;
			reservationId: Id<"reservations">;
		} = await ctx.runMutation(
			internal.reservations.createPendingForCheckout,
			{
				durationHours: args.durationHours,
				eventId: args.eventId,
				guestCount: args.guestCount,
				startTime: args.startTime,
				tableId: args.tableId,
				userId: user._id,
			},
		);

		try {
			return await ensureReservationCheckoutLink(ctx, {
				reservationId: reservation.reservationId,
				user,
			});
		} catch (error) {
			await ctx.runMutation(internal.reservations.expirePendingReservation, {
				reservationId: reservation.reservationId,
			});
			throw error;
		}
	},
});

export const getByRefId = internalQuery({
	args: {
		refId: v.string(),
	},
	returns: v.union(paymentValidator, v.null()),
	handler: async (ctx, args) => {
		return await ctx.db
			.query("payments")
			.withIndex("by_refId", (query) => query.eq("refId", args.refId))
			.unique();
	},
});

export const getPendingReservationCheckout = internalQuery({
	args: {
		referenceTimestamp: v.number(),
		reservationId: v.id("reservations"),
		userId: v.id("users"),
	},
	returns: v.union(pendingReservationCheckoutValidator, v.null()),
	handler: async (ctx, args) => {
		const reservation = await ctx.db.get(args.reservationId);
		if (
			!reservation ||
			reservation.userId !== args.userId ||
			reservation.status !== "pending"
		) {
			return null;
		}

		const payments = await ctx.db
			.query("payments")
			.withIndex("by_targetId", (query) =>
				query.eq("targetId", reservation._id),
			)
			.collect();
		const activePayment =
			payments
				.filter(
					(payment) =>
						payment.type === "reservation" &&
						payment.status === "pending" &&
						typeof payment.checkoutUrl === "string" &&
						typeof payment.expiresAt === "number" &&
						payment.expiresAt > args.referenceTimestamp,
				)
				.sort((left, right) => right.createdAt - left.createdAt)[0] ?? null;

		return {
			activePayment: activePayment
				? {
						checkoutUrl: activePayment.checkoutUrl!,
						expiresAt: activePayment.expiresAt!,
						refId: activePayment.refId,
					}
				: null,
			reservation: {
				confirmationCode: reservation.confirmationCode,
				durationHours: reservation.durationHours,
				guestCount: reservation.guestCount,
				reservationId: reservation._id,
				startTime: reservation.startTime,
				userId: reservation.userId,
			},
		};
	},
});

export const recordPendingReservationPayment = internalMutation({
	args: {
		amount: v.number(),
		checkoutUrl: v.string(),
		expiresAt: v.number(),
		refId: v.string(),
		reservationId: v.id("reservations"),
	},
	returns: paymentValidator,
	handler: async (ctx, args) => {
		const existingPayments = await ctx.db
			.query("payments")
			.withIndex("by_targetId", (query) =>
				query.eq("targetId", args.reservationId),
			)
			.collect();

		for (const payment of existingPayments) {
			if (
				payment.type === "reservation" &&
				payment.status === "pending" &&
				payment.refId !== args.refId
			) {
				await ctx.db.patch(payment._id, {
					status: "failed",
				});
			}
		}

		const id = await ctx.db.insert("payments", {
			amount: args.amount,
			checkoutUrl: args.checkoutUrl,
			createdAt: Date.now(),
			currency: "IDR",
			expiresAt: args.expiresAt,
			refId: args.refId,
			status: "pending",
			targetId: args.reservationId,
			type: "reservation",
		});

		const payment = await ctx.db.get(id);
		if (!payment) {
			throw new Error("Payment record not found");
		}

		return payment;
	},
});

export const markPaid = internalMutation({
	args: {
		amount: v.optional(v.number()),
		refId: v.string(),
	},
	returns: v.union(paymentValidator, v.null()),
	handler: async (ctx, args) => {
		const payment = await ctx.db
			.query("payments")
			.withIndex("by_refId", (query) => query.eq("refId", args.refId))
			.unique();

		if (!payment) {
			return null;
		}

		if (payment.status === "paid") {
			return payment;
		}

		await ctx.db.patch(payment._id, {
			...(args.amount !== undefined ? { amount: args.amount } : {}),
			status: "paid",
		});

		return await ctx.db.get(payment._id);
	},
});

const applyResultValidator = v.union(
	v.literal("applied"),
	v.literal("already_paid"),
	v.literal("ignored"),
	v.literal("not_found"),
);

export const applyReservationPaymentSuccess = internalMutation({
	args: {
		amount: v.optional(v.number()),
		refId: v.string(),
	},
	returns: applyResultValidator,
	handler: async (ctx, args) => {
		const payment = await ctx.db
			.query("payments")
			.withIndex("by_refId", (q) => q.eq("refId", args.refId))
			.unique();

		if (!payment) {
			return "not_found";
		}

		if (payment.status === "paid") {
			return "already_paid";
		}

		if (payment.status !== "pending") {
			return "ignored";
		}

		if (payment.type === "reservation") {
			try {
				await ctx.runMutation(internal.reservations.confirm, {
					paymentRef: args.refId,
					reservationId: payment.targetId as Id<"reservations">,
				});
			} catch (error) {
				if (
					error instanceof Error &&
					(error.message === "Reservation is not pending" ||
						error.message === "Reservation not found")
				) {
					return "ignored";
				}

				throw error;
			}
		}

		await ctx.runMutation(internal.payments.markPaid, {
			amount: args.amount,
			refId: args.refId,
		});

		if (payment.type === "reservation") {
			await ctx.runMutation(internal.emails.sendBookingConfirmation, {
				reservationId: payment.targetId as Id<"reservations">,
			});
		}

		return "applied";
	},
});

export const mayarWebhook = httpAction(async (ctx, request) => {
	if (!validateWebhookSecret(request)) {
		return jsonResponse({ message: "Unauthorized" }, 401);
	}

	const payload = parseWebhookPayload(await request.json());
	if (
		!payload.transactionId ||
		payload.event !== "payment.received" ||
		payload.status !== "SUCCESS"
	) {
		return jsonResponse({ message: "Ignored" });
	}

	const result = await ctx.runMutation(
		internal.payments.applyReservationPaymentSuccess,
		{
			amount: payload.amount,
			refId: payload.transactionId,
		},
	);

	if (result === "not_found") {
		return jsonResponse({ message: "Payment not found" });
	}

	if (result === "already_paid") {
		return jsonResponse({ message: "Already processed" });
	}

	if (result === "ignored") {
		return jsonResponse({ message: "Ignored" });
	}

	return jsonResponse({ message: "Webhook received successfully" });
});

const MAYAR_TRANSACTIONS_URL =
	process.env.MAYAR_TRANSACTIONS_URL ??
	"https://api.mayar.id/hl/v1/transactions";

const paymentListRowValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("payments"),
	amount: v.number(),
	checkoutUrl: v.optional(v.string()),
	createdAt: v.number(),
	currency: v.literal("IDR"),
	customerEmail: v.optional(v.string()),
	customerName: v.optional(v.string()),
	expiresAt: v.optional(v.number()),
	refId: v.string(),
	status: paymentStatusValidator,
	tableLabel: v.optional(v.string()),
	tableZone: v.optional(v.string()),
	targetId: v.string(),
	type: paymentTypeValidator,
});

const paginatedPaymentsValidator = v.object({
	continueCursor: v.union(v.string(), v.null()),
	isDone: v.boolean(),
	page: v.array(paymentListRowValidator),
	pageStatus: v.optional(
		v.union(
			v.null(),
			v.literal("SplitRecommended"),
			v.literal("SplitDone"),
			v.literal("SplitRequired"),
		),
	),
	splitCursor: v.optional(v.union(v.string(), v.null())),
});

export const listAllPayments = query({
	args: {
		paginationOpts: paginationOptsValidator,
		status: v.optional(paymentStatusValidator),
	},
	returns: paginatedPaymentsValidator,
	handler: async (ctx, args) => {
		await requireRole(ctx, "admin");

		const base = ctx.db.query("payments").order("desc");
		const filtered =
			args.status === undefined
				? base
				: base.filter((q) => q.eq(q.field("status"), args.status));

		const paginated = await filtered.paginate(args.paginationOpts);

		const enriched = await Promise.all(
			paginated.page.map(async (payment) => {
				if (payment.type !== "reservation") {
					return {
						...payment,
					};
				}

				const reservation = await ctx.db.get(
					payment.targetId as Id<"reservations">,
				);
				if (!reservation) {
					return { ...payment };
				}

				const table = await ctx.db.get(reservation.tableId);
				const user = await ctx.db.get(reservation.userId);

				return {
					...payment,
					customerEmail: user?.email,
					customerName: user?.name,
					tableLabel: table?.label,
					tableZone: table?.zone,
				};
			}),
		);

		return {
			...paginated,
			page: enriched,
		};
	},
});

function extractMayarTransactionRows(body: unknown): unknown[] {
	if (!isObject(body)) {
		return [];
	}

	if (Array.isArray(body.data)) {
		return body.data;
	}

	if (Array.isArray(body.transactions)) {
		return body.transactions;
	}

	return [];
}

function transactionMatchesRef(item: unknown, refId: string): boolean {
	if (!isObject(item)) {
		return false;
	}

	const candidates: string[] = [];
	if (typeof item.id === "string") {
		candidates.push(item.id);
	}
	if (typeof item.paymentLinkTransactionId === "string") {
		candidates.push(item.paymentLinkTransactionId);
	}

	const nested = item.paymentLinkTransaction;
	if (isObject(nested) && typeof nested.id === "string") {
		candidates.push(nested.id);
	}

	return candidates.some((c) => c === refId);
}

function getTransactionStatus(item: unknown): string | undefined {
	if (!isObject(item)) {
		return undefined;
	}
	return typeof item.status === "string" ? item.status : undefined;
}

export const syncReservationPaymentStatus = action({
	args: {
		refId: v.string(),
	},
	returns: v.object({
		apiStatus: v.optional(v.string()),
		result: v.union(
			v.literal("ignored"),
			v.literal("paid"),
			v.literal("pending"),
			v.literal("not_found_in_mayar"),
			v.literal("not_pending_locally"),
			v.literal("wrong_type"),
		),
	}),
	handler: async (
		ctx,
		args,
	): Promise<{
		apiStatus?: string;
		result:
			| "ignored"
			| "not_found_in_mayar"
			| "not_pending_locally"
			| "paid"
			| "pending"
			| "wrong_type";
	}> => {
		const user = await ctx.runQuery(api.users.getMe, {});
		if (!user || user.role !== "admin") {
			throw new Error("Unauthorized");
		}

		const payment = await ctx.runQuery(internal.payments.getByRefId, {
			refId: args.refId,
		});

		if (!payment) {
			throw new Error("Payment not found");
		}

		if (payment.type !== "reservation") {
			return { result: "wrong_type" as const };
		}

		if (payment.status !== "pending") {
			return { result: "not_pending_locally" as const };
		}

		const apiKey = getMayarApiKey();
		let page = 1;
		const pageSize = 50;
		let matched: { item: unknown; status: string | undefined } | null = null;

		for (;;) {
			const url = new URL(MAYAR_TRANSACTIONS_URL);
			url.searchParams.set("page", String(page));
			url.searchParams.set("pageSize", String(pageSize));

			const response = await fetch(url.toString(), {
				headers: {
					Authorization: `Bearer ${apiKey}`,
				},
			});

			if (!response.ok) {
				const text = await response.text();
				throw new Error(
					`Mayar transactions request failed: ${response.status} ${text || response.statusText}`,
				);
			}

			const body: unknown = await response.json();
			const rows = extractMayarTransactionRows(body);

			for (const item of rows) {
				if (transactionMatchesRef(item, args.refId)) {
					matched = {
						item,
						status: getTransactionStatus(item),
					};
					break;
				}
			}

			if (matched) {
				break;
			}

			const bodyObj = isObject(body) ? body : {};
			const hasMore =
				typeof bodyObj.hasMore === "boolean" ? bodyObj.hasMore : false;
			const pageCount =
				typeof bodyObj.pageCount === "number" ? bodyObj.pageCount : page;

			if (!hasMore || page >= pageCount || rows.length === 0) {
				break;
			}

			page += 1;
		}

		if (!matched || matched.status !== "SUCCESS") {
			return {
				apiStatus: matched?.status,
				result:
					matched === null
						? ("not_found_in_mayar" as const)
						: ("pending" as const),
			};
		}

		const applyResult = await ctx.runMutation(
			internal.payments.applyReservationPaymentSuccess,
			{
				refId: args.refId,
			},
		);

		if (applyResult === "already_paid" || applyResult === "applied") {
			return { apiStatus: "SUCCESS", result: "paid" as const };
		}

		if (applyResult === "ignored") {
			return { apiStatus: "SUCCESS", result: "ignored" as const };
		}

		return { apiStatus: matched.status, result: "pending" as const };
	},
});
