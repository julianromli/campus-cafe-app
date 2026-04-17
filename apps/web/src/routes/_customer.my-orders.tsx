import { api } from "@campus-cafe/backend/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@campus-cafe/ui/components/card";
import { useQuery } from "convex/react";
import { useEffect, useRef } from "react";
import { toast } from "sonner";

import OrderStatus from "@/components/orders/order-status";

function formatIdr(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export default function MyOrdersPage() {
  const orders = useQuery(api.orders.listByUser);
  const prevStatus = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    if (!orders) {
      return;
    }

    for (const order of orders) {
      const was = prevStatus.current.get(order._id);
      if (order.status === "ready" && was === "preparing") {
        toast.success("Pesananmu siap diambil!");
        if (typeof navigator !== "undefined" && "vibrate" in navigator) {
          navigator.vibrate(200);
        }
      }

      prevStatus.current.set(order._id, order.status);
    }
  }, [orders]);

  if (orders === undefined) {
    return <p className="text-sm text-muted-foreground">Memuat pesanan…</p>;
  }

  const active = orders.filter((order) => order.status !== "completed");
  const past = orders.filter((order) => order.status === "completed");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Pesananku</h1>
        <p className="text-sm text-muted-foreground">Status pesanan di meja kamu, diperbarui langsung.</p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Aktif</h2>
        {active.length === 0 ? (
          <p className="text-sm text-muted-foreground">Tidak ada pesanan aktif.</p>
        ) : (
          active.map((order) => (
            <Card key={order._id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="font-mono text-sm">#{order._id.slice(-6).toUpperCase()}</CardTitle>
                  <CardDescription>{order.table.label}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <OrderStatus status={order.status} />
                <ul className="text-xs text-muted-foreground">
                  {order.items.map((line) => (
                    <li key={`${order._id}-${line.menuItemId}-${line.name}`}>
                      {line.name} ×{line.qty}
                    </li>
                  ))}
                </ul>
                <p className="font-mono text-sm font-medium">{formatIdr(order.total)}</p>
              </CardContent>
            </Card>
          ))
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Riwayat</h2>
        {past.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada pesanan selesai.</p>
        ) : (
          past.map((order) => (
            <Card className="opacity-90" key={order._id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="font-mono text-sm">#{order._id.slice(-6).toUpperCase()}</CardTitle>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">Selesai</span>
                </div>
                <CardDescription>{order.table.label}</CardDescription>
              </CardHeader>
              <CardContent className="text-sm">
                <p className="font-mono text-muted-foreground">{formatIdr(order.total)}</p>
              </CardContent>
            </Card>
          ))
        )}
      </section>
    </div>
  );
}
