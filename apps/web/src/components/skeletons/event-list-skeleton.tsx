import { Skeleton } from "@campus-cafe/ui/components/skeleton";

function EventCardSkeleton() {
	return (
		<div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm">
			<Skeleton className="aspect-video w-full rounded-none" />
			<div className="flex flex-col gap-2 p-4">
				<Skeleton className="h-3 w-20" />
				<Skeleton className="h-5 w-[85%] max-w-[280px]" />
				<Skeleton className="h-3 w-36" />
			</div>
		</div>
	);
}

export function EventListSkeleton({ count = 6 }: { count?: number }) {
	return (
		<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{Array.from({ length: count }).map((_, i) => (
				<EventCardSkeleton key={i} />
			))}
		</div>
	);
}
