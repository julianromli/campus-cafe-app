import { api } from "@campus-cafe/backend/convex/_generated/api";
import type { Id } from "@campus-cafe/backend/convex/_generated/dataModel";
import { Button } from "@campus-cafe/ui/components/button";
import {
	Sheet,
	SheetContent,
	SheetFooter,
	SheetHeader,
	SheetTitle,
} from "@campus-cafe/ui/components/sheet";
import { useMutation, useQuery } from "convex/react";
import { MinusIcon, PlusIcon, ShoppingCartIcon } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { useCart } from "@/components/menu/cart-context";

function formatIdr(value: number) {
	return new Intl.NumberFormat("id-ID", {
		currency: "IDR",
		maximumFractionDigits: 0,
		minimumFractionDigits: 0,
		style: "currency",
	}).format(value);
}

type CartDrawerProps = {
	onRequireAuth: () => void;
	user: { _id: Id<"users"> } | null | undefined;
};

export default function CartDrawer({ onRequireAuth, user }: CartDrawerProps) {
	const menu = useQuery(api.menu.listPublicMenu);
	const createOrder = useMutation(api.orders.create);
	const { cart, clear, decrement, increment, tableId } = useCart();
	const [open, setOpen] = useState(false);
	const [submitting, setSubmitting] = useState(false);

	const itemMeta = useMemo(() => {
		const map = new Map<string, { name: string; price: number }>();
		if (!menu) {
			return map;
		}

		for (const section of menu) {
			for (const item of section.items) {
				map.set(item._id, { name: item.name, price: item.price });
			}
		}

		return map;
	}, [menu]);

	const lines = useMemo(() => {
		return Object.entries(cart)
			.map(([id, qty]) => {
				const meta = itemMeta.get(id);
				if (!meta) {
					return null;
				}

				return {
					menuItemId: id as Id<"menuItems">,
					name: meta.name,
					price: meta.price,
					qty,
				};
			})
			.filter((line): line is NonNullable<typeof line> => line !== null);
	}, [cart, itemMeta]);

	const subtotal = useMemo(() => {
		return lines.reduce((sum, line) => sum + line.price * line.qty, 0);
	}, [lines]);

	const totalItems = useMemo(() => {
		return lines.reduce((sum, line) => sum + line.qty, 0);
	}, [lines]);

	const authLoading = user === undefined;
	const authenticated = user !== null && user !== undefined;

	return (
		<>
			{totalItems > 0 ? (
				<button
					className="fixed right-4 bottom-4 left-4 z-40 flex items-center justify-between gap-3 rounded-full border border-primary/40 bg-primary px-4 py-3 text-primary-foreground shadow-lg transition hover:bg-primary/90 md:right-6 md:left-auto md:max-w-md"
					type="button"
					onClick={() => setOpen(true)}
				>
					<span className="inline-flex items-center gap-2 font-medium text-sm">
						<ShoppingCartIcon className="size-4" />
						{totalItems} item · {formatIdr(subtotal)}
					</span>
					<span className="font-semibold text-xs">Lihat</span>
				</button>
			) : null}

			<Sheet open={open} onOpenChange={setOpen}>
				<SheetContent className="flex max-h-[90vh] flex-col" side="bottom">
					<SheetHeader>
						<SheetTitle>Pesanan kamu</SheetTitle>
					</SheetHeader>
					<div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4">
						{lines.map((line) => (
							<div
								className="flex items-start justify-between gap-3 border-border border-b pb-3"
								key={line.menuItemId}
							>
								<div className="min-w-0">
									<p className="font-medium">{line.name}</p>
									<p className="font-mono text-muted-foreground text-xs">
										{formatIdr(line.price)} / item
									</p>
								</div>
								<div className="flex items-center gap-2">
									<Button
										aria-label="Kurangi"
										size="icon-xs"
										type="button"
										variant="outline"
										onClick={() => decrement(line.menuItemId)}
									>
										<MinusIcon className="size-3.5" />
									</Button>
									<span className="w-6 text-center text-sm tabular-nums">
										{line.qty}
									</span>
									<Button
										aria-label="Tambah"
										size="icon-xs"
										type="button"
										variant="default"
										onClick={() => increment(line.menuItemId)}
									>
										<PlusIcon className="size-3.5" />
									</Button>
								</div>
							</div>
						))}
					</div>
					<SheetFooter className="flex-col gap-3 border-border border-t pt-4">
						<div className="flex w-full items-center justify-between text-sm">
							<span className="text-muted-foreground">Subtotal</span>
							<span className="font-mono font-semibold">
								{formatIdr(subtotal)}
							</span>
						</div>
						<Button
							className="w-full"
							disabled={authLoading || submitting || lines.length === 0}
							type="button"
							onClick={() => {
								void (async () => {
									if (authLoading) {
										return;
									}

									if (!authenticated) {
										onRequireAuth();
										return;
									}

									setSubmitting(true);
									try {
										await createOrder({
											items: lines.map((line) => ({
												menuItemId: line.menuItemId,
												qty: line.qty,
											})),
											referenceTimestamp: Date.now(),
											tableId,
										});
										toast.success("Pesanan diterima!");
										clear();
										setOpen(false);
									} catch (error) {
										const message =
											error instanceof Error ? error.message : "Gagal memesan";
										toast.error(message);
									} finally {
										setSubmitting(false);
									}
								})();
							}}
						>
							{authLoading
								? "Memuat…"
								: authenticated
									? "Pesan sekarang"
									: "Masuk untuk memesan"}
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</>
	);
}
