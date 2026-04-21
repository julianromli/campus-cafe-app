import { api } from "@campus-cafe/backend/convex/_generated/api";
import { Button } from "@campus-cafe/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@campus-cafe/ui/components/empty";
import { useQuery } from "convex/react";
import { CalendarRange, ChevronLeft } from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";

import EventCard from "@/components/events/event-card";
import { EventListSkeleton } from "@/components/skeletons/event-list-skeleton";

export default function EventsListPage() {
	const referenceTimestamp = useMemo(() => Date.now(), []);
	const events = useQuery(api.events.listPublishedActive, {
		referenceTimestamp,
	});

	return (
		<div className="flex flex-col gap-6 pb-8 sm:gap-8">
			<div className="flex items-center justify-between">
				<div className="flex flex-col gap-1">
					<h1 className="font-heading font-semibold text-3xl tracking-tight">
						Campus Events
					</h1>
					<p className="text-muted-foreground text-sm">
						Discover what's happening around you
					</p>
				</div>
				<Button
					variant="ghost"
					size="icon"
					className="shrink-0 sm:hidden"
					render={<Link to="/" />}
				>
					<ChevronLeft className="size-5" />
				</Button>
				<Button
					variant="outline"
					className="hidden sm:flex"
					render={<Link to="/" />}
				>
					<ChevronLeft className="mr-2 size-4" />
					Back to Home
				</Button>
			</div>

			{events === undefined ? (
				<EventListSkeleton count={6} />
			) : events.length === 0 ? (
				<Empty className="mt-4 rounded-[2.5rem] border-none bg-muted/30 p-12">
					<EmptyHeader>
						<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-background shadow-sm">
							<CalendarRange className="size-8 text-muted-foreground" />
						</div>
						<EmptyTitle className="text-xl">No events scheduled</EmptyTitle>
						<EmptyDescription className="max-w-xs text-balance">
							Our calendar is currently clear. Check back soon for new
							workshops, talks, and community gatherings.
						</EmptyDescription>
					</EmptyHeader>
					<Button className="mt-6 rounded-xl" render={<Link to="/reserve" />}>
						Reserve a table instead
					</Button>
				</Empty>
			) : (
				<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
			)}
		</div>
	);
}
