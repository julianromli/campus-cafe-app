import { api } from "@campus-cafe/backend/convex/_generated/api";
import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";
import {
	Alert,
	AlertDescription,
	AlertTitle,
} from "@campus-cafe/ui/components/alert";
import { Button } from "@campus-cafe/ui/components/button";
import { Calendar } from "@campus-cafe/ui/components/calendar";
import {
	Field,
	FieldDescription,
	FieldGroup,
	FieldLabel,
} from "@campus-cafe/ui/components/field";
import { Input } from "@campus-cafe/ui/components/input";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@campus-cafe/ui/components/popover";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@campus-cafe/ui/components/select";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@campus-cafe/ui/components/sheet";
import { useAction, useQuery } from "convex/react";
import { CalendarDays } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import ReservationPaymentSheet, {
	type ReservationCheckoutSession,
} from "@/components/reserve/reservation-payment-sheet";

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

function dateFromYmdLocal(ymd: string): Date {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd);
	if (!match) {
		return new Date(Number.NaN);
	}

	const year = Number(match[1]);
	const month = Number(match[2]);
	const day = Number(match[3]);
	return new Date(year, month - 1, day);
}

function startOfLocalDayMs(d: Date): number {
	return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

function formatReservationDateLabel(ymd: string): string {
	const parsed = dateFromYmdLocal(ymd);
	if (Number.isNaN(parsed.getTime())) {
		return ymd;
	}

	return new Intl.DateTimeFormat("id-ID", {
		day: "2-digit",
		month: "short",
		year: "numeric",
	}).format(parsed);
}

function clampDateInput(
	value: string,
	minDate: string,
	maxDate: string,
): string {
	if (value < minDate) {
		return minDate;
	}

	if (value > maxDate) {
		return maxDate;
	}

	return value;
}

function getDefaultReservationSelection(args: {
	initialDate?: string;
	maxDate: string;
	minDate: string;
	now?: Date;
}): {
	date: string;
	startTime: string;
} {
	const now = args.now ?? new Date();
	const firstHourOption = hourOptions[0] ?? "10:00";
	const requestedDate = isValidDateInput(args.initialDate)
		? clampDateInput(args.initialDate, args.minDate, args.maxDate)
		: args.minDate;

	if (requestedDate !== args.minDate) {
		return {
			date: requestedDate,
			startTime: firstHourOption,
		};
	}

	if (now.getHours() < 10) {
		return {
			date: requestedDate,
			startTime: firstHourOption,
		};
	}

	const nextHour = now.getHours() + 1;
	if (nextHour <= 21) {
		return {
			date: requestedDate,
			startTime: `${String(nextHour).padStart(2, "0")}:00`,
		};
	}

	const nextDate = clampDateInput(
		toDateInputValue(new Date(now.getTime() + 24 * 60 * 60 * 1000)),
		args.minDate,
		args.maxDate,
	);
	return {
		date: nextDate,
		startTime: firstHourOption,
	};
}

export default function ReservationFormSheet({
	eventId,
	initialDate,
	onOpenChange,
	open,
	table,
}: ReservationFormSheetProps) {
	const [referenceTimestamp, setReferenceTimestamp] = useState(() =>
		Date.now(),
	);
	const startReservationCheckout = useAction(
		api.payments.startReservationCheckout,
	);
	const user = useQuery(api.users.getMe);
	const minDate = useMemo(() => getMinDate(), []);
	const maxDate = useMemo(() => getMaxDate(), []);
	const defaultSelection = useMemo(
		() => getDefaultReservationSelection({ initialDate, maxDate, minDate }),
		[initialDate, maxDate, minDate],
	);

	const [checkout, setCheckout] = useState<ReservationCheckoutSession | null>(
		null,
	);
	const [date, setDate] = useState(defaultSelection.date);
	const [startTime, setStartTime] = useState(defaultSelection.startTime);
	const [durationHours, setDurationHours] = useState<DurationHours>(1);
	const [guestCount, setGuestCount] = useState("1");
	const [submitting, setSubmitting] = useState(false);
	const [datePickerOpen, setDatePickerOpen] = useState(false);

	useEffect(() => {
		if (!open) {
			setCheckout(null);
			setSubmitting(false);
		}

		const nextSelection = getDefaultReservationSelection({
			initialDate,
			maxDate,
			minDate,
		});
		setDate(nextSelection.date);
		setStartTime(nextSelection.startTime);
		setDurationHours(1);
		setGuestCount("1");
	}, [initialDate, maxDate, minDate, open]);

	useEffect(() => {
		if (!table) {
			return;
		}

		setGuestCount("1");
	}, [table?._id]);

	useEffect(() => {
		if (!open) {
			return;
		}

		const updateReferenceTimestamp = () => setReferenceTimestamp(Date.now());
		updateReferenceTimestamp();
		const interval = window.setInterval(updateReferenceTimestamp, 10_000);

		return () => window.clearInterval(interval);
	}, [open]);

	useEffect(() => {
		if (!open) {
			return;
		}

		setReferenceTimestamp(Date.now());
	}, [date, durationHours, open, startTime]);

	const startTimestamp = useMemo(() => {
		const parsed = new Date(`${date}T${startTime}:00`).getTime();
		return Number.isFinite(parsed) ? parsed : null;
	}, [date, startTime]);
	const selectedCalendarDate = useMemo(() => {
		const parsed = dateFromYmdLocal(date);
		return Number.isNaN(parsed.getTime()) ? undefined : parsed;
	}, [date]);
	const minSelectableMs = useMemo(
		() => startOfLocalDayMs(dateFromYmdLocal(minDate)),
		[minDate],
	);
	const maxSelectableMs = useMemo(
		() => startOfLocalDayMs(dateFromYmdLocal(maxDate)),
		[maxDate],
	);
	const availabilityArgs =
		table && startTimestamp !== null && startTimestamp > referenceTimestamp
			? {
					durationHours,
					referenceTimestamp,
					startTime: startTimestamp,
					tableId: table._id,
				}
			: "skip";
	const availability = useQuery(
		api.reservations.checkAvailability,
		availabilityArgs,
	);
	const shouldCheckAvailability = availabilityArgs !== "skip";

	const reservationSummary = table
		? `${table.label} • ${table.zone} • ${table.capacity} seats`
		: "Select a table";
	const formOpen = open && checkout === null;
	const guestTotal = Number(guestCount);
	const guestCountValid =
		Number.isInteger(guestTotal) &&
		guestTotal >= 1 &&
		guestTotal <= (table?.capacity ?? 0);
	const startTimeValid =
		startTimestamp !== null && startTimestamp > referenceTimestamp;
	const canSubmit =
		Boolean(table) &&
		!submitting &&
		user !== undefined &&
		user !== null &&
		availability === true &&
		guestCountValid &&
		startTimeValid;

	return (
		<>
			<Sheet
				open={formOpen}
				onOpenChange={(nextOpen) => {
					if (!nextOpen) {
						setSubmitting(false);
						onOpenChange(false);
					}
				}}
			>
				<SheetContent className="max-h-dvh w-full overflow-y-auto overscroll-y-contain p-0 sm:max-w-xl">
					<SheetHeader>
						<SheetTitle>
							{table ? `Reserve ${table.label}` : "Reserve a table"}
						</SheetTitle>
						<SheetDescription>
							Pilih jadwal dan jumlah tamu, lalu lanjutkan ke checkout QRIS
							untuk menyelesaikan reservasi.
						</SheetDescription>
					</SheetHeader>

					<div className="flex flex-col gap-6 px-6 pb-6">
						<section className="rounded-2xl border border-primary/10 bg-primary/5 p-5">
							<div className="font-semibold text-base text-foreground">
								{reservationSummary}
							</div>
							<p className="mt-1 text-muted-foreground text-sm">
								Status meja akan dicek ulang tepat sebelum checkout QRIS dibuat.
							</p>
						</section>

						<FieldGroup className="gap-5">
							<Field>
								<FieldLabel htmlFor="reservation-date">Date</FieldLabel>
								<Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
									<PopoverTrigger
										render={
											<Button
												type="button"
												id="reservation-date"
												variant="outline"
												aria-expanded={datePickerOpen}
												className="h-9 w-full min-w-0 justify-between rounded-3xl border border-transparent bg-input/50 px-3 py-1 font-normal text-base text-foreground shadow-none hover:bg-input/60 md:text-sm"
											>
												{isValidDateInput(date) ? (
													formatReservationDateLabel(date)
												) : (
													<span className="text-muted-foreground">
														Pilih tanggal
													</span>
												)}
												<CalendarDays data-icon="inline-end" />
											</Button>
										}
									/>
									<PopoverContent className="w-auto p-0" align="start">
										<Calendar
											mode="single"
											selected={selectedCalendarDate}
											defaultMonth={selectedCalendarDate}
											disabled={(day) => {
												const t = startOfLocalDayMs(day);
												return t < minSelectableMs || t > maxSelectableMs;
											}}
											onSelect={(nextDate) => {
												if (!nextDate) {
													return;
												}

												setDate(toDateInputValue(nextDate));
												setDatePickerOpen(false);
											}}
											initialFocus
										/>
									</PopoverContent>
								</Popover>
							</Field>

							<Field>
								<FieldLabel htmlFor="reservation-start-time">
									Start time
								</FieldLabel>
								<Select
									value={startTime}
									onValueChange={(next) => {
										if (typeof next === "string") {
											setStartTime(next);
										}
									}}
									modal={false}
								>
									<SelectTrigger
										id="reservation-start-time"
										className="h-11 min-h-11 w-full min-w-0 justify-between rounded-3xl border border-transparent bg-input/50 px-3 font-normal text-base shadow-none hover:bg-input/60 data-[size=default]:h-11 md:text-sm [&_svg]:text-muted-foreground"
									>
										<SelectValue placeholder="Pilih jam" />
									</SelectTrigger>
									<SelectContent
										align="start"
										className="rounded-3xl ring-1 ring-foreground/5 dark:ring-foreground/10"
									>
										{hourOptions.map((option) => (
											<SelectItem key={option} value={option}>
												{option}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</Field>

							<Field>
								<FieldLabel>Duration</FieldLabel>
								<div className="flex flex-wrap gap-2">
									{[1, 2, 3].map((option) => (
										<Button
											className="min-h-11 min-w-[44px] flex-1 rounded-full sm:flex-none"
											key={option}
											type="button"
											variant={durationHours === option ? "default" : "outline"}
											onClick={() => setDurationHours(option as DurationHours)}
										>
											{option} hour{option > 1 ? "s" : ""}
										</Button>
									))}
								</div>
								<FieldDescription>
									Harga dihitung per jam dan akan ditampilkan di checkout.
								</FieldDescription>
							</Field>

							<Field>
								<FieldLabel htmlFor="reservation-guests">
									Guest count
								</FieldLabel>
								<Input
									id="reservation-guests"
									max={table?.capacity ?? 1}
									min={1}
									type="number"
									value={guestCount}
									onChange={(event) => setGuestCount(event.target.value)}
								/>
								<FieldDescription>
									Maksimal {table?.capacity ?? 0} tamu untuk meja ini.
								</FieldDescription>
							</Field>
						</FieldGroup>

						{availability === false ? (
							<Alert variant="destructive">
								<AlertTitle>Slot tidak tersedia</AlertTitle>
								<AlertDescription>
									Meja ini sudah punya reservasi yang overlap pada waktu yang
									dipilih.
								</AlertDescription>
							</Alert>
						) : availability === true ? (
							<Alert>
								<AlertTitle>Slot tersedia</AlertTitle>
								<AlertDescription>
									Meja ini masih tersedia untuk jadwal reservasi yang kamu
									pilih.
								</AlertDescription>
							</Alert>
						) : shouldCheckAvailability ? (
							<Alert>
								<AlertTitle>Mengecek slot</AlertTitle>
								<AlertDescription>
									Ketersediaan meja sedang diperiksa sebelum QRIS dibuat.
								</AlertDescription>
							</Alert>
						) : null}

						{!guestCountValid && guestCount.length > 0 ? (
							<Alert variant="destructive">
								<AlertTitle>Jumlah tamu belum valid</AlertTitle>
								<AlertDescription>
									Masukkan jumlah tamu berupa bilangan bulat antara 1 sampai{" "}
									{table?.capacity ?? 0}.
								</AlertDescription>
							</Alert>
						) : null}

						{!startTimeValid && startTimestamp !== null ? (
							<Alert variant="destructive">
								<AlertTitle>Waktu reservasi sudah lewat</AlertTitle>
								<AlertDescription>
									Pilih jadwal reservasi yang masih berada di masa depan.
								</AlertDescription>
							</Alert>
						) : null}

						<Alert>
							<AlertTitle>Kebijakan pembatalan</AlertTitle>
							<AlertDescription>
								Pembatalan dapat dilakukan minimal 2 jam sebelum jadwal. Refund
								diproses manual dalam 1-3 hari kerja.
							</AlertDescription>
						</Alert>

						<div className="flex flex-col gap-3 pt-2 sm:flex-row sm:justify-end">
							<Button
								className="min-h-11 rounded-full"
								type="button"
								variant="ghost"
								onClick={() => onOpenChange(false)}
							>
								Cancel
							</Button>
							<Button
								className="min-h-11 rounded-full sm:min-w-[180px]"
								disabled={!canSubmit}
								type="button"
								onClick={async () => {
									if (!table) {
										return;
									}

									setSubmitting(true);

									try {
										if (startTimestamp === null) {
											throw new Error(
												"Select a valid reservation date and time",
											);
										}
										if (!Number.isInteger(guestTotal) || guestTotal < 1) {
											throw new Error("Guest count must be at least 1");
										}
										if (guestTotal > table.capacity) {
											throw new Error("Guest count exceeds table capacity");
										}
										if (startTimestamp <= Date.now()) {
											throw new Error(
												"Select a reservation time that is still in the future",
											);
										}
										if (availability !== true) {
											throw new Error(
												"Table availability is still being checked",
											);
										}

										const nextCheckout = await startReservationCheckout({
											durationHours,
											guestCount: guestTotal,
											mode: "new",
											...(eventId ? { eventId } : {}),
											startTime: startTimestamp,
											tableId: table._id,
										});

										setCheckout(nextCheckout);
										setSubmitting(false);
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
								{submitting ? "Menyiapkan QRIS..." : "Proses transaksi"}
							</Button>
						</div>
					</div>
				</SheetContent>
			</Sheet>

			{checkout ? (
				<ReservationPaymentSheet
					checkout={checkout}
					open={open && checkout !== null}
					onOpenChange={(nextOpen) => {
						if (!nextOpen) {
							setCheckout(null);
							setSubmitting(false);
							onOpenChange(false);
						}
					}}
				/>
			) : null}
		</>
	);
}
