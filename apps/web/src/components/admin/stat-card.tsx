import {
	Card,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@campus-cafe/ui/components/card";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

type StatCardProps = {
	description?: string;
	hint?: string;
	icon: LucideIcon;
	label: string;
	value: ReactNode;
};

export default function StatCard({
	description,
	hint,
	icon: Icon,
	label,
	value,
}: StatCardProps) {
	return (
		<Card size="sm">
			<CardHeader className="flex flex-row items-start justify-between gap-2 pb-2">
				<div className="flex flex-col gap-1">
					<CardDescription>{label}</CardDescription>
					<CardTitle className="font-semibold text-2xl tabular-nums">
						{value}
					</CardTitle>
					{description ? (
						<p className="text-muted-foreground text-xs">{description}</p>
					) : null}
					{hint ? (
						<p className="text-[11px] text-muted-foreground leading-snug">
							{hint}
						</p>
					) : null}
				</div>
				<div className="rounded-md border border-border bg-muted/40 p-2 text-muted-foreground">
					<Icon className="size-4" aria-hidden />
				</div>
			</CardHeader>
		</Card>
	);
}
