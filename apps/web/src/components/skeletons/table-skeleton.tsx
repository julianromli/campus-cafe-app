import { Skeleton } from "@campus-cafe/ui/components/skeleton";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@campus-cafe/ui/components/table";

type TableSkeletonProps = {
	columns?: number;
	rows?: number;
};

export function TableSkeleton({ columns = 6, rows = 8 }: TableSkeletonProps) {
	return (
		<div className="rounded-md border">
			<Table>
				<TableHeader>
					<TableRow>
						{Array.from({ length: columns }).map((_, i) => (
							<TableHead key={i}>
								<Skeleton className="h-4 w-20" />
							</TableHead>
						))}
					</TableRow>
				</TableHeader>
				<TableBody>
					{Array.from({ length: rows }).map((_, r) => (
						<TableRow key={r}>
							{Array.from({ length: columns }).map((__, c) => (
								<TableCell key={c}>
									<Skeleton className="h-4 w-full max-w-[140px]" />
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}

export function PaymentCardSkeleton() {
	return (
		<div className="flex flex-col gap-2 rounded-lg border p-4 md:hidden">
			<Skeleton className="h-4 w-32" />
			<Skeleton className="h-4 w-full" />
			<Skeleton className="h-9 w-full" />
		</div>
	);
}
