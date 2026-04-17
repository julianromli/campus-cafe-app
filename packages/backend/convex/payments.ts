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
} from "./_generated/server";
import { requireRole } from "./lib/auth";

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
	createdAt: v.number(),
	currency: v.literal("IDR"),
	refId: v.string(),
	status: paymentStatusValidator,
	targetId: v.string(),
	type: paymentTypeValidator,
});

const paymentLinkResultValidator = v.object({
	paymentUrl: v.string(),
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

export const createReservationPaymentLink = action({
	args: {
		reservationId: v.id("reservations"),
	},
	returns: paymentLinkResultValidator,
	handler: async (ctx, args) => {
		const user = await ctx.runQuery(api.users.getMe, {});
		if (!user) {
			throw new Error("Unauthenticated");
		}

		if (!user.phone) {
			throw new Error("Add a phone number to your profile before continuing");
		}

		const reservation = await ctx.runQuery(
			internal.reservations.getPendingForPayment,
			{
				reservationId: args.reservationId,
				userId: user._id,
			},
		);

		if (!reservation) {
			throw new Error("Pending reservation not found");
		}

		const amount = getReservationPricePerHour() * reservation.durationHours;
		const response = await fetch(MAYAR_CREATE_PAYMENT_URL, {
			body: JSON.stringify({
				amount,
				description: `Campus Cafe reservation ${reservation.confirmationCode ?? reservation.reservationId}`,
				email: user.email,
				expiredAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
				mobile: user.phone,
				name: user.name,
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

		await ctx.runMutation(internal.payments.recordPendingReservationPayment, {
			amount,
			refId: parsedResponse.transactionId,
			reservationId: reservation.reservationId,
		});

		return {
			paymentUrl: parsedResponse.url,
		};
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

export const recordPendingReservationPayment = internalMutation({
	args: {
		amount: v.number(),
		refId: v.string(),
		reservationId: v.id("reservations"),
	},
	returns: paymentValidator,
	handler: async (ctx, args) => {
		const id = await ctx.db.insert("payments", {
			amount: args.amount,
			createdAt: Date.now(),
			currency: "IDR",
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

		if (payment.type === "reservation") {
			await ctx.runMutation(internal.reservations.confirm, {
				paymentRef: args.refId,
				reservationId: payment.targetId as Id<"reservations">,
			});
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

	return jsonResponse({ message: "Webhook received successfully" });
});

const MAYAR_TRANSACTIONS_URL =
	process.env.MAYAR_TRANSACTIONS_URL ??
	"https://api.mayar.id/hl/v1/transactions";

const paymentListRowValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("payments"),
	amount: v.number(),
	createdAt: v.number(),
	currency: v.literal("IDR"),
	customerEmail: v.optional(v.string()),
	customerName: v.optional(v.string()),
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

		return { apiStatus: matched.status, result: "pending" as const };
	},
});
