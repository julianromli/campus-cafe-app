import { api } from "@campus-cafe/backend/convex/_generated/api";
import { useQuery } from "convex/react";

import OrderCard from "@/components/orders/order-card";
import { OrderQueueSkeleton } from "@/components/skeletons/order-queue-skeleton";

export default function OrderQueueBoard() {
	const active = useQuery(api.orders.listActive);

	if (active === undefined) {
		return <OrderQueueSkeleton />;
	}

	const pending = active.filter((order) => order.status === "pending");
	const preparing = active.filter((order) => order.status === "preparing");
	const ready = active.filter((order) => order.status === "ready");

	return (
		<div className="flex flex-col gap-6 lg:grid lg:grid-cols-3 lg:gap-4">
			<section className="flex flex-col gap-3 rounded-lg border border-chart-1/40 bg-chart-1/10 p-3 lg:sticky lg:top-2 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
				<header className="sticky top-0 z-10 bg-chart-1/10 py-1 font-semibold text-chart-1 text-sm backdrop-blur-sm">
					Diterima ({pending.length})
				</header>
				<div className="flex flex-col gap-3">
					{pending.length === 0 ? (
						<p className="text-muted-foreground text-xs">Kosong</p>
					) : (
						pending.map((order) => <OrderCard key={order._id} order={order} />)
					)}
				</div>
			</section>
			<section className="flex flex-col gap-3 rounded-lg border border-chart-2/40 bg-chart-2/10 p-3 lg:sticky lg:top-2 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
				<header className="sticky top-0 z-10 bg-chart-2/10 py-1 font-semibold text-chart-2 text-sm backdrop-blur-sm">
					Diproses ({preparing.length})
				</header>
				<div className="flex flex-col gap-3">
					{preparing.length === 0 ? (
						<p className="text-muted-foreground text-xs">Kosong</p>
					) : (
						preparing.map((order) => (
							<OrderCard key={order._id} order={order} />
						))
					)}
				</div>
			</section>
			<section className="flex flex-col gap-3 rounded-lg border border-chart-3/40 bg-chart-3/10 p-3 lg:sticky lg:top-2 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
				<header className="sticky top-0 z-10 bg-chart-3/10 py-1 font-semibold text-chart-3 text-sm backdrop-blur-sm">
					Siap ({ready.length})
				</header>
				<div className="flex flex-col gap-3">
					{ready.length === 0 ? (
						<p className="text-muted-foreground text-xs">Kosong</p>
					) : (
						ready.map((order) => <OrderCard key={order._id} order={order} />)
					)}
				</div>
			</section>
		</div>
	);
}
