import { api } from "@campus-cafe/backend/convex/_generated/api";
import { Button } from "@campus-cafe/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@campus-cafe/ui/components/card";
import { useAction, useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import ConfirmDialog from "@/components/confirm-dialog";
import ReservationPaymentSheet, {
	type ReservationCheckoutSession,
} from "@/components/reserve/reservation-payment-sheet";

type ReservationTab = "past" | "upcoming";

function formatDateTime(timestamp: number) {
	return new Intl.DateTimeFormat("id-ID", {
		dateStyle: "medium",
		timeStyle: "short",
	}).format(new Date(timestamp));
}

function getStatusClasses(status: "pending" | "confirmed" | "cancelled") {
	switch (status) {
		case "confirmed":
			return "border-primary/30 bg-primary/10 text-primary";
		case "cancelled":
			return "border-destructive/30 bg-destructive/10 text-destructive";
		case "pending":
			return "border-border bg-muted text-muted-foreground";
	}
}

function getStatusLabel(status: "pending" | "confirmed" | "cancelled") {
	switch (status) {
		case "pending":
			return "Pending";
		case "confirmed":
			return "Confirmed";
		case "cancelled":
			return "Cancelled";
	}
}

export default function MyReservationsPage() {
	const reservations = useQuery(api.reservations.listByUser);
	const cancelReservation = useMutation(api.reservations.cancel);
	const startReservationCheckout = useAction(api.payments.startReservationCheckout);
	const [activeTab, setActiveTab] = useState<ReservationTab>("upcoming");
	const [activeCheckout, setActiveCheckout] =
		useState<ReservationCheckoutSession | null>(null);
	const [pendingReservationId, setPendingReservationId] = useState<
		string | null
	>(null);
	const [pendingCheckoutReservationId, setPendingCheckoutReservationId] = useState<
		string | null
	>(null);
	const [confirmingReservationId, setConfirmingReservationId] = useState<
		string | null
	>(null);

	const groupedReservations = useMemo(() => {
		const now = Date.now();
		const upcoming: NonNullable<typeof reservations> = [];
		const past: NonNullable<typeof reservations> = [];

		for (const reservation of reservations ?? []) {
			if (reservation.startTime >= now) {
				upcoming.push(reservation);
			} else {
				past.push(reservation);
			}
		}

		return { past, upcoming };
	}, [reservations]);

	const visibleReservations =
		activeTab === "upcoming"
			? groupedReservations.upcoming
			: groupedReservations.past;
	const reservationPendingCancellation =
		confirmingReservationId !== null
			? (reservations?.find(
					(reservation) => reservation._id === confirmingReservationId,
				) ?? null)
			: null;

	return (
		<>
			<div className="grid gap-6">
				<Card>
					<CardHeader>
						<CardTitle>My Reservations</CardTitle>
						<CardDescription>
							Track pending payments, confirmed bookings, and your upcoming
							table schedule in one place.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						{reservations === undefined ? (
							<p className="text-muted-foreground text-sm">
								Loading reservations...
							</p>
						) : reservations.length === 0 ? (
							<div className="rounded-md border border-border p-4 text-muted-foreground text-sm">
								No reservations yet. Start from the reserve page to book your
								first table.
							</div>
						) : (
							<div className="flex flex-wrap gap-2">
								<Button
									variant={activeTab === "upcoming" ? "default" : "outline"}
									onClick={() => setActiveTab("upcoming")}
								>
									Upcoming ({groupedReservations.upcoming.length})
								</Button>
								<Button
									variant={activeTab === "past" ? "default" : "outline"}
									onClick={() => setActiveTab("past")}
								>
									Past ({groupedReservations.past.length})
								</Button>
							</div>
						)}
					</CardContent>
				</Card>

				{visibleReservations.length > 0 ? (
					<section className="grid gap-4">
						<h2 className="font-semibold text-lg">
							{activeTab === "upcoming" ? "Upcoming" : "Past"}
						</h2>
						{visibleReservations.map((reservation) => (
							<Card key={reservation._id}>
								<CardHeader>
									<div className="flex flex-wrap items-start justify-between gap-3">
										<div className="flex flex-col gap-1">
											<CardTitle>{reservation.table.label}</CardTitle>
											<CardDescription>
												{reservation.table.zone} • {reservation.guestCount}{" "}
												guests • {reservation.durationHours} hour(s)
											</CardDescription>
										</div>
										<span
											className={`rounded-full border px-2 py-1 text-[11px] ${getStatusClasses(reservation.status)}`}
										>
											{getStatusLabel(reservation.status)}
										</span>
									</div>
								</CardHeader>
								<CardContent className="flex flex-col gap-2 text-muted-foreground text-sm">
									<div>{formatDateTime(reservation.startTime)}</div>
									<div>
										Confirmation code:{" "}
										{reservation.status === "confirmed"
											? reservation.confirmationCode
											: "Pending payment"}
									</div>
									{reservation.eventId ? (
										<div>Linked event reservation</div>
									) : null}
									{reservation.status === "pending" ? (
										<div className="flex flex-wrap gap-2 pt-2">
											<Button
												disabled={pendingCheckoutReservationId === reservation._id}
												size="sm"
												variant="outline"
												onClick={async () => {
													setPendingCheckoutReservationId(reservation._id);
													try {
														const checkout = await startReservationCheckout({
															mode: "resume",
															reservationId: reservation._id,
														});
														setActiveCheckout(checkout);
													} catch (error) {
														toast.error(
															error instanceof Error
																? error.message
																: "Failed to continue payment",
														);
													} finally {
														setPendingCheckoutReservationId(null);
													}
												}}
											>
												{pendingCheckoutReservationId === reservation._id
													? "Preparing QRIS..."
													: "Continue payment"}
											</Button>
										</div>
									) : null}
									{activeTab === "upcoming" &&
									reservation.status === "confirmed" ? (
										<div className="pt-2">
											<Button
												size="sm"
												variant="outline"
												onClick={() => {
													setConfirmingReservationId(reservation._id);
													setPendingReservationId(null);
												}}
											>
												Cancel reservation
											</Button>
										</div>
									) : null}
								</CardContent>
							</Card>
						))}
					</section>
				) : reservations !== undefined && reservations.length > 0 ? (
					<Card size="sm">
						<CardContent className="pt-4 text-muted-foreground text-sm">
							No {activeTab} reservations to show yet.
						</CardContent>
					</Card>
				) : null}

				<div>
					<Button
						variant="outline"
						onClick={() => window.location.assign("/reserve")}
					>
						Reserve another table
					</Button>
				</div>
			</div>

			<ConfirmDialog
				confirmLabel="Cancel reservation"
				description="Apakah kamu yakin ingin membatalkan? Refund akan diproses dalam 1–3 hari kerja."
				open={reservationPendingCancellation !== null}
				pending={pendingReservationId === reservationPendingCancellation?._id}
				title="Cancel reservation"
				onConfirm={async () => {
					if (!reservationPendingCancellation) {
						return;
					}

					setPendingReservationId(reservationPendingCancellation._id);

					try {
						await cancelReservation({
							reservationId: reservationPendingCancellation._id,
						});
						toast.success("Reservation cancelled");
						setConfirmingReservationId(null);
					} catch (error) {
						const message =
							error instanceof Error
								? error.message
								: "Failed to cancel reservation";
						if (message === "Cancellation window passed") {
							toast.error(
								"Pembatalan tidak dapat dilakukan kurang dari 2 jam sebelum jadwal.",
							);
						} else {
							toast.error(message);
						}
					} finally {
						setPendingReservationId(null);
					}
				}}
				onOpenChange={(open) => {
					if (!open) {
						setConfirmingReservationId(null);
						setPendingReservationId(null);
					}
				}}
			/>

			{activeCheckout ? (
				<ReservationPaymentSheet
					checkout={activeCheckout}
					open={activeCheckout !== null}
					onOpenChange={(open) => {
						if (!open) {
							setActiveCheckout(null);
						}
					}}
				/>
			) : null}
		</>
	);
}
