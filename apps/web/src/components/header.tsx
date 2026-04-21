import { Button } from "@campus-cafe/ui/components/button";
import { cn } from "@campus-cafe/ui/lib/utils";
import { Authenticated, Unauthenticated } from "convex/react";
import { CalendarDays, Coffee, Home, User } from "lucide-react";
import { NavLink } from "react-router";
import { ModeToggle } from "./mode-toggle";
import UserMenu from "./user-menu";

export default function Header() {
	const links = [
		{ to: "/", label: "Home", icon: Home },
		{ to: "/events", label: "Events", icon: CalendarDays },
		{ to: "/reserve", label: "Reserve", icon: Coffee },
	] as const;

	return (
		<>
			{/* Top Header (Desktop & Mobile) */}
			<header className="sticky top-0 z-50 border-border border-b bg-background/80 backdrop-blur-lg">
				<div className="mx-auto flex w-full max-w-6xl flex-row items-center justify-between gap-4 px-4 py-3">
					<div className="flex min-w-0 items-center gap-2 md:gap-4">
						<NavLink
							to="/"
							className="flex items-center gap-2 font-heading font-semibold text-lg tracking-tight"
							end
						>
							<div className="flex size-8 items-center justify-center rounded-xl bg-primary text-primary-foreground">
								<Coffee className="size-4" />
							</div>
							<span className="hidden sm:inline-block">Campus Cafe</span>
						</NavLink>
						<nav className="hidden min-w-0 items-center gap-6 pl-6 font-medium text-sm md:flex">
							{links.map(({ to, label }) => {
								return (
									<NavLink
										key={to}
										to={to}
										className={({ isActive }) =>
											cn(
												"transition-colors hover:text-foreground/80",
												isActive ? "text-foreground" : "text-foreground/60",
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
						<div className="hidden h-6 w-px bg-border sm:block" />
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
			<div className="fixed right-0 bottom-0 left-0 z-50 border-border border-t bg-background/80 pt-2 pb-safe backdrop-blur-lg md:hidden">
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
										: "text-muted-foreground hover:text-foreground",
								)
							}
						>
							<Icon className="size-5" />
							<span className="font-medium text-[10px]">{label}</span>
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
										: "text-muted-foreground hover:text-foreground",
								)
							}
						>
							<User className="size-5" />
							<span className="font-medium text-[10px]">Profile</span>
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
										: "text-muted-foreground hover:text-foreground",
								)
							}
						>
							<User className="size-5" />
							<span className="font-medium text-[10px]">Profile</span>
						</NavLink>
					</Authenticated>
				</nav>
			</div>
		</>
	);
}
