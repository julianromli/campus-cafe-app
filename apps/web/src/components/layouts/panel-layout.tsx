import { Button } from "@campus-cafe/ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@campus-cafe/ui/components/sheet";
import {
	BookOpen,
	CalendarCheck,
	CreditCard,
	Grid3X3,
	LayoutDashboard,
	MenuIcon,
	PartyPopper,
	Users,
	UtensilsCrossed,
} from "lucide-react";
import { type ComponentType, useState } from "react";
import { NavLink, Outlet } from "react-router";

import NotificationBell from "@/components/notifications/notification-bell";
import UserMenu from "@/components/user-menu";
import { usePanelRole } from "@/hooks/use-panel-role";
import { canRead, type Feature } from "@/lib/permissions";

const NAV_ITEMS: Array<{
	label: string;
	to: string;
	icon: ComponentType<{ className?: string }>;
	feature: Feature;
}> = [
	{
		label: "Dashboard",
		to: "/panel/dashboard",
		icon: LayoutDashboard,
		feature: "dashboard",
	},
	{
		label: "Reservations",
		to: "/panel/reservations",
		icon: CalendarCheck,
		feature: "reservations",
	},
	{
		label: "Orders",
		to: "/panel/orders",
		icon: UtensilsCrossed,
		feature: "orders",
	},
	{ label: "Tables", to: "/panel/tables", icon: Grid3X3, feature: "tables" },
	{ label: "Menu", to: "/panel/menu", icon: BookOpen, feature: "menu" },
	{
		label: "Events",
		to: "/panel/events",
		icon: PartyPopper,
		feature: "events",
	},
	{
		label: "Payments",
		to: "/panel/payments",
		icon: CreditCard,
		feature: "payments",
	},
	{ label: "Staff", to: "/panel/staff", icon: Users, feature: "staff" },
];

function PanelNavLinks({
	role,
	onNavigate,
}: {
	role: "admin" | "staff";
	onNavigate?: () => void;
}) {
	const visibleItems = NAV_ITEMS.filter((item) => canRead(role, item.feature));

	return (
		<>
			{visibleItems.map((item) => (
				<NavLink
					key={item.to}
					to={item.to}
					className={({ isActive }) =>
						`flex min-h-11 items-center gap-2 rounded-md border px-3 py-2.5 text-sm transition-colors ${
							isActive
								? "border-primary bg-primary/10 text-foreground"
								: "border-border text-muted-foreground hover:text-foreground"
						}`
					}
					onClick={onNavigate}
				>
					<item.icon className="size-4" />
					{item.label}
				</NavLink>
			))}
		</>
	);
}

export default function PanelLayout() {
	const [mobileNavOpen, setMobileNavOpen] = useState(false);
	const role = usePanelRole();

	if (!role) {
		return null;
	}

	return (
		<div className="min-h-svh bg-background text-foreground md:grid md:grid-cols-[260px_1fr]">
			<div className="flex items-center justify-between border-border border-b p-4 md:hidden">
				<div className="flex flex-col gap-0.5">
					<p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
						Campus Cafe
					</p>
					<h1 className="font-semibold text-lg">Panel</h1>
				</div>
				<Button
					aria-label="Open navigation"
					className="min-h-11 min-w-11"
					onClick={() => setMobileNavOpen(true)}
					size="icon"
					variant="outline"
				>
					<MenuIcon />
				</Button>
			</div>

			<Sheet onOpenChange={setMobileNavOpen} open={mobileNavOpen}>
				<SheetContent className="w-[min(100vw,300px)]" side="left">
					<SheetHeader>
						<SheetTitle>Panel</SheetTitle>
					</SheetHeader>
					<nav className="mt-4 flex flex-col gap-2">
						<PanelNavLinks
							role={role}
							onNavigate={() => setMobileNavOpen(false)}
						/>
					</nav>
					<div className="mt-6 border-t pt-4">
						<UserMenu />
					</div>
				</SheetContent>
			</Sheet>

			<aside className="hidden border-border border-b md:flex md:min-h-svh md:flex-col md:border-r md:border-b-0">
				<div className="flex w-full flex-col gap-6 p-4">
					<div className="flex flex-col gap-1">
						<p className="text-muted-foreground text-xs uppercase tracking-[0.2em]">
							Campus Cafe
						</p>
						<h1 className="font-semibold text-xl">Panel</h1>
					</div>
					<nav className="flex flex-col gap-2">
						<PanelNavLinks role={role} />
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
