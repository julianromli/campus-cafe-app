import { Badge } from "@campus-cafe/ui/components/badge";
import { Card } from "@campus-cafe/ui/components/card";
import { Link } from "react-router";

export type EventCardModel = {
	_id: string;
	category: string;
	coverImage?: string;
	endTime: number;
	startTime: number;
	title: string;
	isOngoing?: boolean;
};

function formatRange(startTime: number, endTime: number): string {
	const start = new Date(startTime);
	const end = new Date(endTime);
	const sameDay =
		start.getFullYear() === end.getFullYear() &&
		start.getMonth() === end.getMonth() &&
		start.getDate() === end.getDate();
	const opts: Intl.DateTimeFormatOptions = {
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
		month: "short",
		year: "numeric",
	};
	if (sameDay) {
		return `${start.toLocaleString("id-ID", opts)} – ${end.toLocaleTimeString(
			"id-ID",
			{
				hour: "2-digit",
				minute: "2-digit",
			},
		)}`;
	}
	return `${start.toLocaleString("id-ID", opts)} → ${end.toLocaleString("id-ID", opts)}`;
}

export default function EventCard({ event }: { event: EventCardModel }) {
	return (
		<Link
			to={`/events/${event._id}`}
			className="group block min-w-[240px] max-w-[280px] shrink-0"
		>
			<Card className="overflow-hidden transition-transform group-hover:-translate-y-0.5 group-hover:border-primary/40">
				<div
					className="aspect-video bg-center bg-cover bg-muted"
					style={
						event.coverImage
							? { backgroundImage: `url(${event.coverImage})` }
							: undefined
					}
				>
					<div className="flex h-full flex-col justify-between bg-gradient-to-t from-background/95 via-background/40 to-transparent p-3">
						<div className="flex flex-wrap gap-2">
							<span className="rounded-full bg-primary/90 px-2 py-0.5 font-medium text-[10px] text-primary-foreground">
								{event.category}
							</span>
							{event.isOngoing ? (
								<Badge variant="secondary" className="text-[10px]">
									Berlangsung
								</Badge>
							) : null}
						</div>
					</div>
				</div>
				<div className="flex flex-col gap-1 p-4">
					<p className="line-clamp-2 font-semibold leading-snug">
						{event.title}
					</p>
					<p className="text-muted-foreground text-xs">
						{formatRange(event.startTime, event.endTime)}
					</p>
					<p className="font-medium text-primary text-xs">Detail →</p>
				</div>
			</Card>
		</Link>
	);
}
