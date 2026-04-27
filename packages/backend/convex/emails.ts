import { Resend } from "@convex-dev/resend";
import { v } from "convex/values";

import { components, internal } from "./_generated/api";
import { internalMutation } from "./_generated/server";

const HOUR_MS = 60 * 60 * 1000;

export const resend = new Resend(components.resend, {
	testMode: process.env.RESEND_TEST_MODE !== "false",
});

function getEmailFrom(): string {
	return (
		process.env.EMAIL_FROM_ADDRESS ?? "Campus Cafe <onboarding@resend.dev>"
	);
}

function getSiteBaseUrl(): string {
	const siteUrl = process.env.SITE_URL;
	if (!siteUrl) {
		return "http://localhost:5173";
	}
	return siteUrl.replace(/\/$/, "");
}

function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}

import { formatIdr } from "./lib/format-idr";

function formatDateTimeId(ms: number): { date: string; timeRange: string } {
	const start = new Date(ms);
	const formatterDate = new Intl.DateTimeFormat("id-ID", {
		dateStyle: "full",
		timeZone: "Asia/Jakarta",
	});
	const formatterTime = new Intl.DateTimeFormat("id-ID", {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Asia/Jakarta",
	});
	return {
		date: formatterDate.format(start),
		timeRange: formatterTime.format(start),
	};
}

function renderBookingHtml(input: {
	code: string;
	customerName: string;
	durationHours: 1 | 2 | 3;
	endTimeMs: number;
	guestCount: number;
	startTimeMs: number;
	tableLabel: string;
	totalIdr: string;
	zone: string;
}): string {
	const { date, timeRange } = formatDateTimeId(input.startTimeMs);
	const endTime = new Intl.DateTimeFormat("id-ID", {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Asia/Jakarta",
	}).format(new Date(input.endTimeMs));

	return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>Halo ${escapeHtml(input.customerName)},</p>
  <p>Reservasi meja kamu di <strong>Campus Cafe</strong> sudah <strong>dikonfirmasi</strong>.</p>
  <div style="border: 2px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0; background: #fffbeb;">
    <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; color: #92400e;">Kode konfirmasi</p>
    <p style="margin: 0; font-size: 24px; font-family: ui-monospace, monospace; font-weight: 700; color: #b45309;">${escapeHtml(input.code)}</p>
  </div>
  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <tr><td style="padding: 6px 0; color: #666;">Meja</td><td style="padding: 6px 0;"><strong>${escapeHtml(input.tableLabel)}</strong> — ${escapeHtml(input.zone)}</td></tr>
    <tr><td style="padding: 6px 0; color: #666;">Tanggal</td><td style="padding: 6px 0;">${escapeHtml(date)}</td></tr>
    <tr><td style="padding: 6px 0; color: #666;">Waktu</td><td style="padding: 6px 0;">${escapeHtml(timeRange)} – ${escapeHtml(endTime)} (${input.durationHours} jam)</td></tr>
    <tr><td style="padding: 6px 0; color: #666;">Jumlah tamu</td><td style="padding: 6px 0;">${input.guestCount}</td></tr>
    <tr><td style="padding: 6px 0; color: #666;">Total dibayar</td><td style="padding: 6px 0;"><strong>${escapeHtml(input.totalIdr)}</strong></td></tr>
  </table>
  <p style="font-size: 13px; color: #444; margin-top: 20px;">
    <strong>Kebijakan pembatalan:</strong> pembatalan dapat dilakukan minimal 2 jam sebelum jadwal. Refund (jika berlaku) diproses manual dalam 1–3 hari kerja.
  </p>
  <p style="margin-top: 24px;">
    <a href="${escapeHtml(`${getSiteBaseUrl()}/my-reservations`)}" style="display: inline-block; background: #f59e0b; color: #1a1a1a; text-decoration: none; padding: 10px 18px; border-radius: 6px; font-weight: 600;">Lihat reservasiku</a>
  </p>
  <p style="font-size: 12px; color: #888; margin-top: 32px;">— Campus Cafe</p>
</body>
</html>
`;
}

function renderCancellationHtml(input: {
	code: string | undefined;
	customerName: string;
	durationHours: 1 | 2 | 3;
	endTimeMs: number;
	guestCount: number;
	startTimeMs: number;
	tableLabel: string;
	zone: string;
}): string {
	const { date, timeRange } = formatDateTimeId(input.startTimeMs);
	const endTime = new Intl.DateTimeFormat("id-ID", {
		hour: "2-digit",
		minute: "2-digit",
		timeZone: "Asia/Jakarta",
	}).format(new Date(input.endTimeMs));

	return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: system-ui, sans-serif; line-height: 1.5; color: #1a1a1a; max-width: 560px; margin: 0 auto; padding: 24px;">
  <p>Halo ${escapeHtml(input.customerName)},</p>
  <p>Pembatalan reservasi meja kamu di <strong>Campus Cafe</strong> sudah kami terima.</p>
  ${input.code ? `<p style="font-family: ui-monospace, monospace;">Kode konfirmasi: <strong>${escapeHtml(input.code)}</strong></p>` : ""}
  <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin: 16px 0;">
    <tr><td style="padding: 6px 0; color: #666;">Meja</td><td style="padding: 6px 0;"><strong>${escapeHtml(input.tableLabel)}</strong> — ${escapeHtml(input.zone)}</td></tr>
    <tr><td style="padding: 6px 0; color: #666;">Tanggal</td><td style="padding: 6px 0;">${escapeHtml(date)}</td></tr>
    <tr><td style="padding: 6px 0; color: #666;">Waktu</td><td style="padding: 6px 0;">${escapeHtml(timeRange)} – ${escapeHtml(endTime)} (${input.durationHours} jam)</td></tr>
    <tr><td style="padding: 6px 0; color: #666;">Tamu</td><td style="padding: 6px 0;">${input.guestCount}</td></tr>
  </table>
  <p style="font-size: 14px; color: #333;">
    Jika pembayaran sudah dilakukan, <strong>refund akan diproses dalam 1–3 hari kerja</strong> melalui metode pembayaran asal.
  </p>
  <p style="font-size: 12px; color: #888; margin-top: 32px;">— Campus Cafe</p>
</body>
</html>
`;
}

export const sendBookingConfirmation = internalMutation({
	args: {
		reservationId: v.id("reservations"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const reservation = await ctx.db.get(args.reservationId);
		if (!reservation || reservation.status !== "confirmed") {
			return null;
		}

		const [table, user] = await Promise.all([
			ctx.db.get(reservation.tableId),
			ctx.db.get(reservation.userId),
		]);

		if (!table || !user) {
			return null;
		}

		const payment = await ctx.runQuery(
			internal.payments.getReservationPayment,
			{
				reservationId: args.reservationId,
			},
		);
		const totalIdr = formatIdr(payment?.totalPayment ?? payment?.amount ?? 0);
		const code = reservation.confirmationCode ?? "";
		const endTimeMs =
			reservation.startTime + reservation.durationHours * HOUR_MS;

		const html = renderBookingHtml({
			code,
			customerName: user.name,
			durationHours: reservation.durationHours,
			endTimeMs,
			guestCount: reservation.guestCount,
			startTimeMs: reservation.startTime,
			tableLabel: table.label,
			totalIdr,
			zone: table.zone,
		});

		try {
			await resend.sendEmail(ctx, {
				from: getEmailFrom(),
				html,
				subject: "Reservasi Meja Dikonfirmasi — Campus Cafe",
				to: user.email,
			});
		} catch (error) {
			console.error("sendBookingConfirmation failed:", error);
		}

		return null;
	},
});

export const sendCancellationNotice = internalMutation({
	args: {
		reservationId: v.id("reservations"),
	},
	returns: v.null(),
	handler: async (ctx, args) => {
		const reservation = await ctx.db.get(args.reservationId);
		if (!reservation || reservation.status !== "cancelled") {
			return null;
		}

		const [table, user] = await Promise.all([
			ctx.db.get(reservation.tableId),
			ctx.db.get(reservation.userId),
		]);

		if (!table || !user) {
			return null;
		}

		const endTimeMs =
			reservation.startTime + reservation.durationHours * HOUR_MS;

		const html = renderCancellationHtml({
			code: reservation.confirmationCode,
			customerName: user.name,
			durationHours: reservation.durationHours,
			endTimeMs,
			guestCount: reservation.guestCount,
			startTimeMs: reservation.startTime,
			tableLabel: table.label,
			zone: table.zone,
		});

		try {
			await resend.sendEmail(ctx, {
				from: getEmailFrom(),
				html,
				subject: "Pembatalan Dikonfirmasi — Campus Cafe",
				to: user.email,
			});
		} catch (error) {
			console.error("sendCancellationNotice failed:", error);
		}

		return null;
	},
});
