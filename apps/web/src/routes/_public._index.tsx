import { api } from "@campus-cafe/backend/convex/_generated/api";
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

export default function HomePage() {
	const healthCheck = useQuery(api.healthCheck.get);
	const referenceTimestamp = useMemo(() => Date.now(), []);
	const events = useQuery(api.events.listPublishedActive, {
		referenceTimestamp,
	});

	const previewEvents = useMemo(() => (events ?? []).slice(0, 6), [events]);

	const statusBadge =
		healthCheck === undefined ? (
			<Badge variant="outline">Checking Convex…</Badge>
		) : healthCheck === "OK" ? (
			<Badge variant="secondary">Connected</Badge>
		) : (
			<Badge variant="destructive">Unavailable</Badge>
		);

	return (
		<div className="grid gap-10">
			<div className="grid gap-4 md:grid-cols-[1.4fr_1fr] md:items-stretch">
				<Card className="md:pb-6">
					<CardHeader>
						<p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
							Campus Cafe Platform
						</p>
						<CardTitle className="max-w-2xl font-heading text-3xl tracking-tight md:text-4xl">
							Reservasi meja, lihat event mendatang, dan operasional cafe dalam
							satu tempat.
						</CardTitle>
						<CardDescription className="max-w-xl text-pretty text-sm leading-6">
							Event ditampilkan untuk informasi; pendaftaran dan tiket dilakukan
							di halaman resmi penyelenggara.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-wrap gap-3">
						<Button render={<Link to="/reserve" />}>Reservasi meja</Button>
						<Button variant="outline" render={<Link to="/events" />}>
							Lihat semua event
						</Button>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-base">Backend status</CardTitle>
						<CardDescription>
							Koneksi ke Convex untuk data realtime.
						</CardDescription>
					</CardHeader>
					<CardContent className="flex items-center gap-2 text-muted-foreground text-sm">
						{statusBadge}
					</CardContent>
				</Card>
			</div>

			<section className="flex flex-col gap-4">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h2 className="font-heading font-semibold text-xl tracking-tight">
							Event mendatang
						</h2>
						<p className="text-muted-foreground text-sm">
							Klik kartu untuk detail dan link ke halaman resmi event.
						</p>
					</div>
					<Button
						variant="ghost"
						size="sm"
						className="w-fit"
						render={<Link to="/events" />}
					>
						Lihat semua →
					</Button>
				</div>

				{events === undefined ? (
					<EventListSkeleton count={6} />
				) : previewEvents.length === 0 ? (
					<Empty>
						<EmptyHeader>
							<EmptyTitle>Belum ada event</EmptyTitle>
							<EmptyDescription>
								Event yang dipublikasikan akan muncul di sini.
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<div className="flex gap-4 overflow-x-auto pb-2">
						{previewEvents.map((event) => (
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
				)}
			</section>
		</div>
	);
}
