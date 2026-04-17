import { api } from "@campus-cafe/backend/convex/_generated/api";
import { Button } from "@campus-cafe/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@campus-cafe/ui/components/empty";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Link } from "react-router";

import EventCard from "@/components/events/event-card";
import { EventListSkeleton } from "@/components/skeletons/event-list-skeleton";

export default function EventsListPage() {
	const referenceTimestamp = useMemo(() => Date.now(), []);
	const events = useQuery(api.events.listPublishedActive, {
		referenceTimestamp,
	});

	if (events === undefined) {
		return (
			<div className="flex flex-col gap-4">
				<p className="text-muted-foreground text-sm">Memuat event…</p>
				<EventListSkeleton count={6} />
			</div>
		);
	}

	if (events.length === 0) {
		return (
			<Empty className="mx-auto min-h-[40vh] max-w-lg border border-dashed">
				<EmptyHeader>
					<EmptyTitle>Event mendatang</EmptyTitle>
					<EmptyDescription>
						Belum ada event yang dipublikasikan. Cek lagi nanti atau reservasi
						meja untuk kunjunganmu.
					</EmptyDescription>
				</EmptyHeader>
				<Button render={<Link to="/reserve" />}>Reservasi meja</Button>
			</Empty>
		);
	}

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
				<div>
					<h1 className="font-heading font-semibold text-2xl tracking-tight">
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
