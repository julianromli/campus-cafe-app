import { Button } from "@campus-cafe/ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetHeader,
	SheetTitle,
} from "@campus-cafe/ui/components/sheet";
import { Authenticated, Unauthenticated } from "convex/react";
import { MenuIcon } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
	const links = [
		{ to: "/", label: "Home" },
		{ to: "/events", label: "Events" },
		{ to: "/reserve", label: "Reserve" },
	] as const;

	const [mobileOpen, setMobileOpen] = useState(false);

	return (
		<header className="border-border border-b bg-background/95 backdrop-blur">
			<div className="mx-auto flex w-full max-w-6xl flex-row items-center justify-between gap-4 px-4 py-3">
				<div className="flex min-w-0 items-center gap-2 md:gap-4">
					<Button
						aria-label="Open menu"
						className="min-h-11 min-w-11 md:hidden"
						onClick={() => setMobileOpen(true)}
						size="icon"
						variant="outline"
					>
						<MenuIcon />
					</Button>
					<nav className="hidden min-w-0 items-center gap-4 text-sm md:flex">
						<NavLink
							to="/"
							className="font-semibold text-base tracking-tight"
							end
						>
							Campus Cafe
						</NavLink>
						{links.map(({ to, label }) => {
							return (
								<NavLink
									key={to}
									to={to}
									className={({ isActive }) =>
										isActive
											? "font-semibold text-foreground"
											: "text-muted-foreground"
									}
									end
								>
									{label}
								</NavLink>
							);
						})}
					</nav>
					<NavLink
						className="truncate font-semibold text-base tracking-tight md:hidden"
						end
						onClick={() => setMobileOpen(false)}
						to="/"
					>
						Campus Cafe
					</NavLink>
				</div>
				<div className="flex shrink-0 items-center gap-2">
					<Unauthenticated>
						<Button
							className="min-h-11"
							variant="outline"
							render={<NavLink to="/sign-in" />}
						>
							Sign In
						</Button>
					</Unauthenticated>
					<Authenticated>
						<UserMenu />
					</Authenticated>
					<ModeToggle />
				</div>
			</div>

			<Sheet onOpenChange={setMobileOpen} open={mobileOpen}>
				<SheetContent className="w-[min(100vw,320px)]" side="right">
					<SheetHeader>
						<SheetTitle>Menu</SheetTitle>
					</SheetHeader>
					<nav className="flex flex-col gap-1 p-2">
						{links.map(({ to, label }) => (
							<NavLink
								key={to}
								to={to}
								className={({ isActive }) =>
									`min-h-11 rounded-md px-3 py-2.5 text-sm ${
										isActive
											? "bg-primary/10 font-medium text-foreground"
											: "text-muted-foreground"
									}`
								}
								end
								onClick={() => setMobileOpen(false)}
							>
								{label}
							</NavLink>
						))}
					</nav>
				</SheetContent>
			</Sheet>
		</header>
	);
}
