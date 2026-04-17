import { api } from "@campus-cafe/backend/convex/_generated/api";
import { Badge } from "@campus-cafe/ui/components/badge";
import { Button } from "@campus-cafe/ui/components/button";
import {
	Empty,
	EmptyDescription,
	EmptyHeader,
	EmptyTitle,
} from "@campus-cafe/ui/components/empty";
import { useQuery } from "convex/react";
import {
	Activity,
	ArrowRight,
	CalendarRange,
	ChevronRight,
	Coffee,
} from "lucide-react";
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

	const menuSections = useQuery(api.menu.listPublicMenu);
	const previewMenuItems = useMemo(() => {
		if (!menuSections) return undefined;
		return menuSections
			.flatMap((section) => section.items)
			.filter((item) => item.available)
			.slice(0, 6);
	}, [menuSections]);

	return (
		<div className="flex flex-col gap-10 pb-16 sm:gap-16">
			{/* Modern App-Style Hero */}
			<section className="relative -mx-4 flex min-h-[500px] flex-col justify-end overflow-hidden px-4 pb-8 pt-24 sm:mx-0 sm:min-h-[600px] sm:rounded-[2.5rem] sm:p-12">
				{/* High-quality background image via Unsplash */}
				<div className="absolute inset-0">
					<img
						src="https://images.unsplash.com/photo-1559925393-8be0ec4767c8?q=80&w=2071&auto=format&fit=crop"
						alt="Campus Cafe Atmosphere"
						className="h-full w-full object-cover object-center"
					/>
					<div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />
					<div className="absolute inset-0 bg-black/10 dark:bg-black/40" />
				</div>

				<div className="relative z-10 flex flex-col gap-6">
					<Badge
						variant="secondary"
						className="w-fit gap-1.5 bg-background/80 px-3 py-1 font-medium backdrop-blur-md dark:bg-background/50"
					>
						{healthCheck === undefined ? (
							<>
								<Activity className="size-3.5 animate-pulse text-muted-foreground" />
								<span>Connecting</span>
							</>
						) : healthCheck === "OK" ? (
							<>
								<span className="relative flex size-2">
									<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
									<span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
								</span>
								<span>Live System</span>
							</>
						) : (
							<>
								<div className="size-2 rounded-full bg-destructive" />
								<span>Offline</span>
							</>
						)}
					</Badge>

					<div className="flex flex-col gap-3">
						<h1 className="font-heading text-4xl font-bold tracking-tight text-foreground sm:text-6xl md:text-7xl">
							Meet, Study &<br />
							<span className="text-primary">Connect</span>
						</h1>
						<p className="max-w-[28rem] text-pretty text-muted-foreground sm:text-lg sm:leading-8">
							Experience the heart of campus life. Your favorite coffee,
							inspiring events, and the perfect spot to focus.
						</p>
					</div>

					<div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
						<Button
							size="lg"
							className="h-14 rounded-2xl font-medium sm:min-w-[180px]"
							render={<Link to="/reserve" />}
						>
							Reserve Table
							<ArrowRight className="ml-2 size-4" />
						</Button>
						<Button
							size="lg"
							variant="secondary"
							className="h-14 rounded-2xl bg-background/80 font-medium backdrop-blur-md hover:bg-background/90 dark:bg-background/30 dark:hover:bg-background/40 sm:min-w-[180px]"
							render={<Link to="/events" />}
						>
							Explore Events
						</Button>
					</div>
				</div>
			</section>

			{/* Trending Events — second section after hero */}
			<section className="flex flex-col gap-6 sm:gap-8">
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-1">
						<h2 className="font-heading text-3xl font-semibold tracking-tight">
							Trending Events
						</h2>
						<p className="text-muted-foreground">
							What's happening around campus
						</p>
					</div>
					<Button
						variant="ghost"
						className="hidden group sm:flex"
						render={<Link to="/events" />}
					>
						View all
						<ChevronRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
					</Button>
				</div>

				{events === undefined ? (
					<EventListSkeleton count={6} />
				) : previewEvents.length === 0 ? (
					<Empty className="rounded-[2.5rem] border-none bg-muted/30 p-12">
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
					</Empty>
				) : (
					<div className="relative -mx-4 sm:mx-0">
						{/* Fading edges for carousel effect */}
						<div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 w-8 bg-gradient-to-r from-background to-transparent sm:hidden" />
						<div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 w-8 bg-gradient-to-l from-background to-transparent sm:hidden" />

						<div className="flex gap-4 overflow-x-auto px-4 pb-8 pt-4 snap-x snap-mandatory sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3 [&::-webkit-scrollbar]:hidden">
							{previewEvents.map((event) => (
								<div
									key={event._id}
									className="min-w-[85vw] shrink-0 snap-center sm:min-w-0"
								>
									<EventCard
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
								</div>
							))}
						</div>
					</div>
				)}

				<Button
					variant="secondary"
					size="lg"
					className="mx-auto w-full rounded-2xl sm:hidden"
					render={<Link to="/events" />}
				>
					View all events
				</Button>
			</section>

			{/* Favorite Menu List */}
			<section className="flex flex-col gap-6 sm:gap-8">
				<div className="flex items-center justify-between">
					<div className="flex flex-col gap-1">
						<h2 className="font-heading text-3xl font-semibold tracking-tight">
							Favorite Menu
						</h2>
						<p className="text-muted-foreground">
							Top picks to fuel your study session
						</p>
					</div>
					<Button
						variant="ghost"
						className="hidden group sm:flex"
						render={<Link to="/reserve" />}
					>
						Order now
						<ChevronRight className="ml-1 size-4 transition-transform group-hover:translate-x-1" />
					</Button>
				</div>

				{previewMenuItems === undefined ? (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{Array.from({ length: 6 }).map((_, i) => (
							<div key={i} className="h-28 rounded-3xl bg-muted/50 animate-pulse" />
						))}
					</div>
				) : previewMenuItems.length === 0 ? (
					<Empty className="rounded-[2.5rem] border-none bg-muted/30 p-12">
						<EmptyHeader>
							<div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-background shadow-sm">
								<Coffee className="size-8 text-muted-foreground" />
							</div>
							<EmptyTitle className="text-xl">Menu coming soon</EmptyTitle>
							<EmptyDescription className="max-w-xs text-balance">
								We are currently updating our offerings. Check back later!
							</EmptyDescription>
						</EmptyHeader>
					</Empty>
				) : (
					<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{previewMenuItems.map((item) => (
							<div
								key={item._id}
								className="group flex items-center gap-4 rounded-3xl border-none bg-muted/30 p-3 pr-5 transition-colors hover:bg-muted/50"
							>
								<div className="relative size-20 shrink-0 overflow-hidden rounded-2xl bg-background shadow-sm">
									{item.imageUrl ? (
										<img
											src={item.imageUrl}
											alt={item.name}
											className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
										/>
									) : (
										<div className="flex size-full items-center justify-center bg-primary/5 text-primary">
											<Coffee className="size-8 opacity-50" />
										</div>
									)}
								</div>
								<div className="flex flex-1 flex-col justify-center">
									<h3 className="font-semibold tracking-tight">{item.name}</h3>
									{item.description && (
										<p className="line-clamp-1 text-sm text-muted-foreground">
											{item.description}
										</p>
									)}
									<span className="mt-1.5 font-mono text-sm font-semibold text-primary">
										{new Intl.NumberFormat("id-ID", {
											currency: "IDR",
											style: "currency",
											maximumFractionDigits: 0,
										}).format(item.price)}
									</span>
								</div>
							</div>
						))}
					</div>
				)}

				<Button
					variant="secondary"
					size="lg"
					className="mx-auto w-full rounded-2xl sm:hidden"
					render={<Link to="/reserve" />}
				>
					Order now
				</Button>
			</section>
		</div>
	);
}
