import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";
import { Badge } from "@campus-cafe/ui/components/badge";
import { Button } from "@campus-cafe/ui/components/button";
import { MinusIcon, PlusIcon } from "lucide-react";

export type MenuItemCardModel = {
	_id: Id<"menuItems">;
	available: boolean;
	description?: string;
	imageUrl?: string;
	name: string;
	price: number;
};

type ItemCardProps = {
	cartQty: number;
	item: MenuItemCardModel;
	onAdd: () => void;
	onDecrement: () => void;
	onIncrement: () => void;
};

function formatIdr(value: number) {
	return new Intl.NumberFormat("id-ID", {
		currency: "IDR",
		maximumFractionDigits: 0,
		minimumFractionDigits: 0,
		style: "currency",
	}).format(value);
}

export default function ItemCard({
	cartQty,
	item,
	onAdd,
	onDecrement,
	onIncrement,
}: ItemCardProps) {
	const soldOut = !item.available;

	return (
		<div
			className={`flex gap-3 rounded-xl border border-border bg-card p-3 ${soldOut ? "opacity-60" : ""}`}
		>
			<div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted/40">
				{item.imageUrl ? (
					<img alt="" className="size-full object-cover" src={item.imageUrl} />
				) : (
					<div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
						—
					</div>
				)}
				{soldOut ? (
					<Badge
						className="absolute inset-x-1 bottom-1 justify-center text-[10px]"
						variant="destructive"
					>
						Habis
					</Badge>
				) : null}
			</div>
			<div className="flex min-w-0 flex-1 flex-col gap-1">
				<p className="font-medium leading-snug">{item.name}</p>
				{item.description ? (
					<p className="line-clamp-2 text-muted-foreground text-xs">
						{item.description}
					</p>
				) : null}
				<div className="mt-auto flex items-center justify-between gap-2 pt-1">
					<span className="font-medium font-mono text-primary text-sm">
						{formatIdr(item.price)}
					</span>
					{soldOut ? (
						<Button disabled size="icon-sm" variant="outline">
							<PlusIcon />
						</Button>
					) : cartQty <= 0 ? (
						<Button size="icon-sm" type="button" onClick={onAdd}>
							<PlusIcon />
						</Button>
					) : (
						<div className="flex items-center gap-1 rounded-md border border-border bg-background/80 p-0.5">
							<Button
								aria-label="Kurangi"
								size="icon-xs"
								type="button"
								variant="ghost"
								onClick={onDecrement}
							>
								<MinusIcon className="size-3.5" />
							</Button>
							<span className="min-w-[1.25rem] text-center font-medium text-xs tabular-nums">
								{cartQty}
							</span>
							<Button
								aria-label="Tambah"
								size="icon-xs"
								type="button"
								variant="default"
								onClick={onIncrement}
							>
								<PlusIcon className="size-3.5" />
							</Button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
