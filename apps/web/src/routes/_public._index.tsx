import { api } from "@campus-cafe/backend/convex/_generated/api";
import { Button } from "@campus-cafe/ui/components/button";
import { useQuery } from "convex/react";
import { Link } from "react-router";

export default function HomePage() {
  const healthCheck = useQuery(api.healthCheck.get);

  return (
    <div className="grid gap-6">
      <section className="grid gap-4 rounded-lg border border-border bg-card p-6 md:grid-cols-[1.4fr_1fr] md:items-end">
        <div className="space-y-3">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Campus Cafe Platform</p>
          <h1 className="max-w-2xl text-4xl font-semibold tracking-tight">
            Reservasi meja, event, dan operasional cafe dalam satu fondasi aplikasi.
          </h1>
          <p className="max-w-xl text-sm leading-6 text-muted-foreground">
            Sprint 1 menyiapkan auth, role-based shells, dan struktur route untuk customer, staff, dan admin.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button render={<Link to="/reserve" />}>Reserve a Table</Button>
            <Button variant="outline" render={<Link to="/events/demo-event" />}>
              View Event Detail
            </Button>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background p-4">
          <p className="text-sm font-medium">Backend status</p>
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                healthCheck === "OK" ? "bg-green-500" : healthCheck === undefined ? "bg-amber-500" : "bg-red-500"
              }`}
            />
            <span>
              {healthCheck === undefined ? "Checking Convex..." : healthCheck === "OK" ? "Connected" : "Unavailable"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
