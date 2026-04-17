import { api } from "@campus-cafe/backend/convex/_generated/api";
import { useQuery } from "convex/react";

import OrderCard from "@/components/orders/order-card";

export default function OrderQueueBoard() {
  const active = useQuery(api.orders.listActive);

  if (active === undefined) {
    return <p className="text-sm text-muted-foreground">Memuat antrian…</p>;
  }

  const pending = active.filter((order) => order.status === "pending");
  const preparing = active.filter((order) => order.status === "preparing");
  const ready = active.filter((order) => order.status === "ready");

  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <section className="flex flex-col gap-3 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
        <header className="text-sm font-semibold text-amber-600 dark:text-amber-400">
          Diterima ({pending.length})
        </header>
        <div className="flex flex-col gap-3">
          {pending.length === 0 ? (
            <p className="text-xs text-muted-foreground">Kosong</p>
          ) : (
            pending.map((order) => <OrderCard key={order._id} order={order} />)
          )}
        </div>
      </section>
      <section className="flex flex-col gap-3 rounded-lg border border-sky-500/40 bg-sky-500/5 p-3">
        <header className="text-sm font-semibold text-sky-600 dark:text-sky-400">
          Diproses ({preparing.length})
        </header>
        <div className="flex flex-col gap-3">
          {preparing.length === 0 ? (
            <p className="text-xs text-muted-foreground">Kosong</p>
          ) : (
            preparing.map((order) => <OrderCard key={order._id} order={order} />)
          )}
        </div>
      </section>
      <section className="flex flex-col gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3">
        <header className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
          Siap ({ready.length})
        </header>
        <div className="flex flex-col gap-3">
          {ready.length === 0 ? (
            <p className="text-xs text-muted-foreground">Kosong</p>
          ) : (
            ready.map((order) => <OrderCard key={order._id} order={order} />)
          )}
        </div>
      </section>
    </div>
  );
}
