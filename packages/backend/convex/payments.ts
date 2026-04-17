import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	action,
	httpAction,
	internalMutation,
	internalQuery,
} from "./_generated/server";

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
		return true;
	}

	const receivedSecret = extractWebhookSecretCandidate(request);
	return receivedSecret === expectedSecret;
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

	const payment = await ctx.runQuery(internal.payments.getByRefId, {
		refId: payload.transactionId,
	});

	if (!payment) {
		return jsonResponse({ message: "Payment not found" });
	}

	if (payment.status === "paid") {
		return jsonResponse({ message: "Already processed" });
	}

	if (payment.type === "reservation") {
		await ctx.runMutation(internal.reservations.confirm, {
			paymentRef: payload.transactionId,
			reservationId: payment.targetId as Id<"reservations">,
		});
	}

	await ctx.runMutation(internal.payments.markPaid, {
		amount: payload.amount,
		refId: payload.transactionId,
	});

	if (payment.type === "reservation") {
		await ctx.runMutation(internal.emails.sendBookingConfirmation, {
			reservationId: payment.targetId as Id<"reservations">,
		});
	}

	return jsonResponse({ message: "Webhook received successfully" });
});
