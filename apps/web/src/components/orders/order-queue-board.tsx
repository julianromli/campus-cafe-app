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
			<section className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 lg:sticky lg:top-2 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
				<header className="sticky top-0 z-10 bg-amber-500/5 py-1 font-semibold text-amber-600 text-sm backdrop-blur-sm dark:text-amber-400">
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
			<section className="flex flex-col gap-3 rounded-lg border border-sky-500/40 bg-sky-500/5 p-3 lg:sticky lg:top-2 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
				<header className="sticky top-0 z-10 bg-sky-500/5 py-1 font-semibold text-sky-600 text-sm backdrop-blur-sm dark:text-sky-400">
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
			<section className="flex flex-col gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 lg:sticky lg:top-2 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto">
				<header className="sticky top-0 z-10 bg-emerald-500/5 py-1 font-semibold text-emerald-600 text-sm backdrop-blur-sm dark:text-emerald-400">
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
