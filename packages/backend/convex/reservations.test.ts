/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
	BUSINESS_TIMEZONE_OFFSET_MS,
	PENDING_EXPIRY_MS,
} from "./lib/reservation_utils";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function createBackendTest() {
	return convexTest(schema, modules);
}

function createBusinessTimestamp(daysFromNow: number, hour: number) {
	const businessDate = new Date(Date.now() + BUSINESS_TIMEZONE_OFFSET_MS);
	businessDate.setUTCHours(hour, 0, 0, 0);
	businessDate.setUTCDate(businessDate.getUTCDate() + daysFromNow);
	return businessDate.getTime() - BUSINESS_TIMEZONE_OFFSET_MS;
}

async function seedUser(
	t: ReturnType<typeof createBackendTest>,
	args: {
		authId?: string;
		email: string;
		name: string;
		phone?: string;
		role?: "admin" | "customer" | "staff";
	},
): Promise<Id<"users">> {
	return await t.run(async (ctx) => {
		return await ctx.db.insert("users", {
			authId: args.authId,
			createdAt: Date.now(),
			email: args.email,
			name: args.name,
			phone: args.phone,
			role: args.role ?? "customer",
		});
	});
}

async function seedTable(
	t: ReturnType<typeof createBackendTest>,
	args?: { label?: string; status?: "available" | "booked" | "inactive" | "occupied" },
): Promise<Id<"tables">> {
	return await t.run(async (ctx) => {
		return await ctx.db.insert("tables", {
			capacity: 4,
			createdAt: Date.now(),
			label: args?.label ?? "T1",
			positionX: 40,
			positionY: 40,
			status: args?.status ?? "available",
			zone: "Indoor",
		});
	});
}

afterEach(() => {
	vi.unstubAllGlobals();
});

beforeEach(() => {
	process.env.PAKASIR_API_KEY = "test-key";
	process.env.PAKASIR_PROJECT = "campus-cafe";
	process.env.RESERVATION_PRICE_PER_HOUR = "50000";
	process.env.SITE_URL = "https://campus-cafe.test";
});

describe("reservation state machine", () => {
	test("rejects overlapping reservations for the same table slot", async () => {
		const t = createBackendTest();
		const userId = await seedUser(t, {
			email: "overlap@example.com",
			name: "Overlap User",
		});
		const tableId = await seedTable(t);
		const startTime = createBusinessTimestamp(1, 10);

		await t.mutation(internal.reservations.createPendingForCheckout, {
			durationHours: 2,
			guestCount: 2,
			startTime,
			tableId,
			userId,
		});

		await expect(
			t.mutation(internal.reservations.createPendingForCheckout, {
				durationHours: 1,
				guestCount: 2,
				startTime: startTime + 60 * 60 * 1000,
				tableId,
				userId,
			}),
		).rejects.toThrow("Table is not available for the selected time");
	});

	test("allows non-overlapping reservations for the same table", async () => {
		const t = createBackendTest();
		const userId = await seedUser(t, {
			email: "non-overlap@example.com",
			name: "Non Overlap User",
		});
		const tableId = await seedTable(t);
		const startTime = createBusinessTimestamp(1, 10);

		await t.mutation(internal.reservations.createPendingForCheckout, {
			durationHours: 1,
			guestCount: 2,
			startTime,
			tableId,
			userId,
		});

		const nextReservation = await t.mutation(
			internal.reservations.createPendingForCheckout,
			{
				durationHours: 1,
				guestCount: 2,
				startTime: createBusinessTimestamp(1, 12),
				tableId,
				userId,
			},
		);

		expect(nextReservation.reservationId).toBeTruthy();
	});

	test("rejects invalid reservation windows on the server", async () => {
		const t = createBackendTest();
		const userId = await seedUser(t, {
			email: "window@example.com",
			name: "Window User",
		});
		const tableId = await seedTable(t);

		await expect(
			t.mutation(internal.reservations.createPendingForCheckout, {
				durationHours: 1,
				guestCount: 2,
				startTime: createBusinessTimestamp(1, 9),
				tableId,
				userId,
			}),
		).rejects.toThrow("Reservation time must be between 10:00 and 21:00");
	});

	test("cancels the pending hold when checkout fails before a payment link is stored", async () => {
		const t = createBackendTest();
		await seedUser(t, {
			authId: "customer-auth-1",
			email: "customer@example.com",
			name: "Customer",
			phone: "+628111111111",
		});
		const tableId = await seedTable(t);
		const asCustomer = t.withIdentity({
			email: "customer@example.com",
			name: "Customer",
			subject: "customer-auth-1",
		});

		vi.stubGlobal(
			"fetch",
			vi.fn(
				async () =>
					new Response("upstream payment error", {
						status: 500,
					}),
			),
		);

		await expect(
			asCustomer.action(api.payments.startReservationCheckout, {
				durationHours: 1,
				guestCount: 2,
				mode: "new",
				startTime: createBusinessTimestamp(1, 10),
				tableId,
			}),
		).rejects.toThrow("Pakasir payment creation failed");

		const reservationStatuses = await t.run(async (ctx) => {
			return (await ctx.db.query("reservations").collect()).map(
				(reservation) => reservation.status,
			);
		});
		const paymentCount = await t.run(async (ctx) => {
			return (await ctx.db.query("payments").collect()).length;
		});

		expect(reservationStatuses).toEqual(["cancelled"]);
		expect(paymentCount).toBe(0);
	});

	test("applies reservation payments idempotently", async () => {
		const t = createBackendTest();
		const userId = await seedUser(t, {
			email: "paid@example.com",
			name: "Paid User",
		});
		const tableId = await seedTable(t);
		const reservation = await t.mutation(
			internal.reservations.createPendingForCheckout,
			{
				durationHours: 1,
				guestCount: 2,
				startTime: createBusinessTimestamp(1, 13),
				tableId,
				userId,
			},
		);

		await t.mutation(internal.payments.recordPendingReservationPayment, {
			amount: 50000,
			expiresAt: Date.now() + PENDING_EXPIRY_MS,
			fee: 1000,
			paymentMethod: "qris",
			paymentNumber: "000201010212-test",
			provider: "pakasir",
			refId: "txn-1",
			reservationId: reservation.reservationId,
			totalPayment: 51000,
		});

		const firstApply = await t.mutation(
			internal.payments.applyReservationPaymentSuccess,
			{
				amount: 50000,
				refId: "txn-1",
			},
		);
		const secondApply = await t.mutation(
			internal.payments.applyReservationPaymentSuccess,
			{
				amount: 50000,
				refId: "txn-1",
			},
		);
		const reservationRecord = await t.run(async (ctx) => {
			return await ctx.db.get(reservation.reservationId);
		});

		expect(firstApply).toBe("applied");
		expect(secondApply).toBe("already_paid");
		expect(reservationRecord?.status).toBe("confirmed");
		expect(reservationRecord?.paymentRef).toBe("txn-1");
	}, 10000);

	test("cancels active Pakasir checkout and releases the reservation", async () => {
		const t = createBackendTest();
		await seedUser(t, {
			authId: "customer-auth-2",
			email: "cancel@example.com",
			name: "Cancel User",
		});
		const tableId = await seedTable(t);
		const asCustomer = t.withIdentity({
			email: "cancel@example.com",
			name: "Cancel User",
			subject: "customer-auth-2",
		});

		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							payment: {
								amount: 50000,
								expired_at: new Date(Date.now() + PENDING_EXPIRY_MS).toISOString(),
								fee: 1000,
								order_id: "RES-CANCEL-1",
								payment_method: "qris",
								payment_number: "000201010212-cancel",
								project: "campus-cafe",
								total_payment: 51000,
							},
						}),
						{ status: 200 },
					),
				)
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							transaction: {
								amount: 50000,
								order_id: "RES-CANCEL-1",
								payment_method: "qris",
								project: "campus-cafe",
								status: "pending",
							},
						}),
						{ status: 200 },
					),
				)
				.mockResolvedValueOnce(new Response("{}", { status: 200 })),
		);

		const checkout = await asCustomer.action(api.payments.startReservationCheckout, {
			durationHours: 1,
			guestCount: 2,
			mode: "new",
			startTime: createBusinessTimestamp(1, 11),
			tableId,
		});

		const cancelled = await asCustomer.action(api.payments.cancelReservationCheckout, {
			reservationId: checkout.reservationId,
		});
		const [reservationRecord, paymentRecord] = await t.run(async (ctx) => {
			return await Promise.all([
				ctx.db.get(checkout.reservationId),
				ctx.db
					.query("payments")
					.withIndex("by_refId", (query) =>
						query.eq("refId", checkout.activePayment.refId),
					)
					.unique(),
			]);
		});

		expect(cancelled.result).toBe("cancelled");
		expect(reservationRecord?.status).toBe("cancelled");
		expect(paymentRecord?.status).toBe("failed");
	});

	test("serializes checkout creation with a reservation-level lock", async () => {
		const t = createBackendTest();
		const userId = await seedUser(t, {
			email: "race@example.com",
			name: "Race User",
		});
		const tableId = await seedTable(t);
		const reservation = await t.mutation(
			internal.reservations.createPendingForCheckout,
			{
				durationHours: 1,
				guestCount: 2,
				startTime: createBusinessTimestamp(1, 15),
				tableId,
				userId,
			},
		);
		const firstClaim = await t.mutation(
			internal.payments.claimReservationCheckoutLock,
			{
				referenceTimestamp: Date.now(),
				reservationId: reservation.reservationId,
				userId,
			},
		);
		const secondClaim = await t.mutation(
			internal.payments.claimReservationCheckoutLock,
			{
				referenceTimestamp: Date.now(),
				reservationId: reservation.reservationId,
				userId,
			},
		);

		expect(firstClaim.status).toBe("ready");
		expect(secondClaim.status).toBe("locked");
		if (firstClaim.status !== "ready") {
			throw new Error("Expected first checkout claim to acquire the lock");
		}

		await t.mutation(internal.payments.recordPendingReservationPayment, {
			amount: 50000,
			checkoutLockToken: firstClaim.lockToken,
			expiresAt: Date.now() + PENDING_EXPIRY_MS,
			fee: 1000,
			paymentMethod: "qris",
			paymentNumber: "000201010212-race",
			provider: "pakasir",
			refId: "RES-RACE-1",
			reservationId: reservation.reservationId,
			totalPayment: 51000,
		});

		const activeClaim = await t.mutation(
			internal.payments.claimReservationCheckoutLock,
			{
				reservationId: reservation.reservationId,
				referenceTimestamp: Date.now(),
				userId,
			},
		);

		expect(activeClaim.status).toBe("active");
		if (activeClaim.status !== "active") {
			throw new Error("Expected checkout claim to return an active payment");
		}
		expect(activeClaim.activePayment.refId).toBe("RES-RACE-1");
	});

	test("allows cancelling a pending checkout even inside the normal cutoff window", async () => {
		const t = createBackendTest();
		await seedUser(t, {
			authId: "customer-auth-cutoff",
			email: "cutoff@example.com",
			name: "Cutoff User",
		});
		const tableId = await seedTable(t);
		const reservationId = await t.run(async (ctx) => {
			return await ctx.db.insert("reservations", {
				createdAt: Date.now(),
				durationHours: 1,
				guestCount: 2,
				startTime: Date.now() + 30 * 60 * 1000,
				status: "pending",
				tableId,
				userId: (await ctx.db
					.query("users")
					.withIndex("by_email", (query) => query.eq("email", "cutoff@example.com"))
					.unique())!._id,
			});
		});
		await t.mutation(internal.payments.recordPendingReservationPayment, {
			amount: 50000,
			expiresAt: Date.now() + PENDING_EXPIRY_MS,
			fee: 1000,
			paymentMethod: "qris",
			paymentNumber: "000201010212-cutoff",
			provider: "pakasir",
			refId: "RES-CUTOFF-1",
			reservationId,
			totalPayment: 51000,
		});
		const asCustomer = t.withIdentity({
			email: "cutoff@example.com",
			name: "Cutoff User",
			subject: "customer-auth-cutoff",
		});

		vi.stubGlobal(
			"fetch",
			vi
				.fn()
				.mockResolvedValueOnce(
					new Response(
						JSON.stringify({
							transaction: {
								amount: 50000,
								order_id: "RES-CUTOFF-1",
								payment_method: "qris",
								project: "campus-cafe",
								status: "pending",
							},
						}),
						{ status: 200 },
					),
				)
				.mockResolvedValueOnce(new Response("{}", { status: 200 })),
		);

		const result = await asCustomer.action(api.payments.cancelReservationCheckout, {
			reservationId,
		});
		const [reservationRecord, paymentRecord] = await t.run(async (ctx) => {
			return await Promise.all([
				ctx.db.get(reservationId),
				ctx.db
					.query("payments")
					.withIndex("by_refId", (query) => query.eq("refId", "RES-CUTOFF-1"))
					.unique(),
			]);
		});

		expect(result.result).toBe("cancelled");
		expect(reservationRecord?.status).toBe("cancelled");
		expect(paymentRecord?.status).toBe("failed");
	});

	test("rejects manual sync when Pakasir detail does not match local payment", async () => {
		const t = createBackendTest();
		const userId = await seedUser(t, {
			email: "sync@example.com",
			name: "Sync User",
		});
		await seedUser(t, {
			authId: "admin-auth-1",
			email: "admin@example.com",
			name: "Admin",
			role: "admin",
		});
		const tableId = await seedTable(t);
		const reservation = await t.mutation(
			internal.reservations.createPendingForCheckout,
			{
				durationHours: 1,
				guestCount: 2,
				startTime: createBusinessTimestamp(1, 16),
				tableId,
				userId,
			},
		);
		await t.mutation(internal.payments.recordPendingReservationPayment, {
			amount: 50000,
			expiresAt: Date.now() + PENDING_EXPIRY_MS,
			fee: 1000,
			paymentMethod: "qris",
			paymentNumber: "000201010212-sync",
			provider: "pakasir",
			refId: "RES-SYNC-1",
			reservationId: reservation.reservationId,
			totalPayment: 51000,
		});
		const asAdmin = t.withIdentity({
			email: "admin@example.com",
			name: "Admin",
			subject: "admin-auth-1",
		});

		vi.stubGlobal(
			"fetch",
			vi.fn(async () =>
				new Response(
					JSON.stringify({
						transaction: {
							amount: 51000,
							order_id: "RES-SYNC-1",
							payment_method: "qris",
							project: "campus-cafe",
							status: "completed",
						},
					}),
					{ status: 200 },
				),
			),
		);

		const syncResult = await asAdmin.action(api.payments.syncReservationPaymentStatus, {
			refId: "RES-SYNC-1",
		});
		const reservationRecord = await t.run(async (ctx) => {
			return await ctx.db.get(reservation.reservationId);
		});

		expect(syncResult.result).toBe("mismatch");
		expect(reservationRecord?.status).toBe("pending");
	});

	test("selects the payment referenced by reservation.paymentRef for summaries", async () => {
		const t = createBackendTest();
		const userId = await seedUser(t, {
			email: "summary@example.com",
			name: "Summary User",
		});
		const tableId = await seedTable(t);
		const reservationId = await t.run(async (ctx) => {
			return await ctx.db.insert("reservations", {
				createdAt: Date.now(),
				durationHours: 1,
				guestCount: 2,
				paymentRef: "RES-PAID-2",
				startTime: createBusinessTimestamp(1, 17),
				status: "confirmed",
				tableId,
				userId,
			});
		});
		await t.run(async (ctx) => {
			await ctx.db.insert("payments", {
				amount: 50000,
				createdAt: Date.now() - 1000,
				currency: "IDR",
				fee: 1000,
				paymentMethod: "qris",
				paymentNumber: "000201010212-old",
				provider: "pakasir",
				refId: "RES-PAID-1",
				status: "failed",
				targetId: reservationId,
				totalPayment: 51000,
				type: "reservation",
			});
			await ctx.db.insert("payments", {
				amount: 60000,
				completedAt: Date.now(),
				createdAt: Date.now(),
				currency: "IDR",
				fee: 2000,
				paymentMethod: "qris",
				paymentNumber: "000201010212-paid",
				provider: "pakasir",
				refId: "RES-PAID-2",
				status: "paid",
				targetId: reservationId,
				totalPayment: 62000,
				type: "reservation",
			});
		});

		const payment = await t.query(internal.payments.getReservationPayment, {
			reservationId,
		});

		expect(payment?.refId).toBe("RES-PAID-2");
		expect(payment?.totalPayment).toBe(62000);
	});

	test("derives table status from active confirmed reservations without locking the table early", async () => {
		const t = createBackendTest();
		const userId = await seedUser(t, {
			email: "future@example.com",
			name: "Future User",
		});
		const tableId = await seedTable(t);
		const futureStartTime = createBusinessTimestamp(1, 14);

		const futureReservation = await t.mutation(
			internal.reservations.createPendingForCheckout,
			{
				durationHours: 1,
				guestCount: 2,
				startTime: futureStartTime,
				tableId,
				userId,
			},
		);
		await t.mutation(internal.reservations.confirm, {
			paymentRef: "future-ref",
			reservationId: futureReservation.reservationId,
		});

		const tablesNow = await t.query(api.tables.list, {
			referenceTimestamp: Date.now(),
		});
		const tablesDuringReservation = await t.query(api.tables.list, {
			referenceTimestamp: futureStartTime + 15 * 60 * 1000,
		});

		expect(tablesNow.find((table) => table._id === tableId)?.status).toBe(
			"available",
		);
		expect(
			tablesDuringReservation.find((table) => table._id === tableId)?.status,
		).toBe("booked");
	});

	test("release keeps an active confirmed reservation visible on the floor plan", async () => {
		const t = createBackendTest();
		const customerId = await seedUser(t, {
			email: "active@example.com",
			name: "Active Customer",
		});
		await seedUser(t, {
			authId: "staff-auth-1",
			email: "staff@example.com",
			name: "Staff",
			role: "staff",
		});
		const tableId = await seedTable(t, { status: "occupied" });
		const now = Date.now();

		await t.run(async (ctx) => {
			await ctx.db.insert("reservations", {
				confirmationCode: "ACTIVE123",
				createdAt: now - 60 * 1000,
				durationHours: 1,
				guestCount: 2,
				paymentRef: "active-ref",
				startTime: now - 30 * 60 * 1000,
				status: "confirmed",
				tableId,
				userId: customerId,
			});
		});

		const asStaff = t.withIdentity({
			email: "staff@example.com",
			name: "Staff",
			subject: "staff-auth-1",
		});
		await asStaff.mutation(api.tables.release, { id: tableId });

		const tablesNow = await t.query(api.tables.list, {
			referenceTimestamp: now,
		});

		expect(tablesNow.find((table) => table._id === tableId)?.status).toBe(
			"booked",
		);
	});
});
