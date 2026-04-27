import { api } from "@campus-cafe/backend/convex/_generated/api";
import {
	Avatar,
	AvatarFallback,
	AvatarImage,
} from "@campus-cafe/ui/components/avatar";
import { Button } from "@campus-cafe/ui/components/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@campus-cafe/ui/components/dropdown-menu";
import { useQuery } from "convex/react";
import { useNavigate } from "react-router";
import { authClient } from "@/lib/auth-client";

export default function UserMenu() {
	const navigate = useNavigate();
	const user = useQuery(api.users.getMe);

	if (!user) {
		return null;
	}

	// Function to get initials from name (e.g., "John Doe" -> "JD")
	const getInitials = (name?: string) => {
		if (!name) return "U";
		return name
			.split(" ")
			.map((n) => n[0])
			.join("")
			.substring(0, 2)
			.toUpperCase();
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger
				render={<Button variant="ghost" size="icon" className="rounded-full" />}
			>
				<Avatar className="size-9">
					<AvatarImage
						src={user.avatarUrl || ""}
						alt={user.name || "User avatar"}
					/>
					<AvatarFallback className="bg-primary/10 font-medium text-primary">
						{getInitials(user.name)}
					</AvatarFallback>
				</Avatar>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="bg-card" align="end">
				<DropdownMenuGroup>
					<DropdownMenuLabel className="font-normal">
						<div className="flex flex-col space-y-1">
							<p className="font-medium text-sm leading-none">{user?.name}</p>
							<p className="text-muted-foreground text-xs leading-none">
								{user?.email}
							</p>
						</div>
					</DropdownMenuLabel>
					<DropdownMenuSeparator />
					{user.role === "customer" ? (
						<>
							<DropdownMenuItem onClick={() => navigate("/my-reservations")}>
								My Reservations
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => navigate("/my-orders")}>
								My Orders
							</DropdownMenuItem>
							<DropdownMenuItem onClick={() => navigate("/profile")}>
								Profile
							</DropdownMenuItem>
						</>
					) : null}
				{user.role === "staff" || user.role === "admin" ? (
					<DropdownMenuItem onClick={() => navigate("/panel/dashboard")}>
						Panel
					</DropdownMenuItem>
				) : null}
					<DropdownMenuSeparator />
					<DropdownMenuItem
						variant="destructive"
						onClick={() => {
							authClient.signOut({
								fetchOptions: {
									onSuccess: () => {
										navigate("/");
									},
								},
							});
						}}
					>
						Sign Out
					</DropdownMenuItem>
				</DropdownMenuGroup>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
