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
	process.env.MAYAR_API_KEY = "test-key";
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
		).rejects.toThrow("Mayar payment creation failed");

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
			checkoutUrl: "https://pay.example/txn-1",
			expiresAt: Date.now() + PENDING_EXPIRY_MS,
			refId: "txn-1",
			reservationId: reservation.reservationId,
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
