import { NavLink, Outlet } from "react-router";

import UserMenu from "@/components/user-menu";

const links = [
  { label: "Dashboard", to: "/admin/dashboard" },
  { label: "Tables", to: "/admin/tables" },
  { label: "Events", to: "/admin/events" },
  { label: "Menu", to: "/admin/menu" },
  { label: "Staff", to: "/admin/staff" },
  { label: "Payments", to: "/admin/payments" },
] as const;

export default function AdminLayout() {
  return (
    <div className="min-h-svh bg-background text-foreground md:grid md:grid-cols-[260px_1fr]">
      <aside className="flex border-b border-border md:min-h-svh md:flex-col md:border-r md:border-b-0">
        <div className="flex w-full flex-col gap-6 p-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Campus Cafe</p>
            <h1 className="text-xl font-semibold">Admin Panel</h1>
          </div>
          <nav className="flex flex-col gap-2">
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  `rounded-md border px-3 py-2 text-sm transition-colors ${
                    isActive ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto pt-2">
            <UserMenu />
          </div>
        </div>
      </aside>
      <main className="flex flex-col gap-6 p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
