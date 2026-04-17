import { Button } from "@campus-cafe/ui/components/button";
import { Authenticated, Unauthenticated } from "convex/react";
import { Coffee, Home, User, CalendarDays } from "lucide-react";
import { NavLink } from "react-router";

import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";
import { cn } from "@campus-cafe/ui/lib/utils";

export default function Header() {
	const links = [
		{ to: "/", label: "Home", icon: Home },
		{ to: "/events", label: "Events", icon: CalendarDays },
		{ to: "/reserve", label: "Reserve", icon: Coffee },
	] as const;

	return (
		<>
			{/* Top Header (Desktop & Mobile) */}
			<header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-lg">
				<div className="mx-auto flex w-full max-w-6xl flex-row items-center justify-between gap-4 px-4 py-3">
					<div className="flex min-w-0 items-center gap-2 md:gap-4">
						<NavLink
							to="/"
							className="flex items-center gap-2 font-heading text-lg font-semibold tracking-tight"
							end
						>
							<div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
								<Coffee className="size-4" />
							</div>
							<span className="hidden sm:inline-block">Campus Cafe</span>
						</NavLink>
						<nav className="hidden min-w-0 items-center gap-6 pl-6 text-sm font-medium md:flex">
							{links.map(({ to, label }) => {
								return (
									<NavLink
										key={to}
										to={to}
										className={({ isActive }) =>
											cn(
												"transition-colors hover:text-foreground/80",
												isActive ? "text-foreground" : "text-foreground/60"
											)
										}
										end
									>
										{label}
									</NavLink>
								);
							})}
						</nav>
					</div>
					<div className="flex shrink-0 items-center gap-3">
						<ModeToggle />
						<div className="h-6 w-px bg-border hidden sm:block" />
						<Unauthenticated>
							<Button
								variant="default"
								className="rounded-full px-6"
								render={<NavLink to="/sign-in" />}
							>
								Sign In
							</Button>
						</Unauthenticated>
						<Authenticated>
							<UserMenu />
						</Authenticated>
					</div>
				</div>
			</header>

			{/* Mobile Bottom Navigation Bar */}
			<div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/80 pb-safe pt-2 backdrop-blur-lg md:hidden">
				<nav className="mx-auto flex h-14 max-w-md items-center justify-around px-6">
					{links.map(({ to, label, icon: Icon }) => (
						<NavLink
							key={to}
							to={to}
							end
							className={({ isActive }) =>
								cn(
									"flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-1 transition-colors",
									isActive
										? "text-primary"
										: "text-muted-foreground hover:text-foreground"
								)
							}
						>
							<Icon className="size-5" />
							<span className="text-[10px] font-medium">{label}</span>
						</NavLink>
					))}

					{/* Profile Link for Mobile */}
					<Unauthenticated>
						<NavLink
							to="/sign-in"
							className={({ isActive }) =>
								cn(
									"flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-1 transition-colors",
									isActive
										? "text-primary"
										: "text-muted-foreground hover:text-foreground"
								)
							}
						>
							<User className="size-5" />
							<span className="text-[10px] font-medium">Profile</span>
						</NavLink>
					</Unauthenticated>
					<Authenticated>
						<NavLink
							to="/profile"
							className={({ isActive }) =>
								cn(
									"flex flex-col items-center justify-center gap-1 rounded-xl px-4 py-1 transition-colors",
									isActive
										? "text-primary"
										: "text-muted-foreground hover:text-foreground"
								)
							}
						>
							<User className="size-5" />
							<span className="text-[10px] font-medium">Profile</span>
						</NavLink>
					</Authenticated>
				</nav>
			</div>
		</>
	);
}
