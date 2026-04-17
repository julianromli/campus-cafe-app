import { api } from "@campus-cafe/backend/convex/_generated/api";
import { Button } from "@campus-cafe/ui/components/button";
import { useQuery } from "convex/react";
import { useMemo } from "react";
import { Link } from "react-router";

import EventCard from "@/components/events/event-card";

export default function HomePage() {
	const healthCheck = useQuery(api.healthCheck.get);
	const referenceTimestamp = useMemo(() => Date.now(), []);
	const events = useQuery(api.events.listPublishedActive, {
		referenceTimestamp,
	});

	const previewEvents = useMemo(() => (events ?? []).slice(0, 6), [events]);

	return (
		<div className="grid gap-10">
			<section className="grid gap-4 rounded-lg border border-border bg-card p-6 md:grid-cols-[1.4fr_1fr] md:items-end">
				<div className="space-y-3">
					<p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
						Campus Cafe Platform
					</p>
					<h1 className="max-w-2xl font-semibold text-4xl tracking-tight">
						Reservasi meja, lihat event mendatang, dan operasional cafe dalam
						satu tempat.
					</h1>
					<p className="max-w-xl text-muted-foreground text-sm leading-6">
						Event ditampilkan untuk informasi; pendaftaran dan tiket dilakukan
						di halaman resmi penyelenggara.
					</p>
					<div className="flex flex-wrap gap-3">
						<Button render={<Link to="/reserve" />}>Reservasi meja</Button>
						<Button variant="outline" render={<Link to="/events" />}>
							Lihat semua event
						</Button>
					</div>
				</div>
				<div className="rounded-lg border border-border bg-background p-4">
					<p className="font-medium text-sm">Backend status</p>
					<div className="mt-3 flex items-center gap-2 text-muted-foreground text-sm">
						<span
							className={`h-2.5 w-2.5 rounded-full ${
								healthCheck === "OK"
									? "bg-green-500"
									: healthCheck === undefined
										? "bg-amber-500"
										: "bg-red-500"
							}`}
						/>
						<span>
							{healthCheck === undefined
								? "Checking Convex..."
								: healthCheck === "OK"
									? "Connected"
									: "Unavailable"}
						</span>
					</div>
				</div>
			</section>

			<section className="space-y-4">
				<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h2 className="font-semibold text-xl tracking-tight">
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
					<div className="flex gap-4 overflow-x-auto pb-2">
						{[1, 2, 3].map((i) => (
							<div
								key={i}
								className="h-[300px] min-w-[240px] animate-pulse rounded-xl border border-border bg-muted/40"
							/>
						))}
					</div>
				) : previewEvents.length === 0 ? (
					<p className="text-muted-foreground text-sm">
						Belum ada event yang dipublikasikan.
					</p>
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
