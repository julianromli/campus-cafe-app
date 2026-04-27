import { api } from "@campus-cafe/backend/convex/_generated/api";
import type { Doc } from "@campus-cafe/backend/convex/_generated/dataModel";
import { Badge } from "@campus-cafe/ui/components/badge";
import { Button } from "@campus-cafe/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@campus-cafe/ui/components/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@campus-cafe/ui/components/table";
import { useAction, usePaginatedQuery } from "convex/react";
import { RefreshCwIcon } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

import {
	PaymentCardSkeleton,
	TableSkeleton,
} from "@/components/skeletons/table-skeleton";
import { usePanelRole } from "@/hooks/use-panel-role";
import { formatIdr } from "@/lib/format-idr";
import { canWrite } from "@/lib/permissions";

type PaymentStatus = Doc<"payments">["status"];
type StatusFilter = "all" | PaymentStatus;

/** Matches enriched `listAllPayments` rows (Convex validator adds optional joins). */
type PaymentListRow = Doc<"payments"> & {
	customerEmail?: string;
	customerName?: string;
	tableLabel?: string;
	tableZone?: string;
};

const FILTERS: { id: StatusFilter; label: string }[] = [
	{ id: "all", label: "Semua" },
	{ id: "pending", label: "Pending" },
	{ id: "paid", label: "Paid" },
	{ id: "failed", label: "Failed" },
	{ id: "refunded", label: "Refunded" },
];

function statusBadgeVariant(
	status: PaymentStatus,
): "default" | "secondary" | "destructive" | "outline" {
	switch (status) {
		case "paid":
			return "default";
		case "pending":
			return "secondary";
		case "failed":
			return "destructive";
		case "refunded":
			return "outline";
		default:
			return "secondary";
	}
}

function formatType(type: Doc<"payments">["type"]) {
	return type === "reservation" ? "Reservasi" : "Pesanan makanan";
}

function getDisplayAmount(payment: Doc<"payments">) {
	return payment.totalPayment ?? payment.amount;
}

export default function PanelPaymentsPage() {
	const role = usePanelRole();
	const canModify = role ? canWrite(role, "payments") : false;

	const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
	const [syncingRefId, setSyncingRefId] = useState<string | null>(null);

	const listArgs = statusFilter === "all" ? {} : { status: statusFilter };

	const { results, status, loadMore } = usePaginatedQuery(
		api.payments.listAllPayments,
		listArgs,
		{ initialNumItems: 25 },
	);

	const syncPayment = useAction(api.payments.syncReservationPaymentStatus);

	const handleSync = useCallback(
		async (refId: string) => {
			setSyncingRefId(refId);
			try {
				const out = await syncPayment({ refId });
				switch (out.result) {
					case "paid":
						toast.success("Pembayaran dikonfirmasi dan reservasi diperbarui.");
						break;
					case "pending":
						toast.message(
							`Status Pakasir: ${out.apiStatus ?? "belum completed"}. Coba lagi nanti.`,
						);
						break;
					case "ignored":
						toast.warning(
							"Pembayaran sudah terdeteksi di Pakasir, tetapi reservasi lokal sudah tidak pending. Periksa apakah perlu refund manual.",
						);
						break;
					case "not_found_in_pakasir":
						toast.warning(
							"Transaksi tidak ditemukan di Pakasir. Periksa ref ID, amount, atau coba lagi nanti.",
						);
						break;
					case "mismatch":
						toast.error(
							"Detail transaksi dari Pakasir tidak cocok dengan data lokal. Reservasi tidak diubah.",
						);
						break;
					case "not_pending_locally":
						toast.message("Pembayaran ini sudah tidak pending di database.");
						break;
					case "wrong_type":
						toast.error("Hanya pembayaran reservasi yang bisa disinkronkan.");
						break;
					default:
						break;
				}
			} catch (e) {
				const message = e instanceof Error ? e.message : "Sinkron gagal";
				toast.error(message);
			} finally {
				setSyncingRefId(null);
			}
		},
		[syncPayment],
	);

	const handleCopyRef = async (refId: string) => {
		try {
			await navigator.clipboard.writeText(refId);
			toast.success("Ref ID disalin");
		} catch {
			toast.error("Tidak bisa menyalin");
		}
	};

	const loadingFirst = status === "LoadingFirstPage" || results === undefined;

	const rows: PaymentListRow[] = (results ?? []) as PaymentListRow[];

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Pembayaran</h1>
				<p className="text-muted-foreground text-sm">
					Daftar semua pembayaran. Sinkron manual jika webhook Pakasir belum
					terkirim atau perlu verifikasi ulang.
				</p>
			</div>

			<Card>
				<CardHeader className="pb-2">
					<CardTitle className="text-base">Filter status</CardTitle>
					<CardDescription>
						Pilih status lalu gunakan &quot;Muat lagi&quot; untuk halaman
						berikutnya.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-wrap gap-2">
					{FILTERS.map((f) => (
						<Button
							key={f.id}
							className="min-h-11"
							onClick={() => setStatusFilter(f.id)}
							size="sm"
							variant={statusFilter === f.id ? "default" : "outline"}
						>
							{f.label}
						</Button>
					))}
				</CardContent>
			</Card>

			{loadingFirst ? (
				<>
					<div className="hidden md:block">
						<TableSkeleton columns={7} rows={10} />
					</div>
					<div className="flex flex-col gap-3 md:hidden">
						{Array.from({ length: 5 }).map((_, i) => (
							<PaymentCardSkeleton key={i} />
						))}
					</div>
				</>
			) : (
				<>
					<div className="hidden rounded-md border md:block">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Waktu</TableHead>
									<TableHead>Jenis</TableHead>
									<TableHead>Target</TableHead>
									<TableHead>Jumlah</TableHead>
									<TableHead>Ref ID</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Aksi</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{rows.length === 0 ? (
									<TableRow>
										<TableCell className="text-muted-foreground" colSpan={7}>
											Tidak ada pembayaran.
										</TableCell>
									</TableRow>
								) : (
									rows.map((row) => (
										<TableRow key={row._id}>
											<TableCell className="whitespace-nowrap text-sm">
												{new Intl.DateTimeFormat("id-ID", {
													dateStyle: "short",
													timeStyle: "short",
												}).format(new Date(row._creationTime))}
											</TableCell>
											<TableCell>{formatType(row.type)}</TableCell>
											<TableCell className="max-w-[220px]">
												{row.type === "reservation" ? (
													<span className="line-clamp-2 text-sm">
														{row.tableLabel && row.tableZone
															? `${row.tableLabel} · ${row.tableZone}`
															: "—"}
														{row.customerName ? (
															<span className="block text-muted-foreground">
																{row.customerName}
															</span>
														) : null}
													</span>
												) : (
													<code className="text-xs">{row.targetId}</code>
												)}
											</TableCell>
											<TableCell className="whitespace-nowrap">
												{formatIdr(getDisplayAmount(row))}
											</TableCell>
											<TableCell>
												<button
													className="max-w-[160px] cursor-pointer truncate text-left font-mono text-xs underline-offset-4 hover:underline"
													onClick={() => void handleCopyRef(row.refId)}
													type="button"
												>
													{row.refId}
												</button>
											</TableCell>
											<TableCell>
												<Badge variant={statusBadgeVariant(row.status)}>
													{row.status}
												</Badge>
											</TableCell>
											<TableCell className="text-right">
												{row.status === "pending" &&
												row.type === "reservation" ? (
													<Button
														className="min-h-11 min-w-[120px]"
														disabled={syncingRefId === row.refId || !canModify}
														title={
															!canModify
																? "Hanya admin yang dapat melakukan ini"
																: undefined
														}
														onClick={() => void handleSync(row.refId)}
														size="sm"
														variant="secondary"
													>
														{syncingRefId === row.refId ? (
															<RefreshCwIcon className="size-4 animate-spin" />
														) : (
															"Sync Status"
														)}
													</Button>
												) : (
													<span className="text-muted-foreground text-xs">
														—
													</span>
												)}
											</TableCell>
										</TableRow>
									))
								)}
							</TableBody>
						</Table>
					</div>

					<div className="flex flex-col gap-3 md:hidden">
						{rows.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								Tidak ada pembayaran.
							</p>
						) : (
							rows.map((row) => (
								<div
									className="flex flex-col gap-3 rounded-lg border p-4"
									key={row._id}
								>
									<div className="flex flex-wrap items-center justify-between gap-2">
										<Badge variant={statusBadgeVariant(row.status)}>
											{row.status}
										</Badge>
										<span className="text-muted-foreground text-xs">
											{new Intl.DateTimeFormat("id-ID", {
												dateStyle: "short",
												timeStyle: "short",
											}).format(new Date(row._creationTime))}
										</span>
									</div>
									<div className="text-sm">
										<p className="font-medium">{formatType(row.type)}</p>
										<p className="text-muted-foreground">
											{formatIdr(getDisplayAmount(row))}
										</p>
										{row.type === "reservation" ? (
											<p className="mt-1">
												{row.tableLabel && row.tableZone
													? `${row.tableLabel} · ${row.tableZone}`
													: "—"}
												{row.customerName ? (
													<span className="block text-muted-foreground text-xs">
														{row.customerName}
													</span>
												) : null}
											</p>
										) : (
											<code className="text-xs">{row.targetId}</code>
										)}
									</div>
									<button
										className="truncate text-left font-mono text-primary text-xs underline"
										onClick={() => void handleCopyRef(row.refId)}
										type="button"
									>
										{row.refId}
									</button>
									{row.status === "pending" && row.type === "reservation" ? (
										<Button
											className="min-h-11 w-full"
											disabled={syncingRefId === row.refId || !canModify}
											title={
												!canModify
													? "Hanya admin yang dapat melakukan ini"
													: undefined
											}
											onClick={() => void handleSync(row.refId)}
											variant="secondary"
										>
											{syncingRefId === row.refId ? (
												<RefreshCwIcon className="size-4 animate-spin" />
											) : (
												"Sync Status"
											)}
										</Button>
									) : null}
								</div>
							))
						)}
					</div>

					{status === "CanLoadMore" ? (
						<Button
							className="min-h-11 self-start"
							onClick={() => loadMore(25)}
							variant="outline"
						>
							Muat lagi
						</Button>
					) : null}
				</>
			)}
		</div>
	);
}
