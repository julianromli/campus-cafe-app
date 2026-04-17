import type { Doc } from "@campus-cafe/backend/convex/_generated/dataModel";

import OrderStatus from "@/components/orders/order-status";

type OrderWithTable = Doc<"orders"> & {
	table: Doc<"tables">;
};

type OrderStatusInlineProps = {
	orders: OrderWithTable[];
};

function formatIdr(value: number) {
	return new Intl.NumberFormat("id-ID", {
		currency: "IDR",
		maximumFractionDigits: 0,
		minimumFractionDigits: 0,
		style: "currency",
	}).format(value);
}

export default function OrderStatusInline({ orders }: OrderStatusInlineProps) {
	if (orders.length === 0) {
		return null;
	}

	return (
		<div className="flex flex-col gap-3 rounded-xl border border-primary/30 bg-primary/5 p-3">
			<p className="font-semibold text-primary text-xs uppercase tracking-wide">
				Pesanan aktif
			</p>
			{orders.map((order) => (
				<div
					className="flex flex-col gap-2 border-border/60 border-b pb-3 last:border-0 last:pb-0"
					key={order._id}
				>
					<div className="flex items-center justify-between gap-2">
						<span className="font-mono text-muted-foreground text-xs">
							#{order._id.slice(-6).toUpperCase()}
						</span>
						<span className="text-muted-foreground text-xs">
							{order.table.label}
						</span>
					</div>
					<OrderStatus status={order.status} />
					<p className="text-muted-foreground text-xs">
						{formatIdr(order.total)}
					</p>
				</div>
			))}
		</div>
	);
}
