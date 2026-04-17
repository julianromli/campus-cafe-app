import { api } from "@campus-cafe/backend/convex/_generated/api";
import { Button } from "@campus-cafe/ui/components/button";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Link } from "react-router";

import EventCard from "@/components/events/event-card";

export default function EventsListPage() {
	const referenceTimestamp = useMemo(() => Date.now(), []);
	const events = useQuery(api.events.listPublishedActive, {
		referenceTimestamp,
	});

	if (events === undefined) {
		return (
			<div className="space-y-4">
				<p className="text-muted-foreground text-sm">Memuat event…</p>
				<div className="flex gap-4 overflow-x-auto pb-2">
					{[1, 2, 3].map((i) => (
						<div
							key={i}
							className="h-[300px] min-w-[240px] animate-pulse rounded-xl border border-border bg-muted/40"
						/>
					))}
				</div>
			</div>
		);
	}

	if (events.length === 0) {
		return (
			<div className="mx-auto max-w-lg space-y-4 text-center">
				<h1 className="font-semibold text-2xl tracking-tight">
					Event mendatang
				</h1>
				<p className="text-muted-foreground text-sm">
					Belum ada event yang dipublikasikan. Cek lagi nanti atau reservasi
					meja untuk kunjunganmu.
				</p>
				<Button render={<Link to="/reserve" />}>Reservasi meja</Button>
			</div>
		);
	}

	return (
		<div className="space-y-8">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="font-semibold text-2xl tracking-tight">
						Event mendatang
					</h1>
					<p className="text-muted-foreground text-sm">
						Informasi event di cafe. Untuk pendaftaran atau tiket, buka halaman
						resmi penyelenggara.
					</p>
				</div>
				<Button variant="outline" render={<Link to="/" />}>
					← Beranda
				</Button>
			</div>

			<div className="flex flex-wrap gap-4">
				{events.map((event) => (
					<EventCard
						key={event._id}
						event={{
							_id: event._id,
							category: event.category,
							coverImage: event.coverImage,
							endTime: event.endTime,
							isOngoing:
								event.startTime <= referenceTimestamp &&
								event.endTime >= referenceTimestamp,
							startTime: event.startTime,
							title: event.title,
						}}
					/>
				))}
			</div>
		</div>
	);
}
