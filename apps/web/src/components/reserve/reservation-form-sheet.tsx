import { api } from "@campus-cafe/backend/convex/_generated/api";
import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";
import { Button } from "@campus-cafe/ui/components/button";
import { Input } from "@campus-cafe/ui/components/input";
import { Label } from "@campus-cafe/ui/components/label";
import { useAction, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

import SidePanel from "@/components/side-panel";

import type { FloorPlanTable } from "./floor-plan-config";

type ReservationFormSheetProps = {
	eventId?: Id<"events">;
	initialDate?: string;
	onOpenChange: (open: boolean) => void;
	open: boolean;
	table: FloorPlanTable | null;
};

type DurationHours = 1 | 2 | 3;

const hourOptions = Array.from({ length: 12 }, (_, index) => {
	const hour = index + 10;
	return `${String(hour).padStart(2, "0")}:00`;
});

function toDateInputValue(date: Date): string {
	const timezoneOffset = date.getTimezoneOffset() * 60 * 1000;
	return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getMinDate(): string {
	return toDateInputValue(new Date());
}

function getMaxDate(): string {
	const maxDate = new Date();
	maxDate.setDate(maxDate.getDate() + 7);
	return toDateInputValue(maxDate);
}

function isValidDateInput(value: string | undefined): value is string {
	return Boolean(value && /^\d{4}-\d{2}-\d{2}$/.test(value));
}

export default function ReservationFormSheet({
	eventId,
	initialDate,
	onOpenChange,
	open,
	table,
}: ReservationFormSheetProps) {
	const [referenceTimestamp] = useState(() => Date.now());
	const startReservationCheckout = useAction(api.payments.startReservationCheckout);
	const user = useQuery(api.users.getMe);
	const minDate = useMemo(() => getMinDate(), []);
	const maxDate = useMemo(() => getMaxDate(), []);

	const [date, setDate] = useState(
		isValidDateInput(initialDate) ? initialDate : minDate,
	);
	const [startTime, setStartTime] = useState(hourOptions[0] ?? "10:00");
	const [durationHours, setDurationHours] = useState<DurationHours>(1);
	const [guestCount, setGuestCount] = useState("1");
	const [submitting, setSubmitting] = useState(false);

	useEffect(() => {
		setDate(isValidDateInput(initialDate) ? initialDate : minDate);
		setStartTime(hourOptions[0] ?? "10:00");
		setDurationHours(1);
	}, [initialDate, minDate, open]);

	useEffect(() => {
		if (!table) {
			return;
		}

		setGuestCount("1");
	}, [table]);

	const startTimestamp = useMemo(() => {
		const parsed = new Date(`${date}T${startTime}:00`).getTime();
		return Number.isFinite(parsed) ? parsed : null;
	}, [date, startTime]);
	const availability = useQuery(
		api.reservations.checkAvailability,
		table && startTimestamp !== null
			? {
					durationHours,
					referenceTimestamp,
					startTime: startTimestamp,
					tableId: table._id,
				}
			: "skip",
	);
	const needsPhone = user !== undefined && user !== null && !user.phone;

	const reservationSummary = table
		? `${table.label} • ${table.zone} • ${table.capacity} seats`
		: "Select a table";

	const footer = (
		<div className="flex justify-end gap-2">
			<Button variant="outline" onClick={() => onOpenChange(false)}>
				Cancel
			</Button>
			<Button
				className="min-h-11 w-full sm:w-auto"
				disabled={
					!table ||
					submitting ||
					user === undefined ||
					user === null ||
					needsPhone ||
					availability === false
				}
				onClick={async () => {
					if (!table) {
						return;
					}

					setSubmitting(true);

					try {
						const guestTotal = Number(guestCount);

						if (startTimestamp === null) {
							throw new Error("Select a valid reservation date and time");
						}

						const checkout = await startReservationCheckout({
							durationHours,
							guestCount: guestTotal,
							mode: "new",
							...(eventId ? { eventId } : {}),
							startTime: startTimestamp,
							tableId: table._id,
						});

						window.location.href = checkout.paymentUrl;
					} catch (error) {
						toast.error(
							error instanceof Error
								? error.message
								: "Failed to create reservation",
						);
						setSubmitting(false);
					}
				}}
			>
				{submitting ? "Redirecting..." : "Continue to payment"}
			</Button>
		</div>
	);

	return (
		<SidePanel
			description="Choose a schedule and guest count, then continue to Mayar to complete your reservation payment."
			footer={footer}
			open={open}
			title={table ? `Reserve ${table.label}` : "Reserve a table"}
			onOpenChange={onOpenChange}
		>
			<div className="flex flex-col gap-5">
				<section className="rounded-md border border-border p-4">
					<div className="font-medium text-sm">{reservationSummary}</div>
					<p className="mt-1 text-muted-foreground text-sm">
						Floor status shows the live room state. Your selected slot will be
						re-checked before checkout starts.
					</p>
				</section>

				{needsPhone ? (
					<section className="rounded-md border border-amber-500/30 bg-amber-500/10 p-4 text-sm">
						<div className="font-medium text-foreground">
							Add a phone number before continuing
						</div>
						<p className="mt-1 text-muted-foreground">
							Mayar checkout needs a phone number from your profile.
						</p>
						<Button
							className="mt-3"
							render={<Link to="/profile" />}
							size="sm"
							variant="outline"
						>
							Open profile
						</Button>
					</section>
				) : null}

				<div className="flex flex-col gap-2">
					<Label htmlFor="reservation-date">Date</Label>
					<Input
						id="reservation-date"
						max={maxDate}
						min={minDate}
						type="date"
						value={date}
						onChange={(event) => setDate(event.target.value)}
					/>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="reservation-start-time">Start time</Label>
					<select
						id="reservation-start-time"
						className="min-h-11 w-full rounded-md border border-input bg-transparent px-3 text-sm"
						value={startTime}
						onChange={(event) => setStartTime(event.target.value)}
					>
						{hourOptions.map((option) => (
							<option key={option} value={option}>
								{option}
							</option>
						))}
					</select>
				</div>

				<div className="flex flex-col gap-2">
					<Label>Duration</Label>
					<div className="flex flex-wrap gap-2">
						{[1, 2, 3].map((option) => (
							<Button
								className="min-h-11 min-w-[44px] flex-1 sm:flex-none"
								key={option}
								variant={durationHours === option ? "default" : "outline"}
								onClick={() => setDurationHours(option as DurationHours)}
							>
								{option} hour{option > 1 ? "s" : ""}
							</Button>
						))}
					</div>
				</div>

				<div className="flex flex-col gap-2">
					<Label htmlFor="reservation-guests">Guest count</Label>
					<Input
						id="reservation-guests"
						max={table?.capacity ?? 1}
						min={1}
						type="number"
						value={guestCount}
						onChange={(event) => setGuestCount(event.target.value)}
					/>
				</div>

				{availability === false ? (
					<section className="rounded-md border border-destructive/30 bg-destructive/10 p-4 text-destructive text-sm">
						This table already has an overlapping reservation for the selected
						time.
					</section>
				) : availability === true ? (
					<section className="rounded-md border border-primary/30 bg-primary/10 p-4 text-primary text-sm">
						This table is available for the selected reservation slot.
					</section>
				) : null}

				<section className="rounded-md border border-border bg-muted/40 p-4 text-muted-foreground text-sm">
					Pembatalan dapat dilakukan minimal 2 jam sebelum jadwal. Refund
					diproses manual dalam 1-3 hari kerja.
				</section>
			</div>
		</SidePanel>
	);
}
