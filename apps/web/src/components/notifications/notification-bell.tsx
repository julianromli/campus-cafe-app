import { api } from "@campus-cafe/backend/convex/_generated/api";
import { Button } from "@campus-cafe/ui/components/button";
import {
	Popover,
	PopoverContent,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "@campus-cafe/ui/components/popover";
import { cn } from "@campus-cafe/ui/lib/utils";
import { useMutation, useQuery } from "convex/react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router";

export default function NotificationBell() {
	const navigate = useNavigate();
	const notifications = useQuery(api.notifications.listMine);
	const unreadCount = useQuery(api.notifications.countUnread);
	const markRead = useMutation(api.notifications.markRead);
	const markAllRead = useMutation(api.notifications.markAllRead);

	const display = notifications === undefined ? [] : notifications.slice(0, 10);
	const badge = unreadCount ?? 0;

	return (
		<Popover>
			<PopoverTrigger
				nativeButton={false}
				render={
					<Button
						type="button"
						variant="ghost"
						size="icon"
						className="relative shrink-0"
						aria-label="Notifikasi"
					>
						<Bell className="size-5" />
						{badge > 0 ? (
							<span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 font-semibold text-[10px] text-destructive-foreground">
								{badge > 99 ? "99+" : badge}
							</span>
						) : null}
					</Button>
				}
			/>
			<PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-0">
				<PopoverHeader className="border-border border-b px-3 py-2">
					<div className="flex items-center justify-between gap-2">
						<PopoverTitle className="text-sm">Notifikasi</PopoverTitle>
						{badge > 0 ? (
							<button
								type="button"
								className="font-medium text-primary text-xs underline-offset-2 hover:underline"
								onClick={() => {
									void markAllRead({});
								}}
							>
								Tandai semua dibaca
							</button>
						) : null}
					</div>
				</PopoverHeader>
				<div className="max-h-80 overflow-y-auto">
					{display.length === 0 ? (
						<p className="px-3 py-6 text-center text-muted-foreground text-xs">
							Belum ada notifikasi
						</p>
					) : (
						<ul className="flex flex-col">
							{display.map((n) => (
								<li key={n._id}>
									<button
										type="button"
										className={cn(
											"w-full border-border border-b px-3 py-2.5 text-left text-xs transition-colors hover:bg-muted/60",
											n.type === "cancellation_refund" &&
												"border-l-4 border-l-amber-500 pl-2",
											!n.read && "bg-muted/30",
										)}
										onClick={() => {
											void markRead({ notificationId: n._id });
											if (n.metadata?.reservationId) {
												navigate("/staff/reservations");
											}
										}}
									>
										<p className="font-semibold text-foreground">{n.title}</p>
										<p className="mt-0.5 line-clamp-3 text-muted-foreground">
											{n.message}
										</p>
									</button>
								</li>
							))}
						</ul>
					)}
				</div>
			</PopoverContent>
		</Popover>
	);
}
