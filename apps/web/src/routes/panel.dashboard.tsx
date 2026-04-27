import { api } from "@campus-cafe/backend/convex/_generated/api";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@campus-cafe/ui/components/card";
import { Skeleton } from "@campus-cafe/ui/components/skeleton";
import { useQuery } from "convex/react";
import {
	CalendarDaysIcon,
	CircleDollarSignIcon,
	LayoutGridIcon,
	PartyPopperIcon,
} from "lucide-react";
import { useMemo } from "react";

import ReservationsTrendChart from "@/components/admin/reservations-trend-chart";
import StatCard from "@/components/admin/stat-card";
import { usePanelRole } from "@/hooks/use-panel-role";
import { formatIdr } from "@/lib/format-idr";

function DashboardSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<Skeleton className="mb-2 h-7 w-48" />
				<Skeleton className="h-4 w-72 max-w-full" />
			</div>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				{["a", "b", "c", "d"].map((key) => (
					<Skeleton key={key} className="h-28 w-full" />
				))}
			</div>
			<Skeleton className="h-[360px] w-full" />
			<div className="grid gap-4 md:grid-cols-2">
				<Skeleton className="h-40 w-full" />
				<Skeleton className="h-40 w-full" />
			</div>
		</div>
	);
}

function StaffDashboardSkeleton() {
	return (
		<div className="flex flex-col gap-6">
			<div>
				<Skeleton className="mb-2 h-7 w-48" />
				<Skeleton className="h-4 w-72 max-w-full" />
			</div>
			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
				{["a", "b", "c"].map((key) => (
					<Skeleton key={key} className="h-28 w-full" />
				))}
			</div>
			<Skeleton className="h-[360px] w-full" />
			<div className="grid gap-4 md:grid-cols-2">
				<Skeleton className="h-40 w-full" />
				<Skeleton className="h-40 w-full" />
			</div>
		</div>
	);
}

export default function PanelDashboardPage() {
	const role = usePanelRole();
	const referenceTimestamp = useMemo(() => Date.now(), []);

	const overview = useQuery(api.analytics.todayOverview, {
		referenceTimestamp,
	});
	const trends = useQuery(api.analytics.thirtyDayTrends, {
		referenceTimestamp,
	});

	const loading = overview === undefined || trends === undefined;

	if (loading) {
		return role === "staff" ? (
			<StaffDashboardSkeleton />
		) : (
			<DashboardSkeleton />
		);
	}

	if (role === "staff") {
		return (
			<div className="flex flex-col gap-6">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">Dashboard</h1>
					<p className="text-muted-foreground text-sm">
						Ringkasan operasional hari ini dan tren 30 hari terakhir (perbarui
						otomatis).
					</p>
				</div>

				<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
					<StatCard
						icon={CalendarDaysIcon}
						label="Reservasi hari ini"
						value={overview.todayReservations}
						description="Terkonfirmasi, jadwal mulai hari ini (UTC)"
					/>
					<StatCard
						icon={LayoutGridIcon}
						label="Meja terisi"
						value={`${overview.occupiedTables} / ${overview.totalTables}`}
						description="Status booked atau occupied vs. meja aktif"
					/>
					<StatCard
						icon={PartyPopperIcon}
						label="Event publik aktif"
						value={overview.publishedEventsActive}
						description="Published & belum berakhir (waktu referensi klien)"
					/>
				</div>

				<ReservationsTrendChart data={trends} />

				<div className="grid gap-4 md:grid-cols-2">
					<Card>
						<CardHeader>
							<CardTitle className="text-base">Event listing</CardTitle>
							<CardDescription>
								Event di app hanya informatif; metrik registrasi ada di platform
								eksternal.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground text-sm">
								Kelola listing di <code className="text-xs">/panel/events</code>
								. Tidak ada registrasi in-app.
							</p>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle className="text-base">
								Tren volume pesanan makanan
							</CardTitle>
							<CardDescription>
								Data akan muncul setelah B-028 (orders) aktif.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<p className="text-muted-foreground text-sm">
								Belum tersedia — kolom `orderCount` siap di backend.
							</p>
						</CardContent>
					</Card>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6">
			<div>
				<h1 className="font-semibold text-2xl tracking-tight">Dashboard</h1>
				<p className="text-muted-foreground text-sm">
					Ringkasan operasional hari ini dan tren 30 hari terakhir (perbarui
					otomatis).
				</p>
			</div>

			<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
				<StatCard
					icon={CalendarDaysIcon}
					label="Reservasi hari ini"
					value={overview.todayReservations}
					description="Terkonfirmasi, jadwal mulai hari ini (UTC)"
				/>
				<StatCard
					icon={LayoutGridIcon}
					label="Meja terisi"
					value={`${overview.occupiedTables} / ${overview.totalTables}`}
					description="Status booked atau occupied vs. meja aktif"
				/>
				<StatCard
					icon={PartyPopperIcon}
					label="Event publik aktif"
					value={overview.publishedEventsActive}
					description="Published & belum berakhir (waktu referensi klien)"
				/>
				<StatCard
					icon={CircleDollarSignIcon}
					label="Pendapatan hari ini"
					value={formatIdr(overview.todayRevenue)}
					description="Pembayaran paid (UTC hari ini)"
				/>
			</div>

			<ReservationsTrendChart data={trends} />

			<div className="grid gap-4 md:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Event listing</CardTitle>
						<CardDescription>
							Event di app hanya informatif; metrik registrasi ada di platform
							eksternal.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">
							Kelola listing di <code className="text-xs">/panel/events</code>.
							Tidak ada registrasi in-app.
						</p>
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							Tren volume pesanan makanan
						</CardTitle>
						<CardDescription>
							Data akan muncul setelah B-028 (orders) aktif.
						</CardDescription>
					</CardHeader>
					<CardContent>
						<p className="text-muted-foreground text-sm">
							Belum tersedia — kolom `orderCount` siap di backend.
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
