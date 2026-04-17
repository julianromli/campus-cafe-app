import { Skeleton } from "@campus-cafe/ui/components/skeleton";

export function EventDetailSkeleton() {
	return (
		<div className="flex flex-col gap-8">
			<Skeleton className="aspect-[21/9] max-h-[320px] w-full rounded-xl" />
			<div className="flex flex-col gap-3">
				<Skeleton className="h-3 w-24" />
				<Skeleton className="h-9 w-3/4 max-w-xl" />
				<Skeleton className="h-4 w-48" />
			</div>
			<div className="flex flex-wrap gap-2">
				<Skeleton className="h-10 w-40" />
				<Skeleton className="h-10 w-36" />
			</div>
			<div className="flex flex-col gap-2">
				{Array.from({ length: 6 }).map((_, i) => (
					<Skeleton key={i} className="h-4 w-full max-w-2xl" />
				))}
			</div>
		</div>
	);
}
