import { Button } from "@campus-cafe/ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@campus-cafe/ui/components/sheet";
import { MenuIcon } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router";

import NotificationBell from "@/components/notifications/notification-bell";
import UserMenu from "@/components/user-menu";

const links = [
	{ label: "Dashboard", to: "/admin/dashboard" },
	{ label: "Tables", to: "/admin/tables" },
	{ label: "Events", to: "/admin/events" },
	{ label: "Menu", to: "/admin/menu" },
	{ label: "Staff", to: "/admin/staff" },
	{ label: "Payments", to: "/admin/payments" },
] as const;

function AdminNavLinks({ onNavigate }: { onNavigate?: () => void }) {
	return (
		<>
			{links.map((link) => (
				<NavLink
					key={link.to}
					to={link.to}
					className={({ isActive }) =>
						`flex min-h-11 items-center rounded-md border px-3 py-2.5 text-sm transition-colors ${
							isActive
								? "border-primary bg-primary/10 text-foreground"
								: "border-border text-muted-foreground hover:text-foreground"
						}`
					}
					onClick={onNavigate}
				>
					{link.label}
				</NavLink>
			))}
		</>
	);
}

export default function AdminLayout() {
	const [mobileNavOpen, setMobileNavOpen] = useState(false);

	return (
		<div className="min-h-svh bg-background text-foreground md:grid md:grid-cols-[260px_1fr]">
			<div className="flex items-center justify-between border-border border-b p-4 md:hidden">
				<div className="space-y-0.5">
					<p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
						Campus Cafe
					</p>
					<h1 className="font-semibold text-lg">Admin Panel</h1>
				</div>
				<Button
					aria-label="Open navigation"
					className="min-h-11 min-w-11"
					onClick={() => setMobileNavOpen(true)}
					size="icon"
					variant="outline"
				>
					<MenuIcon className="size-5" />
				</Button>
			</div>

			<Sheet onOpenChange={setMobileNavOpen} open={mobileNavOpen}>
				<SheetContent className="w-[min(100vw,300px)]" side="left">
					<SheetHeader>
						<SheetTitle>Admin</SheetTitle>
					</SheetHeader>
					<nav className="mt-4 flex flex-col gap-2">
						<AdminNavLinks onNavigate={() => setMobileNavOpen(false)} />
					</nav>
					<div className="mt-6 border-t pt-4">
						<UserMenu />
					</div>
				</SheetContent>
			</Sheet>

			<aside className="hidden border-border border-b md:flex md:min-h-svh md:flex-col md:border-r md:border-b-0">
				<div className="flex w-full flex-col gap-6 p-4">
					<div className="space-y-1">
						<p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
							Campus Cafe
						</p>
						<h1 className="font-semibold text-xl">Admin Panel</h1>
					</div>
					<nav className="flex flex-col gap-2">
						<AdminNavLinks />
					</nav>
					<div className="mt-auto pt-2">
						<UserMenu />
					</div>
				</div>
			</aside>
			<main className="flex flex-col gap-6 p-4 md:p-6">
				<div className="flex items-center justify-end gap-2">
					<NotificationBell />
				</div>
				<Outlet />
			</main>
		</div>
	);
}
