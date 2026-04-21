import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	type ActionCtx,
	action,
	httpAction,
	internalMutation,
	internalQuery,
	query,
} from "./_generated/server";
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

const paymentProviderValidator = v.union(
	v.literal("mayar"),
	v.literal("pakasir"),
);

const paymentValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("payments"),
	amount: v.number(),
	checkoutUrl: v.optional(v.string()),
	completedAt: v.optional(v.number()),
	createdAt: v.number(),
	currency: v.literal("IDR"),
	expiresAt: v.optional(v.number()),
	fee: v.optional(v.number()),
	paymentMethod: v.optional(v.string()),
	paymentNumber: v.optional(v.string()),
	provider: v.optional(paymentProviderValidator),
	refId: v.string(),
	status: paymentStatusValidator,
	targetId: v.string(),
	totalPayment: v.optional(v.number()),
	type: paymentTypeValidator,
});

const checkoutPaymentValidator = v.object({
	amount: v.number(),
	expiresAt: v.number(),
	fee: v.optional(v.number()),
	paymentMethod: v.string(),
	paymentNumber: v.string(),
	provider: v.literal("pakasir"),
	refId: v.string(),
	totalPayment: v.number(),
});

const reservationCheckoutSessionValidator = v.object({
	activePayment: checkoutPaymentValidator,
	reservationId: v.id("reservations"),
});

const pendingReservationCheckoutValidator = v.object({
	activePayment: v.union(checkoutPaymentValidator, v.null()),
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

const applyResultValidator = v.union(
	v.literal("applied"),
	v.literal("already_paid"),
	v.literal("ignored"),
	v.literal("not_found"),
);

const cancelCheckoutResultValidator = v.object({
	result: v.union(
		v.literal("cancelled"),
		v.literal("paid"),
		v.literal("already_cancelled"),
	),
});

const syncReservationPaymentResultValidator = v.object({
	apiStatus: v.optional(v.string()),
	result: v.union(
		v.literal("ignored"),
		v.literal("mismatch"),
		v.literal("paid"),
		v.literal("pending"),
		v.literal("not_found_in_pakasir"),
		v.literal("not_pending_locally"),
		v.literal("wrong_type"),
	),
});

const checkoutLockResultValidator = v.union(
	v.object({
		activePayment: checkoutPaymentValidator,
		reservationId: v.id("reservations"),
		status: v.literal("active"),
	}),
	v.object({
		lockExpiresAt: v.number(),
		status: v.literal("locked"),
	}),
	v.object({
		lockExpiresAt: v.number(),
		lockToken: v.string(),
		reservation: v.object({
			confirmationCode: v.optional(v.string()),
			durationHours: durationHoursValidator,
			guestCount: v.number(),
			reservationId: v.id("reservations"),
			startTime: v.number(),
			userId: v.id("users"),
		}),
		status: v.literal("ready"),
	}),
	v.object({
		status: v.literal("not_found"),
	}),
);

const PAKASIR_TRANSACTION_CREATE_URL =
	process.env.PAKASIR_TRANSACTION_CREATE_URL ??
	"https://app.pakasir.com/api/transactioncreate/qris";
const PAKASIR_TRANSACTION_DETAIL_URL =
	process.env.PAKASIR_TRANSACTION_DETAIL_URL ??
	"https://app.pakasir.com/api/transactiondetail";
const PAKASIR_TRANSACTION_CANCEL_URL =
	process.env.PAKASIR_TRANSACTION_CANCEL_URL ??
	"https://app.pakasir.com/api/transactioncancel";
const CHECKOUT_LOCK_MS = 15_000;
const CHECKOUT_LOCK_POLL_MS = 500;
const MAX_CHECKOUT_ATTEMPTS = 3;

type CheckoutUser = {
	_id: Id<"users">;
	email: string;
	name: string;
	phone?: string;
	role: "admin" | "customer" | "staff";
};

type ParsedPakasirDetail = {
	amount: number;
	completedAt?: number;
	orderId: string;
	paymentMethod?: string;
	project: string;
	status: string;
};

function getReservationPricePerHour(): number {
	const amount = Number(process.env.RESERVATION_PRICE_PER_HOUR ?? "0");
	if (!Number.isFinite(amount) || amount <= 0) {
		throw new Error(
			"RESERVATION_PRICE_PER_HOUR must be configured before creating payments",
		);
	}

	return Math.round(amount);
}

function getPakasirProject(): string {
	const project = process.env.PAKASIR_PROJECT;
	if (!project) {
		throw new Error("PAKASIR_PROJECT is not configured");
	}

	return project;
}

function getPakasirApiKey(): string {
	const apiKey = process.env.PAKASIR_API_KEY;
	if (!apiKey) {
		throw new Error("PAKASIR_API_KEY is not configured");
	}

	return apiKey;
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

function parseIsoTimestamp(value: unknown, fieldName: string): number {
	if (typeof value !== "string") {
		throw new Error(`Pakasir response did not include ${fieldName}`);
	}

	const parsed = Date.parse(value);
	if (!Number.isFinite(parsed)) {
		throw new Error(`Pakasir response included an invalid ${fieldName}`);
	}

	return parsed;
}

function buildReservationOrderId(args: {
	confirmationCode?: string;
	reservationId: Id<"reservations">;
}): string {
	const base =
		(args.confirmationCode ?? args.reservationId)
			.replace(/[^A-Za-z0-9_-]/g, "")
			.toUpperCase() || "RESERVATION";
	return `RES-${base}-${Date.now().toString(36).toUpperCase()}`;
}

function parsePakasirCreateResponse(response: unknown): {
	amount: number;
	expiresAt: number;
	fee?: number;
	orderId: string;
	paymentMethod: string;
	paymentNumber: string;
	totalPayment: number;
} {
	if (!isObject(response)) {
		throw new Error("Unexpected response from Pakasir");
	}

	const payment = response.payment;
	if (!isObject(payment)) {
		throw new Error("Pakasir response did not include payment data");
	}

	if (typeof payment.order_id !== "string") {
		throw new Error("Pakasir response did not include order_id");
	}
	if (typeof payment.amount !== "number") {
		throw new Error("Pakasir response did not include amount");
	}
	if (typeof payment.payment_method !== "string") {
		throw new Error("Pakasir response did not include payment_method");
	}
	if (typeof payment.payment_number !== "string") {
		throw new Error("Pakasir response did not include payment_number");
	}

	const fee = typeof payment.fee === "number" ? payment.fee : undefined;
	const totalPayment =
		typeof payment.total_payment === "number"
			? payment.total_payment
			: payment.amount + (fee ?? 0);

	return {
		amount: payment.amount,
		expiresAt: parseIsoTimestamp(payment.expired_at, "expired_at"),
		fee,
		orderId: payment.order_id,
		paymentMethod: payment.payment_method,
		paymentNumber: payment.payment_number,
		totalPayment,
	};
}

function parsePakasirDetailResponse(
	response: unknown,
): ParsedPakasirDetail | null {
	if (!isObject(response)) {
		return null;
	}

	const transaction = response.transaction;
	if (!isObject(transaction)) {
		return null;
	}

	if (
		typeof transaction.amount !== "number" ||
		typeof transaction.order_id !== "string" ||
		typeof transaction.project !== "string" ||
		typeof transaction.status !== "string"
	) {
		return null;
	}

	return {
		amount: transaction.amount,
		completedAt:
			typeof transaction.completed_at === "string"
				? parseIsoTimestamp(transaction.completed_at, "completed_at")
				: undefined,
		orderId: transaction.order_id,
		paymentMethod:
			typeof transaction.payment_method === "string"
				? transaction.payment_method
				: undefined,
		project: transaction.project,
		status: transaction.status,
	};
}

function parsePakasirWebhookPayload(body: unknown): {
	amount?: number;
	orderId?: string;
	project?: string;
	status?: string;
} {
	if (!isObject(body)) {
		return {};
	}

	return {
		amount: typeof body.amount === "number" ? body.amount : undefined,
		orderId: typeof body.order_id === "string" ? body.order_id : undefined,
		project: typeof body.project === "string" ? body.project : undefined,
		status: typeof body.status === "string" ? body.status : undefined,
	};
}

function createCheckoutLockToken(): string {
	return `checkout_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

function toCheckoutPayment(payment: {
	amount: number;
	expiresAt?: number;
	fee?: number;
	paymentMethod?: string;
	paymentNumber?: string;
	provider?: "mayar" | "pakasir";
	refId: string;
	totalPayment?: number;
}) {
	if (
		payment.provider !== "pakasir" ||
		typeof payment.expiresAt !== "number" ||
		typeof payment.paymentMethod !== "string" ||
		typeof payment.paymentNumber !== "string" ||
		typeof payment.totalPayment !== "number"
	) {
		return null;
	}

	return {
		amount: payment.amount,
		expiresAt: payment.expiresAt,
		fee: payment.fee,
		paymentMethod: payment.paymentMethod,
		paymentNumber: payment.paymentNumber,
		provider: "pakasir" as const,
		refId: payment.refId,
		totalPayment: payment.totalPayment,
	};
}

function selectActiveReservationPayment(
	payments: Array<{
		amount: number;
		createdAt: number;
		expiresAt?: number;
		fee?: number;
		paymentMethod?: string;
		paymentNumber?: string;
		provider?: "mayar" | "pakasir";
		refId: string;
		status: "failed" | "paid" | "pending" | "refunded";
		totalPayment?: number;
	}>,
	referenceTimestamp: number,
) {
	const candidate =
		payments
			.filter(
				(payment) =>
					payment.status === "pending" &&
					typeof payment.expiresAt === "number" &&
					payment.expiresAt > referenceTimestamp,
			)
			.sort((left, right) => right.createdAt - left.createdAt)[0] ?? null;

	return candidate ? toCheckoutPayment(candidate) : null;
}

async function sleep(ms: number): Promise<void> {
	await new Promise((resolve) => setTimeout(resolve, ms));
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

async function fetchPakasirTransactionDetail(args: {
	amount: number;
	refId: string;
}): Promise<ParsedPakasirDetail | null> {
	const url = new URL(PAKASIR_TRANSACTION_DETAIL_URL);
	url.searchParams.set("amount", String(args.amount));
	url.searchParams.set("api_key", getPakasirApiKey());
	url.searchParams.set("order_id", args.refId);
	url.searchParams.set("project", getPakasirProject());

	const response = await fetch(url.toString());
	if (!response.ok) {
		const responseText = await response.text();
		throw new Error(
			`Pakasir transaction detail failed: ${responseText || response.statusText}`,
		);
	}

	return parsePakasirDetailResponse(await response.json());
}

async function createPakasirReservationPayment(args: {
	amount: number;
	confirmationCode?: string;
	reservationId: Id<"reservations">;
}): Promise<{
	amount: number;
	expiresAt: number;
	fee?: number;
	paymentMethod: string;
	paymentNumber: string;
	refId: string;
	totalPayment: number;
}> {
	const response = await fetch(PAKASIR_TRANSACTION_CREATE_URL, {
		body: JSON.stringify({
			amount: args.amount,
			api_key: getPakasirApiKey(),
			order_id: buildReservationOrderId({
				confirmationCode: args.confirmationCode,
				reservationId: args.reservationId,
			}),
			project: getPakasirProject(),
		}),
		headers: {
			"Content-Type": "application/json",
		},
		method: "POST",
	});

	if (!response.ok) {
		const responseText = await response.text();
		throw new Error(
			`Pakasir payment creation failed: ${responseText || response.statusText}`,
		);
	}

	const parsed = parsePakasirCreateResponse(await response.json());
	return {
		amount: parsed.amount,
		expiresAt: parsed.expiresAt,
		fee: parsed.fee,
		paymentMethod: parsed.paymentMethod,
		paymentNumber: parsed.paymentNumber,
		refId: parsed.orderId,
		totalPayment: parsed.totalPayment,
	};
}

async function waitForReservationCheckout(
	ctx: ActionCtx,
	args: {
		lockExpiresAt: number;
		reservationId: Id<"reservations">;
		userId: Id<"users">;
	},
) {
	while (Date.now() < args.lockExpiresAt) {
		await sleep(CHECKOUT_LOCK_POLL_MS);
		const checkout = await ctx.runQuery(
			internal.payments.getPendingReservationCheckout,
			{
				referenceTimestamp: Date.now(),
				reservationId: args.reservationId,
				userId: args.userId,
			},
		);
		if (!checkout) {
			throw new Error("Pending reservation not found");
		}

		if (checkout.activePayment) {
			return {
				activePayment: checkout.activePayment,
				reservationId: checkout.reservation.reservationId,
			};
		}
	}

	return null;
}

async function ensureReservationCheckoutSession(
	ctx: ActionCtx,
	args: {
		reservationId: Id<"reservations">;
		user: CheckoutUser;
	},
): Promise<{
	activePayment: {
		amount: number;
		expiresAt: number;
		fee?: number;
		paymentMethod: string;
		paymentNumber: string;
		provider: "pakasir";
		refId: string;
		totalPayment: number;
	};
	reservationId: Id<"reservations">;
}> {
	for (let attempt = 0; attempt < MAX_CHECKOUT_ATTEMPTS; attempt += 1) {
		const claim = await ctx.runMutation(
			internal.payments.claimReservationCheckoutLock,
			{
				referenceTimestamp: Date.now(),
				reservationId: args.reservationId,
				userId: args.user._id,
			},
		);

		if (claim.status === "not_found") {
			throw new Error("Pending reservation not found");
		}

		if (claim.status === "active") {
			return {
				activePayment: claim.activePayment,
				reservationId: claim.reservationId,
			};
		}

		if (claim.status === "locked") {
			const existingCheckout = await waitForReservationCheckout(ctx, {
				lockExpiresAt: claim.lockExpiresAt,
				reservationId: args.reservationId,
				userId: args.user._id,
			});
			if (existingCheckout) {
				return existingCheckout;
			}
			continue;
		}

		const amount =
			getReservationPricePerHour() * claim.reservation.durationHours;

		try {
			const payment = await createPakasirReservationPayment({
				amount,
				confirmationCode: claim.reservation.confirmationCode,
				reservationId: claim.reservation.reservationId,
			});

			await ctx.runMutation(internal.payments.recordPendingReservationPayment, {
				amount: payment.amount,
				checkoutLockToken: claim.lockToken,
				expiresAt: payment.expiresAt,
				fee: payment.fee,
				paymentMethod: payment.paymentMethod,
				paymentNumber: payment.paymentNumber,
				provider: "pakasir",
				refId: payment.refId,
				reservationId: claim.reservation.reservationId,
				totalPayment: payment.totalPayment,
			});

			return {
				activePayment: {
					amount: payment.amount,
					expiresAt: payment.expiresAt,
					fee: payment.fee,
					paymentMethod: payment.paymentMethod,
					paymentNumber: payment.paymentNumber,
					provider: "pakasir" as const,
					refId: payment.refId,
					totalPayment: payment.totalPayment,
				},
				reservationId: claim.reservation.reservationId,
			};
		} catch (error) {
			await ctx.runMutation(internal.payments.releaseReservationCheckoutLock, {
				lockToken: claim.lockToken,
				reservationId: claim.reservation.reservationId,
			});
			throw error;
		}
	}

	throw new Error("Checkout is being prepared. Try again in a moment.");
}

export const startReservationCheckout = action({
	args: startReservationCheckoutArgsValidator,
	returns: reservationCheckoutSessionValidator,
	handler: async (ctx, args) => {
		const user = await getUserForReservationCheckout(ctx);

		if (args.mode === "resume") {
			if (!args.reservationId) {
				throw new Error("Reservation is required to resume checkout");
			}

			return await ensureReservationCheckoutSession(ctx, {
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
		} = await ctx.runMutation(internal.reservations.createPendingForCheckout, {
			durationHours: args.durationHours,
			eventId: args.eventId,
			guestCount: args.guestCount,
			startTime: args.startTime,
			tableId: args.tableId,
			userId: user._id,
		});

		try {
			return await ensureReservationCheckoutSession(ctx, {
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

export const cancelReservationCheckout = action({
	args: {
		reservationId: v.id("reservations"),
	},
	returns: cancelCheckoutResultValidator,
	handler: async (ctx, args) => {
		const user = await getUserForReservationCheckout(ctx);
		const reservation = await ctx.runQuery(api.reservations.getById, {
			id: args.reservationId,
		});

		if (!reservation) {
			throw new Error("Reservation not found");
		}
		if (reservation.userId !== user._id) {
			throw new Error("Unauthorized");
		}
		if (reservation.status === "cancelled") {
			return { result: "already_cancelled" as const };
		}
		if (reservation.status === "confirmed") {
			return { result: "paid" as const };
		}

		const checkout = await ctx.runQuery(
			internal.payments.getPendingReservationCheckout,
			{
				referenceTimestamp: Date.now(),
				reservationId: args.reservationId,
				userId: user._id,
			},
		);
		if (!checkout) {
			throw new Error("Pending reservation not found");
		}

		if (checkout.activePayment) {
			const detail = await fetchPakasirTransactionDetail({
				amount: checkout.activePayment.amount,
				refId: checkout.activePayment.refId,
			});
			if (
				detail &&
				detail.project === getPakasirProject() &&
				detail.orderId === checkout.activePayment.refId &&
				detail.amount === checkout.activePayment.amount &&
				detail.status === "completed"
			) {
				await ctx.runMutation(
					internal.payments.applyReservationPaymentSuccess,
					{
						amount: detail.amount,
						completedAt: detail.completedAt,
						paymentMethod: detail.paymentMethod,
						refId: detail.orderId,
					},
				);
				return { result: "paid" as const };
			}

			const response = await fetch(PAKASIR_TRANSACTION_CANCEL_URL, {
				body: JSON.stringify({
					amount: checkout.activePayment.amount,
					api_key: getPakasirApiKey(),
					order_id: checkout.activePayment.refId,
					project: getPakasirProject(),
				}),
				headers: {
					"Content-Type": "application/json",
				},
				method: "POST",
			});
			if (!response.ok) {
				const responseText = await response.text();
				throw new Error(
					`Pakasir transaction cancel failed: ${responseText || response.statusText}`,
				);
			}

			await ctx.runMutation(internal.payments.markFailed, {
				refId: checkout.activePayment.refId,
			});
		}

		await ctx.runMutation(api.reservations.cancel, {
			reservationId: args.reservationId,
		});
		return { result: "cancelled" as const };
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

export const getReservationPayment = internalQuery({
	args: {
		reservationId: v.id("reservations"),
	},
	returns: v.union(paymentValidator, v.null()),
	handler: async (ctx, args) => {
		const reservation = await ctx.db.get(args.reservationId);
		if (!reservation) {
			return null;
		}

		if (reservation.paymentRef) {
			return await ctx.db
				.query("payments")
				.withIndex("by_refId", (query) =>
					query.eq("refId", reservation.paymentRef!),
				)
				.unique();
		}

		const payments = await ctx.db
			.query("payments")
			.withIndex("by_targetId_and_type", (query) =>
				query.eq("targetId", args.reservationId).eq("type", "reservation"),
			)
			.collect();

		return (
			payments.sort((left, right) => right.createdAt - left.createdAt)[0] ??
			null
		);
	},
});

export const claimReservationCheckoutLock = internalMutation({
	args: {
		referenceTimestamp: v.number(),
		reservationId: v.id("reservations"),
		userId: v.id("users"),
	},
	returns: checkoutLockResultValidator,
	handler: async (ctx, args) => {
		const reservation = await ctx.db.get(args.reservationId);
		if (
			!reservation ||
			reservation.userId !== args.userId ||
			reservation.status !== "pending"
		) {
			return { status: "not_found" as const };
		}

		const payments = await ctx.db
			.query("payments")
			.withIndex("by_targetId_and_type", (query) =>
				query.eq("targetId", reservation._id).eq("type", "reservation"),
			)
			.collect();
		const activePayment = selectActiveReservationPayment(
			payments,
			args.referenceTimestamp,
		);

		if (activePayment) {
			if (
				reservation.checkoutLockExpiresAt !== undefined ||
				reservation.checkoutLockToken !== undefined
			) {
				await ctx.db.patch(reservation._id, {
					checkoutLockExpiresAt: undefined,
					checkoutLockToken: undefined,
				});
			}
			return {
				activePayment,
				reservationId: reservation._id,
				status: "active" as const,
			};
		}

		if (
			typeof reservation.checkoutLockExpiresAt === "number" &&
			typeof reservation.checkoutLockToken === "string" &&
			reservation.checkoutLockExpiresAt > args.referenceTimestamp
		) {
			return {
				lockExpiresAt: reservation.checkoutLockExpiresAt,
				status: "locked" as const,
			};
		}

		const lockExpiresAt = args.referenceTimestamp + CHECKOUT_LOCK_MS;
		const lockToken = createCheckoutLockToken();
		await ctx.db.patch(reservation._id, {
			checkoutLockExpiresAt: lockExpiresAt,
			checkoutLockToken: lockToken,
		});

		return {
			lockExpiresAt,
			lockToken,
			reservation: {
				confirmationCode: reservation.confirmationCode,
				durationHours: reservation.durationHours,
				guestCount: reservation.guestCount,
				reservationId: reservation._id,
				startTime: reservation.startTime,
				userId: reservation.userId,
			},
			status: "ready" as const,
		};
	},
});

export const releaseReservationCheckoutLock = internalMutation({
	args: {
		lockToken: v.string(),
		reservationId: v.id("reservations"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const reservation = await ctx.db.get(args.reservationId);
		if (!reservation || reservation.status !== "pending") {
			return null;
		}

		if (reservation.checkoutLockToken !== args.lockToken) {
			return null;
		}

		await ctx.db.patch(reservation._id, {
			checkoutLockExpiresAt: undefined,
			checkoutLockToken: undefined,
		});
		return null;
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
			.withIndex("by_targetId_and_type", (query) =>
				query.eq("targetId", reservation._id).eq("type", "reservation"),
			)
			.collect();

		const activePayment = selectActiveReservationPayment(
			payments,
			args.referenceTimestamp,
		);

		return {
			activePayment,
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
		checkoutLockToken: v.optional(v.string()),
		expiresAt: v.number(),
		fee: v.optional(v.number()),
		paymentMethod: v.string(),
		paymentNumber: v.string(),
		provider: v.literal("pakasir"),
		refId: v.string(),
		reservationId: v.id("reservations"),
		totalPayment: v.number(),
	},
	returns: paymentValidator,
	handler: async (ctx, args) => {
		const expiresInMs = Math.max(0, args.expiresAt - Date.now());
		const existingPayments = await ctx.db
			.query("payments")
			.withIndex("by_targetId_and_type", (query) =>
				query.eq("targetId", args.reservationId).eq("type", "reservation"),
			)
			.collect();

		for (const payment of existingPayments) {
			if (payment.status === "pending" && payment.refId !== args.refId) {
				await ctx.db.patch(payment._id, {
					status: "failed",
				});
			}
		}

		const existing = existingPayments.find(
			(payment) => payment.refId === args.refId,
		);
		if (existing) {
			await ctx.db.patch(existing._id, {
				amount: args.amount,
				expiresAt: args.expiresAt,
				fee: args.fee,
				paymentMethod: args.paymentMethod,
				paymentNumber: args.paymentNumber,
				provider: args.provider,
				status: "pending",
				totalPayment: args.totalPayment,
			});
			const payment = await ctx.db.get(existing._id);
			if (!payment) {
				throw new Error("Payment record not found");
			}
			const reservation = await ctx.db.get(args.reservationId);
			if (
				reservation &&
				args.checkoutLockToken &&
				reservation.checkoutLockToken === args.checkoutLockToken
			) {
				await ctx.db.patch(reservation._id, {
					checkoutLockExpiresAt: undefined,
					checkoutLockToken: undefined,
				});
			}
			await ctx.scheduler.runAfter(
				expiresInMs,
				internal.payments.expireReservationPayment,
				{ refId: args.refId },
			);
			await ctx.scheduler.runAfter(
				expiresInMs,
				internal.reservations.expirePendingReservation,
				{ reservationId: args.reservationId },
			);
			return payment;
		}

		const id = await ctx.db.insert("payments", {
			amount: args.amount,
			createdAt: Date.now(),
			currency: "IDR",
			expiresAt: args.expiresAt,
			fee: args.fee,
			paymentMethod: args.paymentMethod,
			paymentNumber: args.paymentNumber,
			provider: args.provider,
			refId: args.refId,
			status: "pending",
			targetId: args.reservationId,
			totalPayment: args.totalPayment,
			type: "reservation",
		});

		const payment = await ctx.db.get(id);
		if (!payment) {
			throw new Error("Payment record not found");
		}
		const reservation = await ctx.db.get(args.reservationId);
		if (
			reservation &&
			args.checkoutLockToken &&
			reservation.checkoutLockToken === args.checkoutLockToken
		) {
			await ctx.db.patch(reservation._id, {
				checkoutLockExpiresAt: undefined,
				checkoutLockToken: undefined,
			});
		}
		await ctx.scheduler.runAfter(
			expiresInMs,
			internal.payments.expireReservationPayment,
			{ refId: args.refId },
		);
		await ctx.scheduler.runAfter(
			expiresInMs,
			internal.reservations.expirePendingReservation,
			{ reservationId: args.reservationId },
		);

		return payment;
	},
});

export const markFailed = internalMutation({
	args: {
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

		if (payment.status !== "pending") {
			return payment;
		}

		await ctx.db.patch(payment._id, {
			status: "failed",
		});
		return await ctx.db.get(payment._id);
	},
});

export const markPaid = internalMutation({
	args: {
		amount: v.optional(v.number()),
		completedAt: v.optional(v.number()),
		paymentMethod: v.optional(v.string()),
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
			...(args.completedAt !== undefined
				? { completedAt: args.completedAt }
				: {}),
			...(args.paymentMethod ? { paymentMethod: args.paymentMethod } : {}),
			status: "paid",
		});

		return await ctx.db.get(payment._id);
	},
});

export const expireReservationPayment = internalMutation({
	args: {
		refId: v.string(),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const payment = await ctx.db
			.query("payments")
			.withIndex("by_refId", (query) => query.eq("refId", args.refId))
			.unique();

		if (!payment || payment.status !== "pending") {
			return null;
		}

		await ctx.db.patch(payment._id, {
			status: "failed",
		});
		return null;
	},
});

export const applyReservationPaymentSuccess = internalMutation({
	args: {
		amount: v.optional(v.number()),
		completedAt: v.optional(v.number()),
		paymentMethod: v.optional(v.string()),
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
			completedAt: args.completedAt,
			paymentMethod: args.paymentMethod,
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

export const pakasirWebhook = httpAction(async (ctx, request) => {
	const payload = parsePakasirWebhookPayload(await request.json());
	if (
		!payload.orderId ||
		payload.project !== getPakasirProject() ||
		payload.status !== "completed"
	) {
		return jsonResponse({ message: "Ignored" });
	}

	const payment = await ctx.runQuery(internal.payments.getByRefId, {
		refId: payload.orderId,
	});
	if (!payment) {
		return jsonResponse({ message: "Payment not found" });
	}

	const detail = await fetchPakasirTransactionDetail({
		amount: payment.amount,
		refId: payment.refId,
	});
	if (
		!detail ||
		detail.project !== getPakasirProject() ||
		detail.orderId !== payment.refId ||
		detail.amount !== payment.amount ||
		detail.status !== "completed"
	) {
		return jsonResponse({ message: "Ignored" });
	}

	const result = await ctx.runMutation(
		internal.payments.applyReservationPaymentSuccess,
		{
			amount: detail.amount,
			completedAt: detail.completedAt,
			paymentMethod: detail.paymentMethod,
			refId: detail.orderId,
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

const paymentListRowValidator = v.object({
	_creationTime: v.number(),
	_id: v.id("payments"),
	amount: v.number(),
	checkoutUrl: v.optional(v.string()),
	completedAt: v.optional(v.number()),
	createdAt: v.number(),
	currency: v.literal("IDR"),
	customerEmail: v.optional(v.string()),
	customerName: v.optional(v.string()),
	expiresAt: v.optional(v.number()),
	fee: v.optional(v.number()),
	paymentMethod: v.optional(v.string()),
	paymentNumber: v.optional(v.string()),
	provider: v.optional(paymentProviderValidator),
	refId: v.string(),
	status: paymentStatusValidator,
	tableLabel: v.optional(v.string()),
	tableZone: v.optional(v.string()),
	targetId: v.string(),
	totalPayment: v.optional(v.number()),
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

				const [table, user] = await Promise.all([
					ctx.db.get(reservation.tableId),
					ctx.db.get(reservation.userId),
				]);

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

export const syncReservationPaymentStatus = action({
	args: {
		refId: v.string(),
	},
	returns: syncReservationPaymentResultValidator,
	handler: async (ctx, args) => {
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

		const detail = await fetchPakasirTransactionDetail({
			amount: payment.amount,
			refId: payment.refId,
		});

		if (!detail) {
			return {
				result: "not_found_in_pakasir" as const,
			};
		}

		if (
			detail.project !== getPakasirProject() ||
			detail.orderId !== payment.refId ||
			detail.amount !== payment.amount
		) {
			return {
				apiStatus: detail.status,
				result: "mismatch" as const,
			};
		}

		if (detail.status !== "completed") {
			return {
				apiStatus: detail.status,
				result: "pending" as const,
			};
		}

		const applyResult = await ctx.runMutation(
			internal.payments.applyReservationPaymentSuccess,
			{
				amount: detail.amount,
				completedAt: detail.completedAt,
				paymentMethod: detail.paymentMethod,
				refId: detail.orderId,
			},
		);

		if (applyResult === "already_paid" || applyResult === "applied") {
			return { apiStatus: "completed", result: "paid" as const };
		}

		if (applyResult === "ignored") {
			return { apiStatus: "completed", result: "ignored" as const };
		}

		return { apiStatus: detail.status, result: "pending" as const };
	},
});
