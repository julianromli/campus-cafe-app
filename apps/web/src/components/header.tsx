import { Button } from "@campus-cafe/ui/components/button";
import { Authenticated, Unauthenticated } from "convex/react";
import { NavLink } from "react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
	const links = [
		{ to: "/", label: "Home" },
		{ to: "/events", label: "Events" },
		{ to: "/reserve", label: "Reserve" },
	] as const;

	return (
		<header className="border-border border-b bg-background/95 backdrop-blur">
			<div className="mx-auto flex w-full max-w-6xl flex-row items-center justify-between gap-4 px-4 py-3">
				<nav className="flex items-center gap-4 text-sm">
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
				<div className="flex items-center gap-2">
					<Unauthenticated>
						<Button variant="outline" render={<NavLink to="/sign-in" />}>
							Sign In
						</Button>
					</Unauthenticated>
					<Authenticated>
						<UserMenu />
					</Authenticated>
					<ModeToggle />
				</div>
			</div>
		</header>
	);
}
