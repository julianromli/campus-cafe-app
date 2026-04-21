import { api } from "@campus-cafe/backend/convex/_generated/api";
import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";
import { Badge } from "@campus-cafe/ui/components/badge";
import { Button } from "@campus-cafe/ui/components/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@campus-cafe/ui/components/card";
import { useQuery } from "convex/react";
import { ExternalLinkIcon } from "lucide-react";
import { Link, useParams } from "react-router";

import { EventDetailSkeleton } from "@/components/skeletons/event-detail-skeleton";

function formatRange(startTime: number, endTime: number): string {
	const start = new Date(startTime);
	const end = new Date(endTime);
	return `${start.toLocaleString("id-ID", {
		dateStyle: "full",
		timeStyle: "short",
	})} – ${end.toLocaleTimeString("id-ID", { timeStyle: "short" })}`;
}

function toReservationDateParam(timestamp: number): string {
	const parts = new Intl.DateTimeFormat("en-CA", {
		day: "2-digit",
		month: "2-digit",
		timeZone: "Asia/Jakarta",
		year: "numeric",
	}).formatToParts(new Date(timestamp));
	const year = parts.find((part) => part.type === "year")?.value;
	const month = parts.find((part) => part.type === "month")?.value;
	const day = parts.find((part) => part.type === "day")?.value;

	if (!year || !month || !day) {
		return "";
	}

	return `${year}-${month}-${day}`;
}

export default function EventDetailPage() {
	const { id } = useParams();
	const eventId = id as Id<"events"> | undefined;
	const event = useQuery(
		api.events.getById,
		eventId ? { id: eventId } : "skip",
	);

	if (!eventId) {
		return <p className="text-muted-foreground text-sm">Event tidak valid.</p>;
	}

	if (event === undefined) {
		return <EventDetailSkeleton />;
	}

	if (event === null) {
		return (
			<div className="flex flex-col gap-4">
				<p className="text-muted-foreground text-sm">
					Event tidak ditemukan atau belum dipublikasikan.
				</p>
				<Button variant="outline" render={<Link to="/events" />}>
					← Daftar event
				</Button>
			</div>
		);
	}

	const externalUrl = event.externalUrl;
	const reserveSearchParams = new URLSearchParams({
		date: toReservationDateParam(event.startTime),
		eventId: event._id,
	});
	const host =
		externalUrl &&
		(() => {
			try {
				return new URL(externalUrl).hostname;
			} catch {
				return externalUrl;
			}
		})();

	return (
		<div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-[1fr_320px]">
			<article className="flex flex-col gap-6">
				<div
					className="aspect-video overflow-hidden rounded-4xl border border-border bg-center bg-cover bg-muted"
					style={
						event.coverImage
							? { backgroundImage: `url(${event.coverImage})` }
							: undefined
					}
				>
					<div className="flex h-full flex-col justify-end bg-gradient-to-t from-background via-background/80 to-transparent p-6">
						<Badge className="mb-2 w-fit">{event.category}</Badge>
						<h1 className="font-heading font-semibold text-3xl tracking-tight">
							{event.title}
						</h1>
					</div>
				</div>

				<div className="prose prose-invert max-w-none text-sm">
					<p className="whitespace-pre-wrap">{event.description}</p>
				</div>

				<section className="flex flex-col gap-2 text-sm">
					<p>
						<span className="text-muted-foreground">Jadwal: </span>
						{formatRange(event.startTime, event.endTime)}
					</p>
					{event.organizerName ? (
						<p>
							<span className="text-muted-foreground">Penyelenggara: </span>
							{event.organizerName}
						</p>
					) : null}
					{event.locationText ? (
						<p>
							<span className="text-muted-foreground">Lokasi: </span>
							{event.locationText}
						</p>
					) : null}
				</section>
			</article>

			<aside className="lg:sticky lg:top-24 lg:self-start">
				<Card>
					<CardHeader>
						<CardTitle className="text-base">
							Lanjutkan di situs resmi
						</CardTitle>
						{host ? (
							<CardDescription className="truncate" title={externalUrl}>
								{host}
							</CardDescription>
						) : null}
					</CardHeader>
					<CardContent className="flex flex-col gap-3">
						{externalUrl && /^https:\/\//i.test(externalUrl) ? (
							<Button
								className="w-full"
								render={
									<a
										href={externalUrl}
										rel="noopener noreferrer"
										target="_blank"
									/>
								}
							>
								<ExternalLinkIcon data-icon="inline-start" aria-hidden />
								Buka halaman resmi event
							</Button>
						) : (
							<p className="text-muted-foreground text-sm">
								Link resmi belum tersedia untuk event ini.
							</p>
						)}
						<Button
							variant="outline"
							className="w-full"
							render={
								<Link to={`/reserve?${reserveSearchParams.toString()}`} />
							}
						>
							Reservasi meja
						</Button>
						<Button
							variant="ghost"
							className="w-full"
							render={<Link to="/events" />}
						>
							← Semua event
						</Button>
					</CardContent>
				</Card>
			</aside>
		</div>
	);
}
