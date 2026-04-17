import { api } from "@campus-cafe/backend/convex/_generated/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@campus-cafe/ui/components/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@campus-cafe/ui/components/tabs";
import { useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import OrderQueueBoard from "@/components/orders/order-queue-board";

function formatIdr(value: number) {
  return new Intl.NumberFormat("id-ID", {
    currency: "IDR",
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    style: "currency",
  }).format(value);
}

export default function StaffOrdersPage() {
  const [referenceTimestamp] = useState(() => Date.now());
  const history = useQuery(api.orders.listCompletedToday, { referenceTimestamp });
  const active = useQuery(api.orders.listActive);

  const [chimeOn, setChimeOn] = useState(
    () => typeof window !== "undefined" && localStorage.getItem("campus-cafe-order-chime") === "1",
  );

  const prevActiveLen = useRef<number | null>(null);

  useEffect(() => {
    if (active === undefined) {
      return;
    }

    if (prevActiveLen.current !== null && active.length > prevActiveLen.current) {
      toast.info("Pesanan baru masuk");
      if (chimeOn && typeof window !== "undefined") {
        try {
          const audio = new Audio(
            "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
          );
          void audio.play();
        } catch {
          /* ignore */
        }
      }
    }

    prevActiveLen.current = active.length;
  }, [active, chimeOn]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Antrian pesanan</h1>
          <p className="text-sm text-muted-foreground">Perbarui status saat makanan siap diambil.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input
            checked={chimeOn}
            className="rounded border-border"
            type="checkbox"
            onChange={(event) => {
              const next = event.target.checked;
              setChimeOn(next);
              localStorage.setItem("campus-cafe-order-chime", next ? "1" : "0");
            }}
          />
          Notifikasi suara (baru)
        </label>
      </div>

      <Tabs defaultValue="live">
        <TabsList variant="line">
          <TabsTrigger value="live">Antrian live</TabsTrigger>
          <TabsTrigger value="history">Riwayat hari ini</TabsTrigger>
        </TabsList>
        <TabsContent className="mt-4 text-sm" value="live">
          <OrderQueueBoard />
        </TabsContent>
        <TabsContent className="mt-4 text-sm" value="history">
          {history === undefined ? (
            <p className="text-sm text-muted-foreground">Memuat…</p>
          ) : history.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada pesanan selesai hari ini.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {history.map((order) => (
                <Card key={order._id}>
                  <CardHeader className="pb-2">
                    <CardTitle className="font-mono text-sm">#{order._id.slice(-6).toUpperCase()}</CardTitle>
                    <CardDescription>{order.table.label}</CardDescription>
                  </CardHeader>
                  <CardContent className="text-xs text-muted-foreground">
                    <p>{formatIdr(order.total)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
