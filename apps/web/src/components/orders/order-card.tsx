import { api } from "@campus-cafe/backend/convex/_generated/api";
import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";
import { Button } from "@campus-cafe/ui/components/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "@campus-cafe/ui/components/card";
import { useMutation } from "convex/react";
import { useMemo } from "react";
import { toast } from "sonner";

type OrderRow = {
	_creationTime: number;
	_id: Id<"orders">;
	createdAt: number;
	items: {
		menuItemId: Id<"menuItems">;
		name: string;
		price: number;
		qty: number;
	}[];
	status: "pending" | "preparing" | "ready" | "completed";
	table: { label: string };
	total: number;
};

type OrderCardProps = {
	order: OrderRow;
};

function formatAgo(ms: number) {
	const seconds = Math.floor((Date.now() - ms) / 1000);
	if (seconds < 60) {
		return `${seconds} dtk`;
	}

	const minutes = Math.floor(seconds / 60);
	if (minutes < 60) {
		return `${minutes} mnt`;
	}

	const hours = Math.floor(minutes / 60);
	return `${hours} jam`;
}

function nextStatus(
	current: OrderRow["status"],
): "preparing" | "ready" | "completed" | null {
	if (current === "pending") {
		return "preparing";
	}

	if (current === "preparing") {
		return "ready";
	}

	if (current === "ready") {
		return "completed";
	}

	return null;
}

function actionLabel(current: OrderRow["status"]): string {
	if (current === "pending") {
		return "Proses →";
	}

	if (current === "preparing") {
		return "Siap →";
	}

	if (current === "ready") {
		return "Selesai";
	}

	return "—";
}

export default function OrderCard({ order }: OrderCardProps) {
	const updateStatus = useMutation(api.orders.updateStatus);

	const isNew = useMemo(
		() => Date.now() - order._creationTime < 60_000,
		[order._creationTime],
	);

	const next = nextStatus(order.status);

	return (
		<Card className="border-border/80 bg-card/80 shadow-sm">
			<CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
				<div className="flex items-center gap-2">
					<CardTitle className="font-mono text-sm">
						#{order._id.slice(-6).toUpperCase()}
					</CardTitle>
					{isNew ? (
						<span className="relative flex size-2">
							<span className="absolute inline-flex size-full animate-ping rounded-full bg-red-400 opacity-75" />
							<span className="relative inline-flex size-2 rounded-full bg-red-500" />
						</span>
					) : null}
				</div>
				<span className="text-[10px] text-muted-foreground">
					{formatAgo(order._creationTime)}
				</span>
			</CardHeader>
			<CardContent className="flex flex-col gap-2 pb-2">
				<p className="font-semibold text-base">{order.table.label}</p>
				<ul className="flex flex-col gap-0.5 text-muted-foreground text-xs">
					{order.items.map((line) => (
						<li key={`${order._id}-${line.menuItemId}-${line.name}`}>
							{line.name} ×{line.qty}
						</li>
					))}
				</ul>
			</CardContent>
			{next ? (
				<CardFooter className="pt-0">
					<Button
						className="w-full"
						size="sm"
						type="button"
						onClick={() => {
							void (async () => {
								try {
									await updateStatus({ orderId: order._id, status: next });
								} catch (error) {
									const message =
										error instanceof Error
											? error.message
											: "Gagal memperbarui";
									toast.error(message);
								}
							})();
						}}
					>
						{actionLabel(order.status)}
					</Button>
				</CardFooter>
			) : null}
		</Card>
	);
}
