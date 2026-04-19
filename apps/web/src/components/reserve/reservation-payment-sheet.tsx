"use client";

import { api } from "@campus-cafe/backend/convex/_generated/api";
import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "@campus-cafe/ui/components/alert-dialog";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@campus-cafe/ui/components/alert";
import { Button } from "@campus-cafe/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@campus-cafe/ui/components/card";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@campus-cafe/ui/components/dialog";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@campus-cafe/ui/components/sheet";
import { useAction, useQuery } from "convex/react";
import { QRCodeCanvas } from "qrcode.react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

export type ReservationCheckoutSession = {
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
};

type ReservationPaymentSheetProps = {
	checkout: ReservationCheckoutSession;
	onOpenChange: (open: boolean) => void;
	open: boolean;
};

const amountFormatter = new Intl.NumberFormat("id-ID", {
	currency: "IDR",
	maximumFractionDigits: 0,
	style: "currency",
});

function formatCountdown(ms: number) {
	const totalSeconds = Math.max(0, Math.floor(ms / 1000));
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatDeadline(timestamp: number) {
	return new Intl.DateTimeFormat("id-ID", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(timestamp));
}

export default function ReservationPaymentSheet({
	checkout,
	onOpenChange,
	open,
}: ReservationPaymentSheetProps) {
	const cancelReservationCheckout = useAction(api.payments.cancelReservationCheckout);
	const reservation = useQuery(
		api.reservations.getById,
		open ? { id: checkout.reservationId } : "skip",
	);

	const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
	const [cancelling, setCancelling] = useState(false);
	const [guideOpen, setGuideOpen] = useState(false);
	const [now, setNow] = useState(() => Date.now());

	const previousStatusRef = useRef<
		"pending" | "confirmed" | "cancelled" | undefined
	>(undefined);
	const expiryNoticeShownRef = useRef(false);
	const qrContainerRef = useRef<HTMLDivElement | null>(null);

	const closeForTerminalReservation = (
		status: "cancelled" | "confirmed" | "missing",
	) => {
		if (status === "confirmed") {
			toast.success("Pembayaran terkonfirmasi. Reservasi kamu sudah aktif.");
		} else if (status === "cancelled") {
			toast.message("Checkout ditutup karena reservasi sudah tidak aktif.");
		} else {
			toast.message("Checkout ditutup karena reservasi tidak lagi tersedia.");
		}

		onOpenChange(false);
	};

	useEffect(() => {
		if (!open) {
			previousStatusRef.current = undefined;
			expiryNoticeShownRef.current = false;
			setCancelDialogOpen(false);
			setGuideOpen(false);
			return;
		}

		setNow(Date.now());
		expiryNoticeShownRef.current = false;
		const interval = window.setInterval(() => {
			setNow(Date.now());
		}, 1000);

		return () => window.clearInterval(interval);
	}, [checkout.reservationId, open]);

	useEffect(() => {
		if (!open || reservation === undefined) {
			return;
		}

		if (previousStatusRef.current === undefined) {
			previousStatusRef.current = reservation?.status;
			if (!reservation) {
				closeForTerminalReservation("missing");
				return;
			}
			if (reservation.status === "confirmed") {
				closeForTerminalReservation("confirmed");
				return;
			}
			if (reservation.status === "cancelled") {
				closeForTerminalReservation("cancelled");
				return;
			}
			return;
		}

		if (!reservation || previousStatusRef.current === reservation.status) {
			if (!reservation) {
				closeForTerminalReservation("missing");
			}
			return;
		}

		previousStatusRef.current = reservation.status;
		if (reservation.status === "confirmed") {
			closeForTerminalReservation("confirmed");
			return;
		}

		if (reservation.status === "cancelled") {
			closeForTerminalReservation("cancelled");
		}
	}, [onOpenChange, open, reservation]);

	const remainingMs = useMemo(
		() => Math.max(0, checkout.activePayment.expiresAt - now),
		[checkout.activePayment.expiresAt, now],
	);
	const isExpired = remainingMs <= 0;

	useEffect(() => {
		if (!open || !isExpired || expiryNoticeShownRef.current) {
			return;
		}

		expiryNoticeShownRef.current = true;
		toast.message("QRIS sudah kedaluwarsa. Buat transaksi baru untuk melanjutkan.");
		onOpenChange(false);
	}, [isExpired, onOpenChange, open]);

	const handleDownloadQr = () => {
		const canvas = qrContainerRef.current?.querySelector("canvas");
		if (!(canvas instanceof HTMLCanvasElement)) {
			toast.error("QR belum siap untuk diunduh.");
			return;
		}

		const link = document.createElement("a");
		link.download = `campus-cafe-qris-${checkout.activePayment.refId}.png`;
		link.href = canvas.toDataURL("image/png");
		link.click();
	};

	const handleCancel = async () => {
		setCancelling(true);

		try {
			const result = await cancelReservationCheckout({
				reservationId: checkout.reservationId,
			});

			if (result.result === "paid") {
				toast.success("Pembayaran sudah masuk. Reservasi dikonfirmasi.");
				onOpenChange(false);
				return;
			}

			if (result.result === "already_cancelled") {
				toast.message("Reservasi ini sudah dibatalkan.");
				onOpenChange(false);
				return;
			}

			toast.success("Reservasi berhasil dibatalkan.");
			onOpenChange(false);
		} catch (error) {
			toast.error(
				error instanceof Error ? error.message : "Gagal membatalkan reservasi",
			);
		} finally {
			setCancelling(false);
			setCancelDialogOpen(false);
		}
	};

	return (
		<>
			<Sheet open={open} onOpenChange={onOpenChange}>
				<SheetContent className="w-full p-0 sm:max-w-md">
					<SheetHeader>
						<SheetTitle>Bayar reservasi dengan QRIS</SheetTitle>
						<SheetDescription>
							Scan QRIS di bawah ini sebelum waktu habis. Reservasi akan
							terkonfirmasi otomatis setelah pembayaran masuk.
						</SheetDescription>
					</SheetHeader>

					<div className="flex flex-col gap-4 px-6 pb-6">
						<Card>
							<CardHeader className="pb-3">
								<CardTitle>Total pembayaran</CardTitle>
								<CardDescription>
									Jangan ubah nominal saat membayar.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col gap-3">
								<div className="font-semibold text-2xl">
									{amountFormatter.format(checkout.activePayment.totalPayment)}
								</div>
								<div className="flex items-center justify-between gap-3 text-sm">
									<span className="text-muted-foreground">Metode</span>
									<span className="font-medium uppercase">
										{checkout.activePayment.paymentMethod}
									</span>
								</div>
								{checkout.activePayment.fee ? (
									<div className="flex items-center justify-between gap-3 text-sm">
										<span className="text-muted-foreground">Biaya</span>
										<span>{amountFormatter.format(checkout.activePayment.fee)}</span>
									</div>
								) : null}
								<div className="flex items-center justify-between gap-3 text-sm">
									<span className="text-muted-foreground">Berlaku sampai</span>
									<span>{formatDeadline(checkout.activePayment.expiresAt)}</span>
								</div>
								<div className="flex items-center justify-between gap-3 rounded-2xl bg-muted px-3 py-2 text-sm">
									<span className="text-muted-foreground">Countdown</span>
									<span className="font-medium">{formatCountdown(remainingMs)}</span>
								</div>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-3">
								<CardTitle>QRIS pembayaran</CardTitle>
								<CardDescription>
									Scan dari mobile banking atau e-wallet yang mendukung QRIS.
								</CardDescription>
							</CardHeader>
							<CardContent className="flex flex-col items-center gap-4">
								<div
									className="rounded-3xl border bg-white p-4"
									ref={qrContainerRef}
								>
									<QRCodeCanvas
										level="M"
										marginSize={2}
										size={240}
										title="QRIS pembayaran reservasi Campus Cafe"
										value={checkout.activePayment.paymentNumber}
									/>
								</div>
								<p className="text-center text-muted-foreground text-sm">
									Jika aplikasi pembayaran mendukung upload dari galeri, kamu
									bisa unduh QR lalu gunakan gambar tersebut.
								</p>
							</CardContent>
						</Card>

						<Alert>
							<AlertTitle>Konfirmasi otomatis</AlertTitle>
							<AlertDescription>
								Setelah pembayaran sukses, status reservasi akan ter-update tanpa
								perlu refresh halaman secara manual.
							</AlertDescription>
						</Alert>

						<div className="grid gap-2 sm:grid-cols-2">
							<Button
								type="button"
								variant="outline"
								onClick={() => setGuideOpen(true)}
							>
								Payment guide
							</Button>
							<Button
								type="button"
								variant="secondary"
								onClick={handleDownloadQr}
							>
								Download QR
							</Button>
						</div>

						<Button
							disabled={cancelling || isExpired}
							type="button"
							variant="destructive"
							onClick={() => setCancelDialogOpen(true)}
						>
							{cancelling ? "Cancelling..." : "Cancel reservation"}
						</Button>

						<div className="rounded-2xl border bg-muted/40 px-4 py-3 text-muted-foreground text-xs">
							<div>Order ID: {checkout.activePayment.refId}</div>
							<div>
								Nominal dasar:{" "}
								{amountFormatter.format(checkout.activePayment.amount)}
							</div>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			<Dialog open={guideOpen} onOpenChange={setGuideOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Payment guide</DialogTitle>
						<DialogDescription>
							Ikuti langkah singkat berikut untuk menyelesaikan pembayaran QRIS.
						</DialogDescription>
					</DialogHeader>
					<div className="flex flex-col gap-3 text-sm">
						<p>1. Buka aplikasi mobile banking atau e-wallet yang mendukung QRIS.</p>
						<p>2. Scan QR yang tampil, atau unduh dulu gambarnya bila perlu.</p>
						<p>
							3. Pastikan total yang dibayar sama persis dengan nominal yang
							ditampilkan.
						</p>
						<p>
							4. Setelah pembayaran berhasil, tunggu konfirmasi otomatis pada
							halaman ini.
						</p>
					</div>
					<DialogFooter showCloseButton />
				</DialogContent>
			</Dialog>

			<AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
				<AlertDialogContent size="sm">
					<AlertDialogHeader>
						<AlertDialogTitle>Batalkan reservasi?</AlertDialogTitle>
						<AlertDialogDescription>
							Checkout QRIS yang masih aktif akan dibatalkan dan slot reservasi
							akan dilepas.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel disabled={cancelling}>
							Kembali
						</AlertDialogCancel>
						<AlertDialogAction
							disabled={cancelling}
							type="button"
							variant="destructive"
							onClick={() => void handleCancel()}
						>
							{cancelling ? "Cancelling..." : "Batalkan reservasi"}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
