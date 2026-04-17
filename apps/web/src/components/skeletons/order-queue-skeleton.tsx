import { Skeleton } from "@campus-cafe/ui/components/skeleton";

function ColumnSkeleton({ accent }: { accent: string }) {
	return (
		<section className={`flex flex-col gap-3 rounded-lg border p-3 ${accent}`}>
			<Skeleton className="h-5 w-28" />
			<div className="flex flex-col gap-3">
				{Array.from({ length: 3 }).map((_, i) => (
					<div
						className="flex flex-col gap-2 rounded-md border bg-background/80 p-3"
						key={i}
					>
						<Skeleton className="h-4 w-24" />
						<Skeleton className="h-3 w-full" />
						<Skeleton className="h-3 w-2/3" />
						<Skeleton className="h-8 w-full" />
					</div>
				))}
			</div>
		</section>
	);
}

export function OrderQueueSkeleton() {
	return (
		<div className="grid gap-4 lg:grid-cols-3">
			<ColumnSkeleton accent="border-chart-1/30 bg-chart-1/10" />
			<ColumnSkeleton accent="border-chart-2/30 bg-chart-2/10" />
			<ColumnSkeleton accent="border-chart-3/30 bg-chart-3/10" />
		</div>
	);
}
